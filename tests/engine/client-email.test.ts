import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import type { EmailProvider } from "@/server/alerts";
import { isBookingError } from "@/server/booking-engine";
import { manageTokenFor } from "@/server/booking-engine/manage-token";
import { createClientEmail } from "@/server/client-email";
import { createDispatcher, type ClientEmailMessage, type Senders } from "@/server/dispatch";
import { at, book, dropShop, engine, makeShop, makeUser, MANAGE_LINK_SECRET, NOW, outboxTypes, sql, TOMORROW, uniquePhone, type TestShop } from "./fixtures";

/** Client emails: the engine writes the email_* outbox row in the same transaction as the change. */

let shop: TestShop;
const extraShops: TestShop[] = [];

beforeEach(async () => {
  shop = await makeShop();
});
afterEach(async () => {
  await dropShop(shop);
  while (extraShops.length) await dropShop(extraShops.pop()!);
});
afterAll(async () => {
  await sql.end();
});

const errorCode = (e: unknown) => (isBookingError(e) ? e.code : String(e));
const withEmail = (email: string | null) => ({ client: { name: "Ana", phone: uniquePhone(), email } });

/**
 * The outbox row of `type` and the Booking row were last written by the same transaction
 * (Postgres stamps every row version with the id of the transaction that wrote it).
 */
async function sameTransaction(bookingId: string, type: string) {
  const [r] = await sql<{ same: boolean; payload: Record<string, unknown> }[]>`
    select (o.xmin::text = b.xmin::text) as same, o.payload
    from public.outbox o join public.bookings b on b.id = o.booking_id
    where o.booking_id = ${bookingId} and o.type = ${type}
  `;
  return r;
}

describe("client emails: outbox rows", () => {
  it("a Booking with an email writes email_confirmation in the creating transaction, and stores the email lowercased", async () => {
    const { booking } = await book(shop, withEmail("  Ana@Example.COM "));
    expect(await outboxTypes(booking.id)).toEqual(["barber_alert", "email_confirmation"]);
    expect(await sameTransaction(booking.id, "email_confirmation")).toMatchObject({ same: true });
    const [c] = await sql`select c.email from public.clients c join public.bookings b on b.client_id = c.id where b.id = ${booking.id}`;
    expect(c.email).toBe("ana@example.com");
  });

  it("no email, empty email: no email row", async () => {
    const a = await book(shop, withEmail(null));
    const b = await book(shop, { ...withEmail(""), startsAt: at(TOMORROW, 11) });
    expect(await outboxTypes(a.booking.id)).toEqual(["barber_alert"]);
    expect(await outboxTypes(b.booking.id)).toEqual(["barber_alert"]);
  });

  it("rejects an email that doesn't look like one", async () => {
    await expect(book(shop, withEmail("not-an-email")).then(() => "ok", errorCode)).resolves.toBe("INVALID_EMAIL");
  });

  it("a repeat Client who leaves the email empty keeps the one they gave before", async () => {
    const phone = uniquePhone();
    await book(shop, { client: { name: "Ana", phone, email: "ana@example.com" } });
    const { booking } = await book(shop, { client: { name: "Ana", phone }, startsAt: at(TOMORROW, 11) });
    expect(await outboxTypes(booking.id)).toContain("email_confirmation");
  });

  it("Client cancels: email_cancelled in the cancelling transaction (unlike the text, the Client gets it too)", async () => {
    const { booking, manageToken } = await book(shop, withEmail("ana@example.com"));
    await engine.cancelBooking({ actor: { kind: "client", token: manageToken }, now: NOW });
    const row = await sameTransaction(booking.id, "email_cancelled");
    expect(row).toMatchObject({ same: true, payload: { by: "client" } });
  });

  it("Owner moves a Booking: email_rescheduled in the moving transaction, with the old time", async () => {
    const owner = await makeUser(shop.shopId, "owner");
    const { booking } = await book(shop, withEmail("ana@example.com"));
    await engine.rescheduleBooking({ actor: { kind: "staff", userId: owner }, bookingId: booking.id, newStartsAt: at(TOMORROW, 15), now: NOW });
    const row = await sameTransaction(booking.id, "email_rescheduled");
    expect(row).toMatchObject({ same: true, payload: { by: "owner", from: at(TOMORROW, 10).toISOString() } });
  });

  it("cancel and move without an email write no email rows", async () => {
    const owner = await makeUser(shop.shopId, "owner");
    const a = await book(shop, withEmail(null));
    await engine.rescheduleBooking({ actor: { kind: "staff", userId: owner }, bookingId: a.booking.id, newStartsAt: at(TOMORROW, 15), now: NOW });
    await engine.cancelBooking({ actor: { kind: "staff", userId: owner }, bookingId: a.booking.id, now: NOW });
    expect((await outboxTypes(a.booking.id)).filter((t) => t.startsWith("email_"))).toEqual([]);
  });

  it("an online Booking is emailed when it is paid, not while it is held", async () => {
    const payShop = await makeShop({ onlinePayments: true });
    extraShops.push(payShop);
    const { booking } = await book(payShop, { ...withEmail("ana@example.com"), paymentMethod: "online" });
    expect(await outboxTypes(booking.id)).toEqual([]);
    await sql.begin((tx) => engine.recordOnlinePayment({ bookingId: booking.id, paymentRef: "pi_test_email", now: NOW }, tx));
    expect(await outboxTypes(booking.id)).toContain("email_confirmation");
    expect(await sameTransaction(booking.id, "email_confirmation")).toMatchObject({ same: true });
  });

  it("a Walk-in has no Client: no email row", async () => {
    const owner = await makeUser(shop.shopId, "owner");
    const walkIn = await engine.logWalkIn({ userId: owner, shopId: shop.shopId, barberId: shop.alex, serviceId: shop.cut, now: NOW });
    expect(await outboxTypes(walkIn.id)).toEqual([]);
  });
});

