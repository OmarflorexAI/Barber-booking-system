import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDispatcher, type Senders } from "@/server/dispatch";
import { at, book, dropShop, engine, makeShop, makeUser, minutesBefore, NOW, sql, TOMORROW, uniquePhone, type TestShop } from "./fixtures";

/**
 * The sending worker drains the outbox the booking engine writes.
 * Real Postgres (claims and retries live in SQL); fake senders at the edge.
 */

type Sent = { channel: keyof Senders; msg: Record<string, unknown> };

function fakeSenders() {
  const sent: Sent[] = [];
  const failing = new Set<keyof Senders>();
  const rec =
    (channel: keyof Senders) =>
    async (msg: object): Promise<void> => {
      if (failing.has(channel)) throw new Error(`${channel} provider down`);
      sent.push({ channel, msg: msg as Record<string, unknown> });
    };
  const senders: Senders = { sms: rec("sms"), barberAlert: rec("barberAlert"), refund: rec("refund") };
  return { senders, sent, failing };
}

const minutesAfter = (d: Date, min: number) => new Date(d.getTime() + min * 60_000);

let shop: TestShop;
let fake: ReturnType<typeof fakeSenders>;
const run = (now = NOW) => createDispatcher({ sql, senders: fake.senders }).run({ now, shopIds: [shop.shopId] });

beforeEach(async () => {
  shop = await makeShop();
  fake = fakeSenders();
});
afterEach(async () => {
  await dropShop(shop);
});
afterAll(async () => {
  await sql.end();
});

describe("dispatcher", () => {
  it("delivers a new Booking's Barber alert once and marks it done", async () => {
    const { booking } = await book(shop);

    const first = await run();
    expect(fake.sent).toEqual([
      { channel: "barberAlert", msg: expect.objectContaining({ bookingId: booking.id, barberId: shop.alex, event: "created" }) },
    ]);
    expect(first).toMatchObject({ sent: 1, failed: 0 });

    await run(); // nothing left to send
    expect(fake.sent).toHaveLength(1);
  });

  it("texts the Client their confirmation when the Shop has texts on", async () => {
    await dropShop(shop);
    shop = await makeShop({ smsEnabled: true });
    const phone = uniquePhone();
    const { booking } = await book(shop, { client: { name: "Ana", phone } });

    await run();
    expect(fake.sent.filter((s) => s.channel === "sms")).toEqual([
      { channel: "sms", msg: { shopId: shop.shopId, bookingId: booking.id, to: phone, template: "confirmation" } },
    ]);
  });

  it("skips texts the Client should no longer get, without counting them as failures", async () => {
    await dropShop(shop);
    shop = await makeShop({ smsEnabled: true });
    const optedOut = uniquePhone();
    await book(shop, { client: { name: "Opted out", phone: optedOut } });
    // The Client replies STOP before the worker runs.
    await sql`update public.clients set sms_opt_out = true where shop_id = ${shop.shopId} and phone_e164 = ${optedOut}`;
    // Another Client books and cancels before the worker runs: no stale confirmation.
    const { booking: gone, manageToken } = await book(shop, { barberId: shop.blake });
    await engine.cancelBooking({ bookingId: gone.id, actor: { kind: "client", token: manageToken }, now: NOW });

    const result = await run();
    expect(fake.sent.filter((s) => s.channel === "sms")).toEqual([]);
    expect(result).toMatchObject({ skipped: 2, failed: 0 });
  });

  it("retries a failed send later, then succeeds once the provider is back", async () => {
    await book(shop);
    fake.failing.add("barberAlert");

    expect(await run(NOW)).toMatchObject({ sent: 0, retrying: 1 });
    expect(await run(NOW)).toMatchObject({ sent: 0, retrying: 0 }); // waits before retrying

    fake.failing.delete("barberAlert");
    expect(await run(minutesAfter(NOW, 1))).toMatchObject({ sent: 1 });
    expect(fake.sent).toHaveLength(1);
  });

  it("gives up after 4 attempts and records the failure for the admin view", async () => {
    await book(shop);
    fake.failing.add("barberAlert");

    const results = [];
    for (const min of [0, 1, 6, 36]) results.push(await run(minutesAfter(NOW, min)));
    expect(results.map((r) => [r.retrying, r.failed])).toEqual([[1, 0], [1, 0], [1, 0], [0, 1]]);

    expect(await run(minutesAfter(NOW, 600))).toMatchObject({ sent: 0, retrying: 0, failed: 0 });
    const failures = await createDispatcher({ sql, senders: fake.senders }).failures({ shopIds: [shop.shopId] });
    expect(failures).toEqual([
      expect.objectContaining({ type: "barber_alert", attempts: 4, lastError: "barberAlert provider down" }),
    ]);
  });

  it("asks the payment provider for a full refund when a paid Booking is cancelled by the Shop", async () => {
    const { booking } = await book(shop);
    // Paid online (until the payments phase exists, set it the way its webhook will).
    await sql`update public.bookings set payment_method = 'online', payment_status = 'paid' where id = ${booking.id}`;
    const owner = await makeUser(shop.shopId, "owner");
    await engine.cancelBooking({ bookingId: booking.id, actor: { kind: "staff", userId: owner }, now: NOW });

    await run();
    expect(fake.sent.filter((s) => s.channel === "refund")).toEqual([
      { channel: "refund", msg: { shopId: shop.shopId, bookingId: booking.id, amountCents: 3000, reason: "cancelled_by_owner" } },
    ]);
  });

  it("sends the 2-hour reminder once, even when two workers run at the same moment", async () => {
    await dropShop(shop);
    shop = await makeShop({ smsEnabled: true });
    const phone = uniquePhone();
    const startsAt = at(TOMORROW, 10);
    const { booking } = await book(shop, { startsAt, client: { name: "Ana", phone } });
    await run(NOW); // confirmation goes out now
    const reminders = () => fake.sent.filter((s) => s.channel === "sms" && s.msg.template === "reminder");

    await run(minutesBefore(startsAt, 121)); // not due yet
    expect(reminders()).toEqual([]);

    const due = minutesBefore(startsAt, 120);
    await Promise.all([run(due), run(due)]);
    await run(due);
    expect(reminders()).toEqual([
      { channel: "sms", msg: { shopId: shop.shopId, bookingId: booking.id, to: phone, template: "reminder" } },
    ]);
  });

  it("never sends a row twice when several workers drain the outbox at once", async () => {
    for (const h of [10, 11, 12, 14]) await book(shop, { startsAt: at(TOMORROW, h) });

    await Promise.all([run(), run(), run()]);
    const alerts = fake.sent.filter((s) => s.channel === "barberAlert").map((s) => s.msg.bookingId);
    expect(alerts).toHaveLength(4);
    expect(new Set(alerts).size).toBe(4);
  });
});
