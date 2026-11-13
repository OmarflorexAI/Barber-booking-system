import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { isBookingError } from "@/server/booking-engine";
import { createReporting } from "@/server/reporting";
import {
  at,
  book,
  dropShop,
  engine,
  makeShop,
  makeUser,
  minutesBefore,
  NOW,
  outboxTypes,
  sql,
  TOMORROW,
  uniquePhone,
  type TestShop,
} from "./fixtures";

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
async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p.then(() => "resolved", errorCode)).resolves.toBe(code);
}
const availTimes = async (barberId: string | "any", serviceId = shop.cut, date = TOMORROW) =>
  (await engine.getAvailability({ shopId: shop.shopId, serviceId, barberId, date, now: NOW })).slots.map((s) => s.time);

describe("availability", () => {
  it("removes a booked slot and its cleaning buffer", async () => {
    await book(shop, { serviceId: shop.fade, startsAt: at(TOMORROW, 10) }); // 10:00-10:30 + 15 buffer
    const t = await availTimes(shop.alex, shop.fade);
    expect(t).not.toContain("10:00");
    expect(t).not.toContain("10:30");
    expect(t).toContain("10:45");
    expect(t).not.toContain("09:30"); // 09:30 + 45 min would overlap 10:00
    expect(t).toContain("09:15");
  });

  it("'any' still offers a time when one of two Barbers is booked", async () => {
    await book(shop, { barberId: shop.alex, startsAt: at(TOMORROW, 10) });
    const { slots } = await engine.getAvailability({ shopId: shop.shopId, serviceId: shop.cut, barberId: "any", date: TOMORROW, now: NOW });
    expect(slots.find((s) => s.time === "10:00")?.barberIds).toEqual([shop.blake]);
  });

  it("rejects bookings under 30 minutes or over 30 days ahead", async () => {
    await expectCode(book(shop, { startsAt: new Date(NOW.getTime() + 15 * 60_000) }), "OUTSIDE_WINDOW");
    await expectCode(book(shop, { startsAt: at("2027-02-15", 10) }), "OUTSIDE_WINDOW");
  });

  it("rejects a time off the 15-minute grid or inside the break", async () => {
    await expectCode(book(shop, { startsAt: at(TOMORROW, 10, 5) }), "SLOT_TAKEN");
    await expectCode(book(shop, { startsAt: at(TOMORROW, 13, 15) }), "SLOT_TAKEN");
  });
});

