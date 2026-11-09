import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { isBookingError } from "@/server/booking-engine";
import { staffRole } from "@/server/booking-engine/access";
import { createReporting } from "@/server/reporting";
import { createShopAdmin } from "@/server/shop-admin";
import { at, book, dropShop, engine, makeShop, makeUser, NOW, sql, TOMORROW, uniquePhone, type TestShop } from "./fixtures";

/**
 * Owner tools (B5): what an Owner can change about their Shop, and what a
 * Barber cannot. Real Postgres, same throwaway-Shop fixtures as the engine.
 */
const admin = createShopAdmin(sql);
const reports = createReporting(sql);

let shop: TestShop;
let owner: string;
let barberUser: string; // Blake's login

beforeEach(async () => {
  shop = await makeShop();
  owner = await makeUser(shop.shopId, "owner");
  barberUser = await makeUser(shop.shopId, "barber", shop.blake);
});
afterEach(async () => {
  await dropShop(shop);
});
afterAll(async () => {
  await sql.end();
});

const errorCode = (e: unknown) => (isBookingError(e) ? e.code : String(e));
async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p.then(() => "resolved", errorCode)).resolves.toBe(code);
}

describe("Barbers", () => {
  it("a Shop has at most 6 active Barbers", async () => {
    for (const name of ["Cam", "Dee", "Eli", "Fin"]) {
      await admin.addBarber({ userId: owner, shopId: shop.shopId, displayName: name });
    }
    await expectCode(admin.addBarber({ userId: owner, shopId: shop.shopId, displayName: "Gus" }), "BARBER_LIMIT");
  });

  it("removing a Barber waits until their upcoming Bookings are cancelled or moved", async () => {
    const { booking } = await book(shop, { barberId: shop.blake });
    await expectCode(
      admin.removeBarber({ userId: owner, shopId: shop.shopId, barberId: shop.blake, now: NOW }),
      "BARBER_HAS_BOOKINGS",
    );

    await engine.cancelBooking({ bookingId: booking.id, actor: { kind: "staff", userId: owner }, now: NOW });
    await admin.removeBarber({ userId: owner, shopId: shop.shopId, barberId: shop.blake, now: NOW });

    const catalog = await engine.getShopCatalog(shop.slug, NOW);
    expect(catalog?.barbers.map((b) => b.displayName)).toEqual(["Alex"]);
    // Blake's login no longer reaches the Shop.
    await expectCode(admin.addBarber({ userId: barberUser, shopId: shop.shopId, displayName: "X" }), "FORBIDDEN");
  });

  it("a removed Barber frees a place under the limit", async () => {
    for (const name of ["Cam", "Dee", "Eli", "Fin"]) {
      await admin.addBarber({ userId: owner, shopId: shop.shopId, displayName: name });
    }
    await admin.removeBarber({ userId: owner, shopId: shop.shopId, barberId: shop.alex, now: NOW });
    await expect(admin.addBarber({ userId: owner, shopId: shop.shopId, displayName: "Gus" })).resolves.toBeTruthy();
  });

  it("only the Owner adds Barbers", async () => {
    await expectCode(admin.addBarber({ userId: barberUser, shopId: shop.shopId, displayName: "Cam" }), "FORBIDDEN");
  });
});