describe("client emails: sending", () => {
  function fakeSenders() {
    const emails: ClientEmailMessage[] = [];
    const noop = async () => {};
    const senders: Senders = {
      sms: noop,
      clientEmail: async (m) => {
        emails.push(m);
      },
      barberAlert: noop,
      refund: noop,
      refundFailed: noop,
    };
    return { senders, emails };
  }
  const run = (senders: Senders) => createDispatcher({ sql, senders }).run({ now: NOW, shopIds: [shop.shopId] });

  it("sends the confirmation to the Client's email, decided at send time", async () => {
    const { booking } = await book(shop, withEmail("ana@example.com"));
    const fake = fakeSenders();
    await run(fake.senders);
    expect(fake.emails).toEqual([expect.objectContaining({ bookingId: booking.id, to: "ana@example.com", kind: "confirmation" })]);
  });

  it("skips the confirmation once the Booking is cancelled, but sends the cancellation", async () => {
    const { booking, manageToken } = await book(shop, withEmail("ana@example.com"));
    await engine.cancelBooking({ actor: { kind: "client", token: manageToken }, now: NOW });
    const fake = fakeSenders();
    const result = await run(fake.senders);
    expect(fake.emails).toEqual([expect.objectContaining({ bookingId: booking.id, kind: "cancelled", by: "client" })]);
    expect(result.skipped).toBe(1);
  });

  it("the real sender renders the Booking in the Client's language with their manage link", async () => {
    const sent: Parameters<EmailProvider["send"]>[0][] = [];
    const sender = createClientEmail({
      sql,
      email: { send: async (m) => void sent.push(m) },
      config: { siteUrl: "https://example.test", manageLinkSecret: MANAGE_LINK_SECRET },
    });
    const { booking } = await book(shop, { ...withEmail("ana@example.com"), locale: "es" });
    await sender.send({ shopId: shop.shopId, bookingId: booking.id, to: "ana@example.com", kind: "confirmation" });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toEqual(["ana@example.com"]);
    expect(sent[0].subject).toContain("Cita confirmada");
    expect(sent[0].text).toContain(`https://example.test/m/${manageTokenFor(booking.id, MANAGE_LINK_SECRET)}`);
    expect(sent[0].text).toContain("Alex");
    expect(sent[0].html).toContain("<a href=");
  });
});