describe("creating a Booking", () => {
  it("stores it in UTC, asks for a Barber alert and schedules the reminder", async () => {
    const { booking, manageToken } = await book(shop);
    expect(booking.startsAt.toISOString()).toBe("2027-01-12T15:00:00.000Z");
    expect(booking.priceCents).toBe(3000);
    expect(manageToken.length).toBeGreaterThan(20);
    expect(await outboxTypes(booking.id)).toEqual(["barber_alert"]); // texts are off for this Shop
    const [r] = await sql`select send_at from public.scheduled_messages where booking_id = ${booking.id}`;
    expect(r.send_at.toISOString()).toBe("2027-01-12T13:00:00.000Z");
  });

  it("queues a confirmation text only when the Shop's texts are enabled", async () => {
    const smsShop = await makeShop({ smsEnabled: true });
    extraShops.push(smsShop);
    const { booking } = await book(smsShop);
    expect(await outboxTypes(booking.id)).toEqual(["barber_alert", "sms_confirmation"]);
  });

  it("skips the reminder when booked less than 2 hours ahead", async () => {
    const { booking } = await book(shop, { startsAt: at("2027-01-11", 10, 30), now: NOW }); // 90 minutes ahead
    const rows = await sql`select 1 from public.scheduled_messages where booking_id = ${booking.id}`;
    expect(rows).toHaveLength(0);
  });

  it("uses a special price until its end date", async () => {
    await sql`
      update public.barber_services set special_price_cents = 2000, special_ends_at = ${new Date("2027-01-20T00:00:00Z")}
      where barber_id = ${shop.alex} and service_id = ${shop.cut}
    `;
    expect((await book(shop)).booking.priceCents).toBe(2000);
    const later = new Date("2027-01-21T14:00:00Z");
    const { booking } = await book(shop, { startsAt: at("2027-01-22", 10), now: later });
    expect(booking.priceCents).toBe(3000);
  });

  it("refuses a blocked phone number", async () => {
    const phone = uniquePhone();
    await sql`insert into public.clients (shop_id, name, phone_e164, blocked) values (${shop.shopId}, 'X', ${phone}, true)`;
    await expectCode(book(shop, { client: { name: "X", phone } }), "PHONE_BLOCKED");
  });

  it("allows at most 2 active unpaid Bookings per phone", async () => {
    const phone = uniquePhone();
    const client = { name: "Sam", phone };
    const first = await book(shop, { client, startsAt: at(TOMORROW, 10) });
    await book(shop, { client, startsAt: at(TOMORROW, 11) });
    await expectCode(book(shop, { client, startsAt: at(TOMORROW, 12) }), "UNPAID_LIMIT");

    await engine.cancelBooking({ actor: { kind: "client", token: first.manageToken }, now: NOW });
    await expect(book(shop, { client, startsAt: at(TOMORROW, 12) })).resolves.toBeTruthy();
  });

  it("never double books: two Clients racing for one Barber and Slot, exactly one wins", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => book(shop, { startsAt: at(TOMORROW, 15) })),
    );
    const won = results.filter((r) => r.status === "fulfilled");
    const lost = results.filter((r) => r.status === "rejected");
    expect(won).toHaveLength(1);
    expect(lost.every((r) => errorCode((r as PromiseRejectedResult).reason) === "SLOT_TAKEN")).toBe(true);
    const [{ n }] = await sql`select count(*)::int as n from public.bookings where barber_id = ${shop.alex} and status <> 'cancelled'`;
    expect(n).toBe(1);
  });

  it("heavy racing never deadlocks: every loser gets a clean SLOT_TAKEN", async () => {
    // Regression: without the per-Barber lock, ~1 in 6 losers got a Postgres deadlock (40P01)
    // under this load instead of SLOT_TAKEN (measured: 18 and 27 deadlocks in two runs; 0 with the lock).
    const starts = [9, 10, 11, 12, 14, 15, 16].flatMap((h) => [at(TOMORROW, h), at(TOMORROW, h, 30)]);
    const codes: string[] = [];
    let booked = 0;
    for (const startsAt of starts) {
      const results = await Promise.allSettled(
        Array.from({ length: 10 }, () => book(shop, { startsAt, client: { name: "Racer", phone: uniquePhone() } })),
      );
      booked += results.filter((r) => r.status === "fulfilled").length;
      codes.push(...results.filter((r) => r.status === "rejected").map((r) => errorCode((r as PromiseRejectedResult).reason)));
    }
    expect(booked).toBe(starts.length); // exactly one winner per slot
    expect(new Set(codes)).toEqual(new Set(["SLOT_TAKEN"]));
  });

  it("the database itself refuses an overlapping Booking", async () => {
    const { booking } = await book(shop);
    await expect(
      sql`insert into public.bookings (shop_id, barber_id, service_id, kind, status, starts_at, ends_at, blocked_until, price_cents)
          values (${shop.shopId}, ${shop.alex}, ${shop.cut}, 'walk_in', 'arrived',
                  ${new Date(booking.startsAt.getTime() + 10 * 60_000)}, ${booking.endsAt}, ${booking.endsAt}, 0)`,
    ).rejects.toMatchObject({ code: "23P01" });
  });
});

describe("'any available Barber'", () => {
  it("assigns the free Barber with the fewest Bookings that day", async () => {
    await book(shop, { barberId: shop.alex, startsAt: at(TOMORROW, 9) });
    const { booking } = await book(shop, { barberId: "any", startsAt: at(TOMORROW, 11) });
    expect(booking.barberId).toBe(shop.blake);
  });

  it("breaks ties by list order", async () => {
    const { booking } = await book(shop, { barberId: "any", startsAt: at(TOMORROW, 11) });
    expect(booking.barberId).toBe(shop.alex);
  });

  it("gives two racing Clients two different Barbers instead of failing one", async () => {
    const [a, b] = await Promise.all([
      book(shop, { barberId: "any", startsAt: at(TOMORROW, 16) }),
      book(shop, { barberId: "any", startsAt: at(TOMORROW, 16) }),
    ]);
    expect(new Set([a.booking.barberId, b.booking.barberId])).toEqual(new Set([shop.alex, shop.blake]));
    await expectCode(book(shop, { barberId: "any", startsAt: at(TOMORROW, 16) }), "SLOT_TAKEN");
  });
});

