import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { isBookingError } from "@/server/booking-engine";
import { createPayments, type PaymentEvent, type PaymentProvider } from "@/server/payments";
import { createReporting } from "@/server/reporting";
import { at, book, dropShop, engine, makeShop, makeUser, NOW, outboxTypes, sql, TOMORROW, type TestShop } from "./fixtures";

/**
 * Online payments (B2). Real Postgres; a fake payment provider stands in for Stripe.
 * Decisions: 10-minute hold, full refunds, rescheduling keeps the payment.
 */

const SITE = "https://app.test";
const min = (n: number) => new Date(NOW.getTime() + n * 60_000);

function fakeProvider() {
  const calls: { op: string; args: Record<string, unknown> }[] = [];
  let refundsFail = false;
  let ready = false;
  const provider: PaymentProvider = {
    async createAccountLink(args) {
      calls.push({ op: "accountLink", args });
      return { accountId: args.accountId ?? "acct_new", url: "https://pay.test/onboard" };
    },
    async accountReady(accountId) {
      calls.push({ op: "accountReady", args: { accountId } });
      return ready;
    },
    async createCheckout(args) {
      calls.push({ op: "checkout", args });
      return { checkoutRef: `cs_${args.bookingId}`, url: `https://pay.test/c/${args.bookingId}` };
    },
    async expireCheckout(args) {
      calls.push({ op: "expire", args });
    },
    async refund(args) {
      if (refundsFail) throw new Error("card network down");
      calls.push({ op: "refund", args });
    },
    parseWebhook(raw, signature) {
      if (signature !== "good") throw new Error("bad signature");
      return JSON.parse(raw) as PaymentEvent;
    },
  };
  return { provider, calls, setRefundsFail: (v: boolean) => (refundsFail = v), setReady: (v: boolean) => (ready = v) };
}

let shop: TestShop;
let fake: ReturnType<typeof fakeProvider>;
const payments = (now = NOW) => createPayments({ sql, engine, provider: fake.provider, config: { siteUrl: SITE }, clock: () => now });

async function payOnline(over: Parameters<typeof book>[1] = {}) {
  const { booking, manageToken } = await book(shop, { paymentMethod: "online", ...over });
  const { url } = await payments().startCheckout({ bookingId: booking.id, manageToken });
  return { booking, manageToken, url };
}

const paidEvent = (bookingId: string, id = `evt_${bookingId}`): Extract<PaymentEvent, { kind: "checkout_completed" }> => ({
  id,
  kind: "checkout_completed",
  bookingId,
  checkoutRef: `cs_${bookingId}`,
  paymentRef: `pi_${bookingId}`,
  amountCents: 3000,
});
const webhook = (event: PaymentEvent, now = NOW) => payments(now).handleWebhook(JSON.stringify(event), "good");

async function bookingRow(id: string) {
  const [b] = await sql<{ status: string; payment_status: string; payment_ref: string | null; hold_expires_at: Date | null }[]>`
    select status, payment_status, payment_ref, hold_expires_at from public.bookings where id = ${id}
  `;
  return b;
}

beforeEach(async () => {
  shop = await makeShop({ smsEnabled: true, onlinePayments: true });
  fake = fakeProvider();
});
afterEach(async () => {
  await dropShop(shop);
});
afterAll(async () => {
  await sql.end();
});