describe("Services and prices", () => {
  const catalog = (now = NOW) => engine.getShopCatalog(shop.slug, now).then((c) => c!);

  it("an Owner adds a Service with a price per Barber, and Clients see it", async () => {
    const { serviceId } = await admin.saveService({
      userId: owner,
      shopId: shop.shopId,
      nameEn: "Line up",
      nameEs: "Perfilado",
      durationMin: 15,
      bufferMin: 0,
    });
    await admin.setBarberPrice({ userId: owner, shopId: shop.shopId, barberId: shop.alex, serviceId, priceCents: 1500 });
    await admin.setBarberPrice({ userId: owner, shopId: shop.shopId, barberId: shop.blake, serviceId, priceCents: 2000 });

    const c = await catalog();
    expect(c.services.find((s) => s.id === serviceId)).toMatchObject({
      nameEs: "Perfilado",
      durationMin: 15,
      fromPriceCents: 1500,
      pricesVary: true,
    });
  });

  it("a special price shows until its end date, then the regular price is back", async () => {
    const endsAt = new Date(NOW.getTime() + 3 * 24 * 60 * 60_000);
    await admin.setSpecialPrice({ userId: owner, shopId: shop.shopId, serviceId: shop.cut, specialPriceCents: 2000, endsAt });

    const during = (await catalog()).services.find((s) => s.id === shop.cut)!;
    expect(during).toMatchObject({ fromPriceCents: 2000, regularPriceCents: 3000, specialEndsAt: endsAt.toISOString() });
    const after = (await catalog(new Date(endsAt.getTime() + 1))).services.find((s) => s.id === shop.cut)!;
    expect(after).toMatchObject({ fromPriceCents: 3000, specialEndsAt: null });
  });

  it("an archived Service disappears from the booking page", async () => {
    await admin.archiveService({ userId: owner, shopId: shop.shopId, serviceId: shop.fade });
    expect((await catalog()).services.map((s) => s.id)).toEqual([shop.cut]);
  });

  it("rejects a duration off the 15-minute grid", async () => {
    await expectCode(
      admin.saveService({ userId: owner, shopId: shop.shopId, nameEn: "X", nameEs: "X", durationMin: 20, bufferMin: 0 }),
      "INVALID_INPUT",
    );
  });

  it("a Barber cannot change prices or Services", async () => {
    const as = { userId: barberUser, shopId: shop.shopId };
    await expectCode(admin.setBarberPrice({ ...as, barberId: shop.blake, serviceId: shop.cut, priceCents: 1 }), "FORBIDDEN");
    await expectCode(admin.setSpecialPrice({ ...as, serviceId: shop.cut, specialPriceCents: 1, endsAt: NOW }), "FORBIDDEN");
    await expectCode(admin.archiveService({ ...as, serviceId: shop.cut }), "FORBIDDEN");
  });
});

describe("hours, closed days and the cutoff", () => {
  const times = async (barberId: string) =>
    (await engine.getAvailability({ shopId: shop.shopId, serviceId: shop.cut, barberId, date: TOMORROW, now: NOW })).slots.map(
      (s) => s.time,
    );
  const TUESDAY = 2; // TOMORROW (2027-01-12) is a Tuesday; 0 = Sunday

  it("a Barber sets their own week; days left out are closed", async () => {
    await admin.setWeeklyHours({
      userId: barberUser,
      shopId: shop.shopId,
      barberId: shop.blake,
      days: [{ weekday: TUESDAY, start: "15:00", end: "16:00" }],
    });
    expect(await times(shop.blake)).toEqual(["15:00", "15:15", "15:30"]);

    await admin.setWeeklyHours({ userId: barberUser, shopId: shop.shopId, barberId: shop.blake, days: [] });
    expect(await times(shop.blake)).toEqual([]);
  });

  it("a Barber cannot set another Barber's hours, but the Owner can", async () => {
    const week = [{ weekday: TUESDAY, start: "09:00", end: "10:00", breakStart: null, breakEnd: null }];
    await expectCode(
      admin.setWeeklyHours({ userId: barberUser, shopId: shop.shopId, barberId: shop.alex, days: week }),
      "FORBIDDEN",
    );
    await admin.setWeeklyHours({ userId: owner, shopId: shop.shopId, barberId: shop.alex, days: week });
    expect(await times(shop.alex)).toEqual(["09:00", "09:15", "09:30"]);
  });

  it("rejects hours off the 15-minute grid or a break outside the day", async () => {
    const set = (day: { weekday: number; start: string; end: string; breakStart?: string; breakEnd?: string }) =>
      admin.setWeeklyHours({ userId: owner, shopId: shop.shopId, barberId: shop.alex, days: [day] });
    await expectCode(set({ weekday: TUESDAY, start: "09:10", end: "17:00" }), "INVALID_INPUT");
    await expectCode(set({ weekday: TUESDAY, start: "09:00", end: "12:00", breakStart: "12:00", breakEnd: "13:00" }), "INVALID_INPUT");
  });

  it("an Owner reopens a closed day and a Barber removes their own day off", async () => {
    await engine.addShopClosedDay({ userId: owner, shopId: shop.shopId, date: TOMORROW });
    await engine.addBarberDayOff({ userId: barberUser, shopId: shop.shopId, barberId: shop.blake, date: TOMORROW });
    expect(await times(shop.alex)).toEqual([]);

    await admin.removeShopClosedDay({ userId: owner, shopId: shop.shopId, date: TOMORROW });
    expect((await times(shop.alex)).length).toBeGreaterThan(0);
    expect(await times(shop.blake)).toEqual([]);

    await admin.removeBarberDayOff({ userId: barberUser, shopId: shop.shopId, barberId: shop.blake, date: TOMORROW });
    expect((await times(shop.blake)).length).toBeGreaterThan(0);
  });

  it("warns the Owner when the cutoff is longer than the 2-hour reminder", async () => {
    expect(await admin.setCancelCutoff({ userId: owner, shopId: shop.shopId, minutes: 120 })).toEqual({ warning: null });
    expect(await admin.setCancelCutoff({ userId: owner, shopId: shop.shopId, minutes: 180 })).toEqual({
      warning: "REMINDER_AFTER_CUTOFF",
    });
    expect((await engine.getShopCatalog(shop.slug, NOW))!.shop.cancelCutoffMinutes).toBe(180);
    await expectCode(admin.setCancelCutoff({ userId: barberUser, shopId: shop.shopId, minutes: 0 }), "FORBIDDEN");
  });
});