describe("cancelling and the cutoff", () => {
  it("lets the Client cancel up to the cutoff, not after", async () => {
    const a = await book(shop, { startsAt: at(TOMORROW, 10) });
    const b = await book(shop, { startsAt: at(TOMORROW, 11) });
    await expect(
      engine.cancelBooking({ actor: { kind: "client", token: a.manageToken }, now: minutesBefore(a.booking.startsAt, 60) }),
    ).resolves.toMatchObject({ status: "cancelled" });
    await expectCode(
      engine.cancelBooking({ actor: { kind: "client", token: b.manageToken }, now: minutesBefore(b.booking.startsAt, 59) }),
      "CUTOFF_PASSED",
    );
  });

  it("respects a Shop's own cutoff", async () => {
    // The Booking is 25 hours away: inside a 48-hour cutoff, outside a 24-hour one.
    const strict = await makeShop({ cutoffMin: 48 * 60 });
    const lenient = await makeShop({ cutoffMin: 24 * 60 });
    extraShops.push(strict, lenient);
    const s = await book(strict);
    const l = await book(lenient);
    await expectCode(engine.cancelBooking({ actor: { kind: "client", token: s.manageToken }, now: NOW }), "CUTOFF_PASSED");
    await expect(engine.cancelBooking({ actor: { kind: "client", token: l.manageToken }, now: NOW })).resolves.toMatchObject({ status: "cancelled" });
  });

  it("frees the slot and removes the unsent reminder", async () => {
    const { booking, manageToken } = await book(shop);
    await engine.cancelBooking({ actor: { kind: "client", token: manageToken }, now: NOW });
    expect(await availTimes(shop.alex)).toContain("10:00");
    expect(await sql`select 1 from public.scheduled_messages where booking_id = ${booking.id}`).toHaveLength(0);
  });

  it("cannot cancel twice", async () => {
    const { manageToken } = await book(shop);
    await engine.cancelBooking({ actor: { kind: "client", token: manageToken }, now: NOW });
    await expectCode(engine.cancelBooking({ actor: { kind: "client", token: manageToken }, now: NOW }), "BOOKING_NOT_ACTIVE");
  });
});

describe("automatic refunds", () => {
  const markPaid = (id: string) => sql`update public.bookings set payment_method = 'online', payment_status = 'paid' where id = ${id}`;

  it("Client cancels a paid Booking before the cutoff: full refund requested", async () => {
    const { booking, manageToken } = await book(shop);
    await markPaid(booking.id);
    await engine.cancelBooking({ actor: { kind: "client", token: manageToken }, now: NOW });
    expect(await outboxTypes(booking.id)).toContain("refund_requested");
  });

  it("Barber cancels a paid Booking, even after the cutoff: refund plus a text to the Client", async () => {
    const smsShop = await makeShop({ smsEnabled: true });
    extraShops.push(smsShop);
    const barberUser = await makeUser(smsShop.shopId, "barber", smsShop.alex);
    const { booking } = await book(smsShop);
    await markPaid(booking.id);
    await engine.cancelBooking({
      actor: { kind: "staff", userId: barberUser },
      bookingId: booking.id,
      now: minutesBefore(booking.startsAt, 10),
    });
    const types = await outboxTypes(booking.id);
    expect(types).toContain("refund_requested");
    expect(types).toContain("sms_cancelled");
    const [{ cancelled_by }] = await sql`select cancelled_by from public.bookings where id = ${booking.id}`;
    expect(cancelled_by).toBe("barber");
  });

  it("Owner cancels: refund requested and recorded as the owner", async () => {
    const owner = await makeUser(shop.shopId, "owner");
    const { booking } = await book(shop);
    await markPaid(booking.id);
    await engine.cancelBooking({ actor: { kind: "staff", userId: owner }, bookingId: booking.id, now: NOW });
    expect(await outboxTypes(booking.id)).toContain("refund_requested");
  });

  it("an unpaid Booking requests no refund", async () => {
    const { booking, manageToken } = await book(shop);
    await engine.cancelBooking({ actor: { kind: "client", token: manageToken }, now: NOW });
    expect(await outboxTypes(booking.id)).not.toContain("refund_requested");
  });
});