describe("paying online", () => {
  it("holds the time for 10 minutes, then confirms once the payment arrives", async () => {
    const { booking, url } = await payOnline();
    expect(url).toBe(`https://pay.test/c/${booking.id}`);
    expect(fake.calls.find((c) => c.op === "checkout")!.args).toMatchObject({ accountId: "acct_test", amountCents: 3000 });
    expect(await bookingRow(booking.id)).toMatchObject({ status: "pending_payment", payment_status: "unpaid", hold_expires_at: min(10) });
    expect(await outboxTypes(booking.id)).toEqual([]); // nobody is told until it's paid

    // The held time is not offered to anyone else.
    const slots = await engine.getAvailability({ shopId: shop.shopId, serviceId: shop.cut, barberId: shop.alex, date: TOMORROW, now: NOW });
    expect(slots.slots.some((s) => s.startsAt === at(TOMORROW, 10).toISOString())).toBe(false);

    expect(await webhook(paidEvent(booking.id), min(3))).toBe("confirmed");
    expect(await bookingRow(booking.id)).toMatchObject({ status: "confirmed", payment_status: "paid", payment_ref: `pi_${booking.id}`, hold_expires_at: null });
    expect(await outboxTypes(booking.id)).toEqual(["barber_alert", "sms_confirmation"]);
  });

  it("does nothing twice when the provider repeats an event", async () => {
    const { booking } = await payOnline();
    expect(await webhook(paidEvent(booking.id))).toBe("confirmed");
    expect(await webhook(paidEvent(booking.id))).toBe("duplicate");
    expect(await outboxTypes(booking.id)).toEqual(["barber_alert", "sms_confirmation"]);
  });

  it("never keeps a payment silently, even when the checkout on the Booking is a different one", async () => {
    const { booking } = await payOnline();
    expect(await webhook({ ...paidEvent(booking.id), checkoutRef: "cs_other" })).toBe("confirmed");
    expect(await bookingRow(booking.id)).toMatchObject({ status: "confirmed", payment_status: "paid" });
  });

  it("rejects a webhook that the provider didn't sign", async () => {
    await expect(payments().handleWebhook("{}", "forged")).rejects.toThrow(/signature/);
  });

  it("frees the time when the 10 minutes run out, and refunds a payment that arrives after", async () => {
    const { booking } = await payOnline();
    expect(await payments(min(9)).releaseExpiredHolds()).toEqual({ released: 0 });
    expect(await payments(min(11)).releaseExpiredHolds()).toEqual({ released: 1 });
    expect(await bookingRow(booking.id)).toMatchObject({ status: "cancelled" });
    expect(fake.calls.find((c) => c.op === "expire")!.args).toMatchObject({ accountId: "acct_test", checkoutRef: `cs_${booking.id}` });

    // Someone else can book that time now.
    await book(shop);

    // The first Client's payment still comes through: full automatic refund.
    expect(await webhook(paidEvent(booking.id), min(12))).toBe("refunding");
    expect(await outboxTypes(booking.id)).toEqual(["refund_requested"]);
    await payments().refund({ shopId: shop.shopId, bookingId: booking.id, amountCents: 3000, reason: "late_payment" });
    expect(fake.calls.find((c) => c.op === "refund")!.args).toMatchObject({ accountId: "acct_test", paymentRef: `pi_${booking.id}`, amountCents: 3000 });
    expect(await bookingRow(booking.id)).toMatchObject({ payment_status: "refunded" });
  });

  it("refunds in full when a paid Booking is cancelled, and keeps the payment when it is moved", async () => {
    const { booking, manageToken } = await payOnline();
    await webhook(paidEvent(booking.id));

    const moved = await engine.rescheduleBooking({ actor: { kind: "client", token: manageToken }, newStartsAt: at(TOMORROW, 11), now: NOW });
    expect(moved.paymentStatus).toBe("paid");

    await engine.cancelBooking({ actor: { kind: "client", token: manageToken }, now: NOW });
    const [refund] = await sql<{ payload: { amountCents: number } }[]>`
      select payload from public.outbox where booking_id = ${booking.id} and type = 'refund_requested'
    `;
    expect(refund.payload.amountCents).toBe(3000);
  });

  it("only offers online payment once the Shop's account can take payments", async () => {
    await dropShop(shop);
    shop = await makeShop();
    const owner = await makeUser(shop.shopId, "owner");
    await expect(book(shop, { paymentMethod: "online" })).rejects.toSatisfy((e) => isBookingError(e, "INVALID_INPUT"));

    const { url } = await payments().startOnboarding({ userId: owner, shopId: shop.shopId });
    expect(url).toBe("https://pay.test/onboard");
    expect(await payments().finishOnboarding({ userId: owner, shopId: shop.shopId })).toEqual({ ready: false });
    fake.setReady(true);
    expect(await payments().finishOnboarding({ userId: owner, shopId: shop.shopId })).toEqual({ ready: true });

    expect((await engine.getShopCatalog(shop.slug, NOW))!.shop.onlinePayments).toBe(true);
    await book(shop, { paymentMethod: "online" });

    const barber = await makeUser(shop.shopId, "barber", shop.alex);
    await expect(payments().startOnboarding({ userId: barber, shopId: shop.shopId })).rejects.toSatisfy((e) => isBookingError(e, "FORBIDDEN"));
  });

  it("a hold can't be paid with the wrong link, or after it ran out", async () => {
    const { booking } = await book(shop, { paymentMethod: "online" });
    await expect(payments().startCheckout({ bookingId: booking.id, manageToken: "wrong" })).rejects.toSatisfy((e) => isBookingError(e, "NOT_FOUND"));
    const { booking: late, manageToken } = await book(shop, { paymentMethod: "online", barberId: shop.blake });
    await expect(payments(min(11)).startCheckout({ bookingId: late.id, manageToken })).rejects.toSatisfy((e) =>
      isBookingError(e, "BOOKING_NOT_ACTIVE"),
    );
  });

  it("a held Booking can't be marked arrived and isn't counted until it is paid", async () => {
    const { booking } = await payOnline();
    const owner = await makeUser(shop.shopId, "owner");
    await expect(engine.setAttendance({ userId: owner, bookingId: booking.id, status: "arrived" })).rejects.toSatisfy((e) =>
      isBookingError(e, "BOOKING_NOT_ACTIVE"),
    );
    const stats = () => createReporting(sql).dayStatsForScheduledJob({ shopId: shop.shopId, date: TOMORROW });
    expect((await stats()).bookings).toBe(0);
    await webhook(paidEvent(booking.id));
    expect((await stats()).bookings).toBe(1);
  });
});