describe("blocklist", () => {
  it("a blocked phone cannot book until the Owner unblocks it", async () => {
    const phone = uniquePhone();
    await admin.blockPhone({ userId: owner, shopId: shop.shopId, phone });
    await expectCode(book(shop, { client: { name: "Trouble", phone } }), "PHONE_BLOCKED");
    expect(await admin.listBlocked({ userId: owner, shopId: shop.shopId })).toEqual([
      expect.objectContaining({ phone }),
    ]);

    await admin.unblockPhone({ userId: owner, shopId: shop.shopId, phone });
    await expect(book(shop, { client: { name: "Trouble", phone } })).resolves.toBeTruthy();
  });

  it("accepts the phone the way people type it", async () => {
    await admin.blockPhone({ userId: owner, shopId: shop.shopId, phone: "(718) 555-0199" });
    await expectCode(book(shop, { client: { name: "T", phone: "+17185550199" } }), "PHONE_BLOCKED");
  });

  it("only the Owner manages the blocklist", async () => {
    await expectCode(admin.blockPhone({ userId: barberUser, shopId: shop.shopId, phone: uniquePhone() }), "FORBIDDEN");
  });
});

describe("Barber profile", () => {
  const profileOf = async (barberId: string) =>
    (await engine.getShopCatalog(shop.slug, NOW))!.barbers.find((b) => b.id === barberId)!;

  it("a Barber edits their own photo, bio, specialties and gallery", async () => {
    const as = { userId: barberUser, shopId: shop.shopId, barberId: shop.blake };
    await admin.updateBarberProfile({
      ...as,
      displayName: "Blake B.",
      bio: "Fades and designs.",
      specialties: ["Fades", "Designs"],
      photoUrl: "https://example.com/blake.jpg",
    });
    await admin.setGallery({ ...as, urls: ["https://example.com/1.jpg", "https://example.com/2.jpg", "https://example.com/3.jpg"] });

    expect(await profileOf(shop.blake)).toMatchObject({
      displayName: "Blake B.",
      bio: "Fades and designs.",
      specialties: ["Fades", "Designs"],
      photoUrl: "https://example.com/blake.jpg",
      gallery: ["https://example.com/1.jpg", "https://example.com/2.jpg", "https://example.com/3.jpg"],
    });
  });

  it("a gallery holds at most 6 photos, and only https links", async () => {
    const as = { userId: barberUser, shopId: shop.shopId, barberId: shop.blake };
    const seven = Array.from({ length: 7 }, (_, i) => `https://example.com/${i}.jpg`);
    await expectCode(admin.setGallery({ ...as, urls: seven }), "INVALID_INPUT");
    await expectCode(admin.setGallery({ ...as, urls: ["javascript:alert(1)"] }), "INVALID_INPUT");
  });

  it("a Barber cannot edit another Barber's profile", async () => {
    await expectCode(
      admin.updateBarberProfile({ userId: barberUser, shopId: shop.shopId, barberId: shop.alex, displayName: "X", bio: "", specialties: [], photoUrl: null }),
      "FORBIDDEN",
    );
  });
});