describe("rescheduling", () => {
  it("moves the time, keeps price and payment, and moves the reminder", async () => {
    const { booking, manageToken } = await book(shop);
    const moved = await engine.rescheduleBooking({
      actor: { kind: "client", token: manageToken },
      newStartsAt: at(TOMORROW, 15),
      now: NOW,
    });
    expect(moved.id).toBe(booking.id);
    expect(moved.startsAt.toISOString()).toBe(at(TOMORROW, 15).toISOString());
    expect(moved.priceCents).toBe(booking.priceCents);
    const [r] = await sql`select send_at from public.scheduled_messages where booking_id = ${booking.id}`;
    expect(r.send_at.toISOString()).toBe(at(TOMORROW, 13).toISOString());
    expect(await availTimes(shop.alex)).toContain("10:00");
  });

  it("can move to a slot overlapping its own old time", async () => {
    const { manageToken } = await book(shop, { startsAt: at(TOMORROW, 10) });
    await expect(
      engine.rescheduleBooking({ actor: { kind: "client", token: manageToken }, newStartsAt: at(TOMORROW, 10, 15), now: NOW }),
    ).resolves.toBeTruthy();
  });

  it("refuses a slot someone else holds", async () => {
    await book(shop, { startsAt: at(TOMORROW, 15) });
    const { manageToken } = await book(shop, { startsAt: at(TOMORROW, 10) });
    await expectCode(
      engine.rescheduleBooking({ actor: { kind: "client", token: manageToken }, newStartsAt: at(TOMORROW, 15), now: NOW }),
      "SLOT_TAKEN",
    );
  });

  it("follows the same cutoff as cancelling", async () => {
    const { booking, manageToken } = await book(shop);
    await expectCode(
      engine.rescheduleBooking({
        actor: { kind: "client", token: manageToken },
        newStartsAt: at(TOMORROW, 15),
        now: minutesBefore(booking.startsAt, 30),
      }),
      "CUTOFF_PASSED",
    );
  });
});

describe("Walk-ins and attendance", () => {
  it("a Walk-in blocks the Barber's time for online Clients", async () => {
    const barberUser = await makeUser(shop.shopId, "barber", shop.alex);
    await engine.logWalkIn({
      userId: barberUser,
      shopId: shop.shopId,
      barberId: shop.alex,
      serviceId: shop.cut,
      startsAt: at(TOMORROW, 11),
      now: NOW,
    });
    expect(await availTimes(shop.alex)).not.toContain("11:00");
    await expectCode(book(shop, { startsAt: at(TOMORROW, 11) }), "SLOT_TAKEN");
  });

  it("a Walk-in cannot overlap an existing Booking", async () => {
    const barberUser = await makeUser(shop.shopId, "barber", shop.alex);
    await book(shop, { startsAt: at(TOMORROW, 11) });
    await expectCode(
      engine.logWalkIn({ userId: barberUser, shopId: shop.shopId, barberId: shop.alex, serviceId: shop.cut, startsAt: at(TOMORROW, 11, 15), now: NOW }),
      "SLOT_TAKEN",
    );
  });

  it("a Barber marks arrived or no-show on their own Bookings only", async () => {
    const alexUser = await makeUser(shop.shopId, "barber", shop.alex);
    const blakeUser = await makeUser(shop.shopId, "barber", shop.blake);
    const { booking } = await book(shop);
    await expect(engine.setAttendance({ userId: alexUser, bookingId: booking.id, status: "no_show" })).resolves.toMatchObject({ status: "no_show" });
    await expectCode(engine.setAttendance({ userId: blakeUser, bookingId: booking.id, status: "arrived" }), "FORBIDDEN");
    await expectCode(engine.cancelBooking({ actor: { kind: "staff", userId: blakeUser }, bookingId: booking.id, now: NOW }), "FORBIDDEN");
  });
});

describe("undo on the day view", () => {
  it("undoing arrived or no-show puts the Booking back to confirmed, own Bookings only", async () => {
    const alexUser = await makeUser(shop.shopId, "barber", shop.alex);
    const blakeUser = await makeUser(shop.shopId, "barber", shop.blake);
    const owner = await makeUser(shop.shopId, "owner");
    const { booking } = await book(shop);
    await engine.setAttendance({ userId: alexUser, bookingId: booking.id, status: "arrived" });
    await expectCode(engine.undoAttendance({ userId: blakeUser, bookingId: booking.id }), "FORBIDDEN");
    await expect(engine.undoAttendance({ userId: alexUser, bookingId: booking.id })).resolves.toMatchObject({ status: "confirmed" });
    await expectCode(engine.undoAttendance({ userId: alexUser, bookingId: booking.id }), "BOOKING_NOT_ACTIVE"); // nothing to undo
    await engine.setAttendance({ userId: alexUser, bookingId: booking.id, status: "no_show" });
    await expect(engine.undoAttendance({ userId: owner, bookingId: booking.id })).resolves.toMatchObject({ status: "confirmed" });
    expect(await outboxTypes(booking.id)).toEqual(["barber_alert"]); // only the original creation alert
  });

  it("an undone no-show stops counting toward the pay-online rule", async () => {
    const payShop = await makeShop({ onlinePayments: true });
    extraShops.push(payShop);
    const alexUser = await makeUser(payShop.shopId, "barber", payShop.alex);
    const phone = uniquePhone();
    const client = { name: "Test Client", phone };
    const missed: string[] = [];
    for (const daysAgo of [10, 20]) {
      const { booking } = await book(payShop, { client, startsAt: at(TOMORROW, 10 + missed.length) });
      const startsAt = new Date(NOW.getTime() - daysAgo * 24 * 60 * 60_000);
      const endsAt = new Date(startsAt.getTime() + 30 * 60_000);
      await sql`update public.bookings set starts_at = ${startsAt}, ends_at = ${endsAt}, blocked_until = ${endsAt} where id = ${booking.id}`;
      await engine.setAttendance({ userId: alexUser, bookingId: booking.id, status: "no_show" });
      missed.push(booking.id);
    }
    await expectCode(book(payShop, { client, startsAt: at(TOMORROW, 12) }), "PAY_ONLINE_REQUIRED");
    await engine.undoAttendance({ userId: alexUser, bookingId: missed[0] });
    await expect(book(payShop, { client, startsAt: at(TOMORROW, 12) })).resolves.toBeTruthy();
  });

  it("only a Walk-in can be removed; removing it frees the time and drops it from the stats", async () => {
    const alexUser = await makeUser(shop.shopId, "barber", shop.alex);
    const blakeUser = await makeUser(shop.shopId, "barber", shop.blake);
    const owner = await makeUser(shop.shopId, "owner");
    const { booking } = await book(shop, { startsAt: at(TOMORROW, 15) });
    await expectCode(engine.removeWalkIn({ userId: alexUser, bookingId: booking.id, now: NOW }), "INVALID_INPUT");

    const walkIn = await engine.logWalkIn({
      userId: alexUser,
      shopId: shop.shopId,
      barberId: shop.alex,
      serviceId: shop.cut,
      startsAt: at(TOMORROW, 11),
      now: NOW,
    });
    await expectCode(engine.undoAttendance({ userId: alexUser, bookingId: walkIn.id }), "INVALID_INPUT");
    const stats = () => createReporting(sql).dayStats({ userId: owner, shopId: shop.shopId, date: TOMORROW });
    expect(await stats()).toMatchObject({ bookings: 1, walkIns: 1 });
    await expectCode(book(shop, { startsAt: at(TOMORROW, 11) }), "SLOT_TAKEN");

    await expectCode(engine.removeWalkIn({ userId: blakeUser, bookingId: walkIn.id, now: NOW }), "FORBIDDEN");
    await expect(engine.removeWalkIn({ userId: alexUser, bookingId: walkIn.id, now: NOW })).resolves.toMatchObject({ status: "cancelled" });
    const [row] = await sql`select cancelled_by from public.bookings where id = ${walkIn.id}`;
    expect(row.cancelled_by).toBe("barber");
    expect(await outboxTypes(walkIn.id)).toEqual([]);
    expect(await stats()).toMatchObject({ bookings: 1, walkIns: 0 });
    expect(await availTimes(shop.alex)).toContain("11:00");
    await book(shop, { startsAt: at(TOMORROW, 11) });
    await expectCode(engine.removeWalkIn({ userId: alexUser, bookingId: walkIn.id, now: NOW }), "BOOKING_NOT_ACTIVE");
  });
});