describe("reports", () => {
  beforeEach(async () => {
    // Recorded by a Platform admin at the install visit (B6); 4 minutes per phone booking.
    await sql`update public.shops set manual_booking_minutes = 4 where id = ${shop.shopId}`;
  });

  it("counts Bookings per week and the time they saved, in New York weeks", async () => {
    const lastWeek = new Date(NOW.getTime() - 7 * 24 * 60 * 60_000);
    await book(shop, { startsAt: at("2027-01-05", 10), now: lastWeek }); // previous week (Tuesday)
    await book(shop, { startsAt: at(TOMORROW, 10) });
    await book(shop, { startsAt: at(TOMORROW, 11) });
    await book(shop, { startsAt: at(TOMORROW, 12), barberId: shop.blake });
    const { booking: gone, manageToken } = await book(shop, { startsAt: at(TOMORROW, 15) });
    await engine.cancelBooking({ bookingId: gone.id, actor: { kind: "client", token: manageToken }, now: NOW });
    await engine.logWalkIn({ userId: owner, shopId: shop.shopId, barberId: shop.blake, serviceId: shop.cut, startsAt: at(TOMORROW, 16), now: at(TOMORROW, 16) });

    expect(await reports.weeklyStats({ userId: owner, shopId: shop.shopId, weeks: 2, now: NOW })).toEqual([
      { weekStart: "2027-01-04", bookings: 1, walkIns: 0, noShows: 0, timeSavedMin: 4 },
      { weekStart: "2027-01-11", bookings: 3, walkIns: 1, noShows: 0, timeSavedMin: 12 },
    ]);
  });

  it("summarises one day for the Owner's daily email", async () => {
    const { booking } = await book(shop, { startsAt: at(TOMORROW, 10) });
    await book(shop, { startsAt: at(TOMORROW, 11) });
    await engine.setAttendance({ userId: owner, bookingId: booking.id, status: "no_show" });

    expect(await reports.dayStats({ userId: owner, shopId: shop.shopId, date: TOMORROW })).toEqual({
      date: TOMORROW,
      bookings: 2,
      walkIns: 0,
      noShows: 1,
      timeSavedMin: 8,
    });
  });

  it("a Barber cannot see the Shop's numbers", async () => {
    await expectCode(reports.weeklyStats({ userId: barberUser, shopId: shop.shopId, weeks: 4, now: NOW }), "FORBIDDEN");
  });
});

describe("client export", () => {
  it("exports every Client as a spreadsheet the Owner can open safely", async () => {
    await book(shop, { client: { name: 'Ana "Jr", Lopez', phone: "+17185550101" } });
    await book(shop, { client: { name: "=HYPERLINK(1)", phone: "+17185550102" }, startsAt: at(TOMORROW, 11) });

    const csv = await reports.exportClientsCsv({ userId: owner, shopId: shop.shopId });
    const lines = csv.trim().split(/\r\n/);
    expect(lines[0]).toBe("name,phone,bookings,last_booking,texts_opted_out,blocked");
    expect(lines).toContain('"Ana ""Jr"", Lopez",+17185550101,1,2027-01-12,no,no');
    // A name starting with "=" must not run as a spreadsheet formula.
    expect(lines).toContain("'=HYPERLINK(1),+17185550102,1,2027-01-12,no,no");
    await expectCode(reports.exportClientsCsv({ userId: barberUser, shopId: shop.shopId }), "FORBIDDEN");
  });
});

describe("Barber logins", () => {
  it("an Owner connects a new Barber to their login, and that Barber can then manage their own hours", async () => {
    const { barberId } = await admin.addBarber({ userId: owner, shopId: shop.shopId, displayName: "Cam" });
    const cam = await makeUser(shop.shopId, "barber"); // the invited account, not yet tied to a Barber
    await sql`delete from public.shop_members where user_id = ${cam}`;

    await admin.linkBarberLogin({ userId: owner, shopId: shop.shopId, barberId, loginUserId: cam });
    await expect(
      admin.setWeeklyHours({ userId: cam, shopId: shop.shopId, barberId, days: [{ weekday: 2, start: "09:00", end: "10:00" }] }),
    ).resolves.toBeUndefined();
    await expectCode(
      admin.setWeeklyHours({ userId: cam, shopId: shop.shopId, barberId: shop.alex, days: [] }),
      "FORBIDDEN",
    );
  });

  it("connecting a new login to a Barber takes access away from the old one", async () => {
    const newLogin = await makeUser(shop.shopId, "barber");
    await sql`delete from public.shop_members where user_id = ${newLogin}`;

    await admin.linkBarberLogin({ userId: owner, shopId: shop.shopId, barberId: shop.blake, loginUserId: newLogin });
    // Blake's previous login (barberUser) is no longer part of the Shop at all.
    expect(await staffRole(sql, barberUser, shop.shopId)).toBeNull();
    expect(await staffRole(sql, newLogin, shop.shopId)).toEqual({ owner: false, barberId: shop.blake });
  });

  it("only the Owner connects logins", async () => {
    const other = await makeUser(shop.shopId, "barber");
    await expectCode(
      admin.linkBarberLogin({ userId: barberUser, shopId: shop.shopId, barberId: shop.alex, loginUserId: other }),
      "FORBIDDEN",
    );
  });
});