describe("days off and closed days", () => {
  it("a day off cannot be saved over live Bookings until they are cancelled", async () => {
    const alexUser = await makeUser(shop.shopId, "barber", shop.alex);
    const { booking } = await book(shop);
    await expectCode(engine.addBarberDayOff({ userId: alexUser, shopId: shop.shopId, barberId: shop.alex, date: TOMORROW }), "DAY_HAS_BOOKINGS");

    await engine.cancelBooking({ actor: { kind: "staff", userId: alexUser }, bookingId: booking.id, now: NOW });
    await engine.addBarberDayOff({ userId: alexUser, shopId: shop.shopId, barberId: shop.alex, date: TOMORROW });
    expect(await availTimes(shop.alex)).toEqual([]);
    expect(await availTimes(shop.blake)).toContain("10:00");
  });

  it("a Shop closed day blocks every Barber and is guarded the same way", async () => {
    const owner = await makeUser(shop.shopId, "owner");
    const { manageToken } = await book(shop, { barberId: shop.blake });
    await expectCode(engine.addShopClosedDay({ userId: owner, shopId: shop.shopId, date: TOMORROW }), "DAY_HAS_BOOKINGS");

    await engine.cancelBooking({ actor: { kind: "client", token: manageToken }, now: NOW });
    await engine.addShopClosedDay({ userId: owner, shopId: shop.shopId, date: TOMORROW });
    expect(await availTimes("any")).toEqual([]);
  });

  it("only the Owner can close the Shop", async () => {
    const barberUser = await makeUser(shop.shopId, "barber", shop.alex);
    await expectCode(engine.addShopClosedDay({ userId: barberUser, shopId: shop.shopId, date: TOMORROW }), "FORBIDDEN");
  });
});

describe("daylight saving time", () => {
  it("a 10:00 Booking on the March change day is stored as 14:00 UTC", async () => {
    const { booking } = await book(shop, { startsAt: at("2027-03-14", 10), now: new Date("2027-03-01T15:00:00Z") });
    expect(booking.startsAt.toISOString()).toBe("2027-03-14T14:00:00.000Z");
  });

  it("a 10:00 Booking on the November change day is stored as 15:00 UTC", async () => {
    const { booking } = await book(shop, { startsAt: at("2027-11-07", 10), now: new Date("2027-11-01T15:00:00Z") });
    expect(booking.startsAt.toISOString()).toBe("2027-11-07T15:00:00.000Z");
  });
});

describe("tenant isolation (row-level security)", () => {
  /** Run a query as a signed-in user, the way Supabase's API does. */
  async function asUser<T>(userId: string, q: (tx: typeof sql) => Promise<T>): Promise<T> {
    let out!: T;
    await sql.begin(async (tx) => {
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: "authenticated" })}, true)`;
      await tx`set local role authenticated`;
      out = await q(tx as unknown as typeof sql);
      await tx`reset role`;
    });
    return out;
  }

  it("an Owner of one Shop sees none of another Shop's data", async () => {
    const other = await makeShop();
    extraShops.push(other);
    const owner = await makeUser(shop.shopId, "owner");
    await book(shop);
    await book(other);

    const seen = await asUser(owner, (tx) => tx<{ shop_id: string }[]>`select shop_id from public.bookings`);
    expect(seen.length).toBe(1);
    expect(seen.every((r) => r.shop_id === shop.shopId)).toBe(true);
    const shops = await asUser(owner, (tx) => tx`select id from public.shops`);
    expect(shops.map((s) => s.id)).toEqual([shop.shopId]);
    const clients = await asUser(owner, (tx) => tx`select id from public.clients where shop_id = ${other.shopId}`);
    expect(clients).toHaveLength(0);
  });

  it("a Barber sees only their own Bookings and cannot change prices", async () => {
    const alexUser = await makeUser(shop.shopId, "barber", shop.alex);
    await book(shop, { barberId: shop.alex });
    await book(shop, { barberId: shop.blake });

    const seen = await asUser(alexUser, (tx) => tx<{ barber_id: string }[]>`select barber_id from public.bookings`);
    expect(seen.map((r) => r.barber_id)).toEqual([shop.alex]);
    const updated = await asUser(alexUser, (tx) => tx`update public.barber_services set price_cents = 1 where barber_id = ${shop.alex} returning 1`);
    expect(updated).toHaveLength(0);
  });

  it("nobody signed in can write Bookings directly", async () => {
    const owner = await makeUser(shop.shopId, "owner");
    await expect(
      asUser(owner, (tx) => tx`update public.bookings set price_cents = 0`),
    ).rejects.toMatchObject({ code: "42501" });
  });
});
