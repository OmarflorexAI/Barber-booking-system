import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { isBookingError } from "@/server/booking-engine";
import { createReporting } from "@/server/reporting";
import { createShopAdmin, normalizeInstagram } from "@/server/shop-admin";
import {
  at,
  book,
  dropShop,
  dropUser,
  engine,
  makeLoneUser,
  makeShop,
  makeUser,
  NOW,
  sql,
  TOMORROW,
  uniquePhone,
  type TestShop,
} from "./fixtures";

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

  it("deleting a Barber waits until their upcoming Bookings are cancelled or moved", async () => {
    const { booking } = await book(shop, { barberId: shop.blake });
    await expectCode(
      admin.deleteBarber({ userId: owner, shopId: shop.shopId, barberId: shop.blake, now: NOW }),
      "BARBER_HAS_BOOKINGS",
    );
    const upcoming = await admin.upcomingForBarber({ userId: owner, shopId: shop.shopId, barberId: shop.blake, now: NOW });
    expect(upcoming).toEqual([
      expect.objectContaining({
        bookingId: booking.id,
        startsAt: at(TOMORROW, 10).toISOString(),
        kind: "booking",
        status: "confirmed",
        clientName: "Test Client",
        serviceNameEn: "Cut",
        serviceNameEs: "Cut",
      }),
    ]);

    await engine.cancelBooking({ bookingId: booking.id, actor: { kind: "staff", userId: owner }, now: NOW });
    expect(await admin.upcomingForBarber({ userId: owner, shopId: shop.shopId, barberId: shop.blake, now: NOW })).toEqual([]);
    const result = await admin.deleteBarber({ userId: owner, shopId: shop.shopId, barberId: shop.blake, now: NOW });
    expect(result.loginUserId).toBe(barberUser);

    const catalog = await engine.getShopCatalog(shop.slug, NOW);
    expect(catalog?.barbers.map((b) => b.displayName)).toEqual(["Alex"]);
    // Blake's login no longer reaches the Shop.
    await expectCode(admin.addBarber({ userId: barberUser, shopId: shop.shopId, displayName: "X" }), "FORBIDDEN");
  });

  it("deleting a Barber removes their past Bookings, gallery and prices, and returns their photos", async () => {
    // A past Booking: made "yesterday" relative to a clock a day earlier.
    const earlier = new Date(NOW.getTime() - 2 * 24 * 60 * 60_000);
    const { booking } = await book(shop, { barberId: shop.blake, startsAt: at("2027-01-10", 10), now: earlier });
    const photo = "https://example.com/blake.webp";
    await admin.updateBarberProfile({
      userId: owner, shopId: shop.shopId, barberId: shop.blake, displayName: "Blake", bio: "", specialties: [], photoUrl: photo,
    });
    await admin.setGallery({ userId: owner, shopId: shop.shopId, barberId: shop.blake, urls: ["https://example.com/g1.webp"] });

    const result = await admin.deleteBarber({ userId: owner, shopId: shop.shopId, barberId: shop.blake, now: NOW });
    expect(result.photoUrls).toEqual([photo, "https://example.com/g1.webp"]);

    const [{ bookings, gallery, prices, hours, barbers }] = await sql<
      { bookings: number; gallery: number; prices: number; hours: number; barbers: number }[]
    >`
      select (select count(*)::int from public.bookings where id = ${booking.id}) bookings,
             (select count(*)::int from public.barber_gallery where barber_id = ${shop.blake}) gallery,
             (select count(*)::int from public.barber_services where barber_id = ${shop.blake}) prices,
             (select count(*)::int from public.weekly_hours where barber_id = ${shop.blake}) hours,
             (select count(*)::int from public.barbers where id = ${shop.blake}) barbers
    `;
    expect({ bookings, gallery, prices, hours, barbers }).toEqual({ bookings: 0, gallery: 0, prices: 0, hours: 0, barbers: 0 });
  });

  it("an Owner can't delete their own Barber profile", async () => {
    await sql`update public.barbers set user_id = ${owner} where id = ${shop.alex}`;
    await expectCode(admin.deleteBarber({ userId: owner, shopId: shop.shopId, barberId: shop.alex, now: NOW }), "OWN_BARBER");
  });

  it("a Barber edits their own profile but not the Owner-only phone (Q27)", async () => {
    const own = { userId: barberUser, shopId: shop.shopId, barberId: shop.blake, displayName: "Blake", bio: "Fades", specialties: [], photoUrl: null };
    await admin.updateBarberProfile(own);
    await expectCode(admin.updateBarberProfile({ ...own, phone: "+12125550123" }), "FORBIDDEN");
    await expectCode(admin.updateBarberProfile({ ...own, phone: null }), "FORBIDDEN");
    const [b] = await sql<{ bio: string }[]>`select bio from public.barbers where id = ${shop.blake}`;
    expect(b.bio).toBe("Fades");
  });

  it("only this Shop's Owner deletes a Barber or lists their upcoming Bookings", async () => {
    const other = await makeShop();
    try {
      const otherOwner = await makeUser(other.shopId, "owner");
      await expectCode(admin.deleteBarber({ userId: otherOwner, shopId: shop.shopId, barberId: shop.alex, now: NOW }), "FORBIDDEN");
      await expectCode(admin.upcomingForBarber({ userId: otherOwner, shopId: shop.shopId, barberId: shop.alex, now: NOW }), "FORBIDDEN");
    } finally {
      await dropShop(other);
    }
    await expectCode(admin.deleteBarber({ userId: barberUser, shopId: shop.shopId, barberId: shop.alex, now: NOW }), "FORBIDDEN");
    await expectCode(admin.upcomingForBarber({ userId: barberUser, shopId: shop.shopId, barberId: shop.blake, now: NOW }), "FORBIDDEN");
  });

  it("a Barber's phone is stored in E.164 and a bad one is refused", async () => {
    const { barberId } = await admin.addBarber({ userId: owner, shopId: shop.shopId, displayName: "Cam", phone: "(718) 555-0100" });
    const [b] = await sql<{ phone_e164: string | null }[]>`select phone_e164 from public.barbers where id = ${barberId}`;
    expect(b.phone_e164).toBe("+17185550100");
    await expectCode(admin.addBarber({ userId: owner, shopId: shop.shopId, displayName: "Dee", phone: "123" }), "INVALID_INPUT");
  });

  it("a deleted Barber frees a place under the limit", async () => {
    for (const name of ["Cam", "Dee", "Eli", "Fin"]) {
      await admin.addBarber({ userId: owner, shopId: shop.shopId, displayName: name });
    }
    await admin.deleteBarber({ userId: owner, shopId: shop.shopId, barberId: shop.alex, now: NOW });
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

  it("an Owner reorders the Services and Clients see the new order", async () => {
    await admin.reorderServices({ userId: owner, shopId: shop.shopId, serviceIds: [shop.fade, shop.cut] });
    expect((await catalog()).services.map((s) => s.id)).toEqual([shop.fade, shop.cut]);
    const rows = await sql<{ id: string; sort_order: number }[]>`
      select id, sort_order from public.services where shop_id = ${shop.shopId} order by sort_order`;
    expect(rows).toEqual([
      { id: shop.fade, sort_order: 0 },
      { id: shop.cut, sort_order: 1 },
    ]);
  });

  it("only this Shop's Owner reorders its Services", async () => {
    const other = await makeShop();
    try {
      const otherOwner = await makeUser(other.shopId, "owner");
      await expectCode(
        admin.reorderServices({ userId: otherOwner, shopId: shop.shopId, serviceIds: [shop.fade, shop.cut] }),
        "FORBIDDEN",
      );
      await expectCode(
        admin.reorderServices({ userId: barberUser, shopId: shop.shopId, serviceIds: [shop.fade, shop.cut] }),
        "FORBIDDEN",
      );
      // Another Shop's Service in the list, a partial list, a repeat or an archived one: all refused.
      const as = { userId: owner, shopId: shop.shopId };
      await expectCode(admin.reorderServices({ ...as, serviceIds: [shop.fade, other.cut] }), "INVALID_INPUT");
      await expectCode(admin.reorderServices({ ...as, serviceIds: [shop.fade] }), "INVALID_INPUT");
      await expectCode(admin.reorderServices({ ...as, serviceIds: [shop.fade, shop.fade] }), "INVALID_INPUT");
      await expectCode(admin.reorderServices({ ...as, serviceIds: [shop.fade, shop.cut, other.fade] }), "INVALID_INPUT");
      await admin.archiveService({ ...as, serviceId: shop.cut });
      await expectCode(admin.reorderServices({ ...as, serviceIds: [shop.cut, shop.fade] }), "INVALID_INPUT");
      await expect(admin.reorderServices({ ...as, serviceIds: [shop.fade] })).resolves.toBeUndefined();
      // Nothing changed in the other Shop.
      const otherRows = await sql<{ sort_order: number }[]>`select sort_order from public.services where shop_id = ${other.shopId}`;
      expect(otherRows.map((r) => r.sort_order)).toEqual([0, 0]);
    } finally {
      await dropShop(other);
    }
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

  it("saves the Spanish bio and an Instagram handle, typed with or without @", async () => {
    const as = { userId: owner, shopId: shop.shopId, barberId: shop.blake, displayName: "Blake", specialties: [], photoUrl: null };
    await admin.updateBarberProfile({ ...as, bio: "Fades.", bioEs: " Degradados. ", instagram: "@fresh.cuts" });
    expect(await profileOf(shop.blake)).toMatchObject({ bio: "Fades.", bioEs: "Degradados.", instagram: "fresh.cuts" });

    await admin.updateBarberProfile({ ...as, bio: "Fades.", instagram: "blake_cuts" });
    expect(await profileOf(shop.blake)).toMatchObject({ bioEs: "Degradados.", instagram: "blake_cuts" });

    await admin.updateBarberProfile({ ...as, bio: "Fades.", instagram: null });
    expect((await profileOf(shop.blake)).instagram).toBeNull();
  });

  it("leaves the Spanish bio, Instagram and phone alone when they are left out", async () => {
    const as = { userId: owner, shopId: shop.shopId, barberId: shop.blake, displayName: "Blake", specialties: [], photoUrl: null };
    await admin.updateBarberProfile({ ...as, bio: "", bioEs: "Hola.", instagram: "blake", phone: "(718) 555-0123" });
    await admin.updateBarberProfile({ ...as, bio: "Hello." });
    const [row] = await sql<{ bio: string; bio_es: string; instagram: string | null; phone_e164: string | null }[]>`
      select bio, bio_es, instagram, phone_e164 from public.barbers where id = ${shop.blake}
    `;
    expect(row).toEqual({ bio: "Hello.", bio_es: "Hola.", instagram: "blake", phone_e164: "+17185550123" });
  });

  it("refuses an Instagram URL, spaces or a handle over 30 characters", async () => {
    const as = { userId: owner, shopId: shop.shopId, barberId: shop.blake, displayName: "Blake", bio: "", specialties: [], photoUrl: null };
    for (const bad of ["https://instagram.com/x", "a b", "a".repeat(31)]) {
      await expectCode(admin.updateBarberProfile({ ...as, instagram: bad }), "INVALID_INPUT");
    }
    await expectCode(admin.updateBarberProfile({ ...as, bioEs: "x".repeat(501) }), "INVALID_INPUT");
  });

  it("normalizeInstagram strips @ and clears blanks", () => {
    expect(normalizeInstagram("@fresh.cuts")).toBe("fresh.cuts");
    expect(normalizeInstagram("name")).toBe("name");
    expect(normalizeInstagram("a".repeat(30))).toBe("a".repeat(30));
    expect(normalizeInstagram("a".repeat(31))).toBe("invalid");
    expect(normalizeInstagram("https://instagram.com/x")).toBe("invalid");
    expect(normalizeInstagram("a b")).toBe("invalid");
    expect(normalizeInstagram("@")).toBe("invalid");
    expect(normalizeInstagram("  ")).toBeNull();
    expect(normalizeInstagram(null)).toBeNull();
  });

  it("a Barber edits their own Spanish bio and Instagram", async () => {
    await admin.updateBarberProfile({
      userId: barberUser, shopId: shop.shopId, barberId: shop.blake, displayName: "Blake", bio: "", bioEs: "Diseños.", specialties: [], photoUrl: null, instagram: "blake",
    });
    expect(await profileOf(shop.blake)).toMatchObject({ bioEs: "Diseños.", instagram: "blake" });
  });

  it("the public catalog never carries a Barber's phone", async () => {
    const phone = uniquePhone();
    await admin.updateBarberProfile({
      userId: owner, shopId: shop.shopId, barberId: shop.blake, displayName: "Blake", bio: "", specialties: [], photoUrl: null, phone,
    });
    const catalog = (await engine.getShopCatalog(shop.slug, NOW))!;
    for (const b of catalog.barbers) {
      expect(Object.keys(b)).toEqual(expect.arrayContaining(["bio", "bioEs", "instagram"]));
      expect(Object.keys(b).some((k) => /phone/i.test(k))).toBe(false);
    }
    expect(JSON.stringify(catalog)).not.toContain(phone.slice(-7));
  });

  it("the Owner saves a Barber's alert email trimmed and lowercased, keeps it when left out, and clears it", async () => {
    const as = { userId: owner, shopId: shop.shopId, barberId: shop.blake, displayName: "Blake", bio: "", specialties: [], photoUrl: null };
    const emailOf = async () =>
      (await sql<{ email: string | null }[]>`select email from public.barbers where id = ${shop.blake}`)[0].email;
    await admin.updateBarberProfile({ ...as, email: "  Blake.Cuts@Example.COM " });
    expect(await emailOf()).toBe("blake.cuts@example.com");
    await admin.updateBarberProfile({ ...as });
    expect(await emailOf()).toBe("blake.cuts@example.com");
    await admin.updateBarberProfile({ ...as, email: "  " });
    expect(await emailOf()).toBeNull();
    await admin.updateBarberProfile({ ...as, email: "blake@example.com" });
    await admin.updateBarberProfile({ ...as, email: null });
    expect(await emailOf()).toBeNull();
  });

  it("refuses an alert email that isn't one", async () => {
    const as = { userId: owner, shopId: shop.shopId, barberId: shop.blake, displayName: "Blake", bio: "", specialties: [], photoUrl: null };
    for (const bad of ["blake", "blake@", "blake@example", "a b@example.com", `${"a".repeat(250)}@x.com`]) {
      await expectCode(admin.updateBarberProfile({ ...as, email: bad }), "INVALID_EMAIL");
    }
  });

  it("only the Owner sets a Barber's alert email, and the public catalog never carries it", async () => {
    await expectCode(
      admin.updateBarberProfile({
        userId: barberUser, shopId: shop.shopId, barberId: shop.blake, displayName: "Blake", bio: "", specialties: [], photoUrl: null, email: "me@example.com",
      }),
      "FORBIDDEN",
    );
    await admin.updateBarberProfile({
      userId: owner, shopId: shop.shopId, barberId: shop.blake, displayName: "Blake", bio: "", specialties: [], photoUrl: null, email: "secret-blake@example.com",
    });
    const catalog = (await engine.getShopCatalog(shop.slug, NOW))!;
    expect(JSON.stringify(catalog)).not.toContain("secret-blake");
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
    await expectCode(reports.dashboardWeek({ userId: barberUser, shopId: shop.shopId, weekStart: "2027-01-11" }), "FORBIDDEN");
  });
});

describe("the Owner Dashboard week", () => {
  const dashboard = (weekStart: string) => reports.dashboardWeek({ userId: owner, shopId: shop.shopId, weekStart });
  /** Moves a Booking to a wall-clock time the Shop's hours would not offer (late Sunday night). */
  const moveTo = (bookingId: string, startsAt: Date) => sql`
    update public.bookings
    set starts_at = ${startsAt}, ends_at = ${startsAt}::timestamptz + interval '30 minutes', blocked_until = ${startsAt}::timestamptz + interval '30 minutes'
    where id = ${bookingId}
  `;

  beforeEach(async () => {
    await sql`update public.shops set manual_booking_minutes = 4 where id = ${shop.shopId}`;
  });

  it("totals the week and the week before, per day and per Barber", async () => {
    const lastWeek = new Date(NOW.getTime() - 7 * 24 * 60 * 60_000);
    await book(shop, { startsAt: at("2027-01-05", 10), now: lastWeek }); // previous week
    const { booking: missed } = await book(shop, { startsAt: at(TOMORROW, 10) });
    await engine.setAttendance({ userId: owner, bookingId: missed.id, status: "no_show" }); // still a Booking
    await book(shop, { startsAt: at(TOMORROW, 11) });
    await book(shop, { startsAt: at("2027-01-14", 12), barberId: shop.blake });
    await book(shop, { startsAt: at("2027-01-17", 10) }); // Sunday
    await book(shop, { startsAt: at("2027-01-18", 10) }); // next week: not counted
    const { booking: gone, manageToken } = await book(shop, { startsAt: at(TOMORROW, 15) });
    await engine.cancelBooking({ bookingId: gone.id, actor: { kind: "client", token: manageToken }, now: NOW });
    await engine.logWalkIn({ userId: owner, shopId: shop.shopId, barberId: shop.blake, serviceId: shop.cut, startsAt: at(TOMORROW, 16), now: at(TOMORROW, 16) });
    const [cam] = await sql<{ id: string }[]>`
      insert into public.barbers (shop_id, display_name, sort_order, photo_url) values (${shop.shopId}, 'Cam', 2, 'https://img.test/cam.jpg') returning id
    `;
    await sql`insert into public.barbers (shop_id, display_name, sort_order, active) values (${shop.shopId}, 'Gone', 3, false)`;

    const week = await dashboard("2027-01-11");
    expect(week.totals).toEqual({ bookings: 4, walkIns: 1, noShows: 1, timeSavedMin: 16 });
    expect(week.previous).toEqual({ bookings: 1, walkIns: 0, noShows: 0, timeSavedMin: 4 });
    expect(week.days.map(({ date, bookings, walkIns }) => ({ date, bookings, walkIns }))).toEqual([
      { date: "2027-01-11", bookings: 0, walkIns: 0 },
      { date: "2027-01-12", bookings: 2, walkIns: 1 },
      { date: "2027-01-13", bookings: 0, walkIns: 0 },
      { date: "2027-01-14", bookings: 1, walkIns: 0 },
      { date: "2027-01-15", bookings: 0, walkIns: 0 },
      { date: "2027-01-16", bookings: 0, walkIns: 0 },
      { date: "2027-01-17", bookings: 1, walkIns: 0 },
    ]);
    expect(week.barbers).toEqual([
      { barberId: shop.alex, name: "Alex", photoUrl: null, bookings: 3, walkIns: 0, noShows: 1, days: [0, 2, 0, 0, 0, 0, 1] },
      { barberId: shop.blake, name: "Blake", photoUrl: null, bookings: 1, walkIns: 1, noShows: 0, days: [0, 0, 0, 1, 0, 0, 0] },
      { barberId: cam.id, name: "Cam", photoUrl: "https://img.test/cam.jpg", bookings: 0, walkIns: 0, noShows: 0, days: [0, 0, 0, 0, 0, 0, 0] },
    ]);

    // Drill-down for Tuesday: per Barber (every active one, zeros too) and per local hour.
    // The fixture Barbers work 09:00-17:00 and Cam has no hours, so the span is 9..16.
    expect(week.hours).toEqual({ first: 9, last: 16 });
    const tue = week.days[1];
    expect(tue.noShows).toBe(1);
    expect(tue.timeSavedMin).toBe(8);
    expect(tue.byBarber).toEqual([
      { barberId: shop.alex, bookings: 2, walkIns: 0, noShows: 1 },
      { barberId: shop.blake, bookings: 0, walkIns: 1, noShows: 0 },
      { barberId: cam.id, bookings: 0, walkIns: 0, noShows: 0 },
    ]);
    expect(tue.byHour).toEqual([9, 10, 11, 12, 13, 14, 15, 16].map((hour) => ({
      hour,
      bookings: hour === 10 || hour === 11 ? 1 : 0,
      walkIns: hour === 16 ? 1 : 0,
    })));
    expect(week.days[0].byHour.every((h) => h.bookings === 0 && h.walkIns === 0)).toBe(true);
    expect(week.days[0].byHour).toHaveLength(8);
  });

  it("puts a late Sunday-night Booking on its New York day across the DST change", async () => {
    const before = at("2027-03-01", 9);
    // Sunday 2027-03-07 21:00 EST and Sunday 2027-03-14 22:30 EDT: both are Monday in UTC.
    const { booking: a } = await book(shop, { startsAt: at("2027-03-07", 10), now: before });
    await moveTo(a.id, at("2027-03-07", 21));
    const { booking: b } = await book(shop, { startsAt: at("2027-03-14", 10), now: before });
    await moveTo(b.id, at("2027-03-14", 22, 30));
    expect(at("2027-03-14", 22, 30).toISOString()).toBe("2027-03-15T02:30:00.000Z");

    const week = await dashboard("2027-03-08");
    expect(week.totals.bookings).toBe(1);
    expect(week.previous.bookings).toBe(1);
    expect(week.days[6]).toMatchObject({ date: "2027-03-14", bookings: 1, walkIns: 0, noShows: 0, timeSavedMin: 4 });
    expect(week.days.slice(0, 6).every((d) => d.bookings === 0)).toBe(true);
    // 22:30 EDT is hour 22 on the New York clock (02:30 UTC Monday), and widens the span.
    expect(week.hours).toEqual({ first: 9, last: 22 });
    expect(week.days[6].byHour.filter((h) => h.bookings > 0)).toEqual([{ hour: 22, bookings: 1, walkIns: 0 }]);
    expect(week.days[6].byBarber.find((b) => b.barberId === shop.alex)).toEqual({ barberId: shop.alex, bookings: 1, walkIns: 0, noShows: 0 });
    expect(week.barbers.find((b) => b.barberId === shop.alex)?.days).toEqual([0, 0, 0, 0, 0, 0, 1]);
    // The week before: 21:00 EST on Sunday 2027-03-07 is hour 21 there.
    const prev = await dashboard("2027-03-01");
    expect(prev.days[6].byHour.filter((h) => h.bookings > 0)).toEqual([{ hour: 21, bookings: 1, walkIns: 0 }]);
    expect((await dashboard("2027-03-15")).totals.bookings).toBe(0);
  });

  it("refuses a week that does not start on a Monday", async () => {
    await expectCode(dashboard("2027-01-12"), "INVALID_INPUT");
    await expectCode(dashboard("2027-02-30"), "INVALID_INPUT");
  });
});

describe("client export", () => {
  it("exports every Client as a spreadsheet the Owner can open safely", async () => {
    const { booking: ana } = await book(shop, { client: { name: 'Ana "Jr", Lopez', phone: "+17185550101" } });
    await sql`update public.bookings set status = 'no_show' where id = ${ana.id}`;
    await book(shop, { client: { name: "=HYPERLINK(1)", phone: "+17185550102" }, startsAt: at(TOMORROW, 11) });

    const csv = await reports.exportClientsCsv({ userId: owner, shopId: shop.shopId });
    const lines = csv.trim().split(/\r\n/);
    expect(lines[0]).toBe("name,phone,bookings,no_shows,last_booking,texts_opted_out,blocked");
    expect(lines).toContain('"Ana ""Jr"", Lopez",+17185550101,1,1,2027-01-12,no,no');
    // A name starting with "=" must not run as a spreadsheet formula.
    expect(lines).toContain("'=HYPERLINK(1),+17185550102,1,0,2027-01-12,no,no");
    await expectCode(reports.exportClientsCsv({ userId: barberUser, shopId: shop.shopId }), "FORBIDDEN");
  });
});

describe("Shop isolation", () => {
  /** Everything an Owner of `shop` could reach in `other` by passing its ids. */
  const snapshot = async (o: TestShop) => ({
    prices: await sql`
      select barber_id, service_id, price_cents, duration_override_min, special_price_cents, special_ends_at
      from public.barber_services where shop_id = ${o.shopId} order by barber_id, service_id
    `,
    barbers: await sql`
      select id, display_name, bio, specialties, photo_url, phone_e164, instagram
      from public.barbers where shop_id = ${o.shopId} order by id
    `,
    gallery: await sql`select barber_id, url, position from public.barber_gallery where shop_id = ${o.shopId} order by barber_id, position`,
    hours: await sql`select barber_id, weekday, start_time, end_time from public.weekly_hours where shop_id = ${o.shopId} order by barber_id, weekday`,
    daysOff: await sql`select barber_id, day from public.barber_time_off where shop_id = ${o.shopId} order by barber_id, day`,
  });

  it("an Owner cannot change another Shop's prices, profiles, gallery, hours or days off", async () => {
    const other = await makeShop();
    try {
      await sql`insert into public.barber_gallery (shop_id, barber_id, url, position) values (${other.shopId}, ${other.alex}, 'https://example.com/b.jpg', 0)`;
      await sql`insert into public.barber_time_off (shop_id, barber_id, day) values (${other.shopId}, ${other.alex}, '2027-01-20')`;
      const before = await snapshot(other);
      const as = { userId: owner, shopId: shop.shopId };

      // Prices: their Barber + their Service, or one of each with ours.
      for (const [barberId, serviceId] of [
        [other.alex, other.cut],
        [other.alex, shop.cut],
        [shop.alex, other.cut],
      ]) {
        await expectCode(admin.setBarberPrice({ ...as, barberId, serviceId, priceCents: 1 }), "NOT_FOUND");
        await expectCode(admin.removeBarberPrice({ ...as, barberId, serviceId }), "NOT_FOUND");
      }
      await expectCode(admin.setSpecialPrice({ ...as, serviceId: other.cut, specialPriceCents: 1, endsAt: TOMORROW_END }), "NOT_FOUND");
      await expectCode(
        admin.setSpecialPrice({ ...as, serviceId: shop.cut, barberId: other.alex, specialPriceCents: 1, endsAt: TOMORROW_END }),
        "NOT_FOUND",
      );

      const theirs = { ...as, barberId: other.alex };
      await expectCode(
        admin.updateBarberProfile({ ...theirs, displayName: "Hacked", bio: "", specialties: [], photoUrl: null, phone: null, instagram: null }),
        "NOT_FOUND",
      );
      await expectCode(admin.setGallery({ ...theirs, urls: [] }), "NOT_FOUND");
      await expectCode(admin.setWeeklyHours({ ...theirs, days: [] }), "NOT_FOUND");
      await expectCode(admin.removeBarberDayOff({ ...theirs, date: "2027-01-20" }), "NOT_FOUND");
      await expectCode(engine.addBarberDayOff({ ...theirs, date: "2027-01-21" }), "NOT_FOUND");
      // A garbage id is NOT_FOUND too, not a raw database error.
      await expectCode(admin.setGallery({ ...as, barberId: "not-a-uuid", urls: [] }), "NOT_FOUND");

      expect(await snapshot(other)).toEqual(before);
    } finally {
      await dropShop(other);
    }
  });

  it("a Barber acting on another Shop's Barber is refused", async () => {
    const other = await makeShop();
    try {
      await expectCode(
        admin.setWeeklyHours({ userId: barberUser, shopId: shop.shopId, barberId: other.alex, days: [] }),
        "FORBIDDEN",
      );
    } finally {
      await dropShop(other);
    }
  });
});

const TOMORROW_END = at(TOMORROW, 17);

describe("Shop profile (M5)", () => {
  const profile = {
    name: "  Fresh Cuts Uptown ",
    phone: "(718) 555-0142",
    address: " 123 Dyckman St, New York, NY ",
    aboutEn: " Fades and lineups since 2009. ",
    aboutEs: "",
    logoUrl: "https://example.com/logo.webp",
    coverUrl: "https://example.com/cover.webp",
  };

  it("the Owner updates name, phone, address, about, logo and cover; the slug stays; /b reads them", async () => {
    await admin.updateShopProfile({ userId: owner, shopId: shop.shopId, ...profile });
    expect(await admin.getShopProfile({ userId: owner, shopId: shop.shopId })).toEqual({
      slug: shop.slug,
      name: "Fresh Cuts Uptown",
      phone: "+17185550142",
      address: "123 Dyckman St, New York, NY",
      aboutEn: "Fades and lineups since 2009.",
      aboutEs: "",
      logoUrl: profile.logoUrl,
      coverUrl: profile.coverUrl,
    });
    const [row] = await sql<{ slug: string }[]>`select slug from public.shops where id = ${shop.shopId}`;
    expect(row.slug).toBe(shop.slug);

    const catalog = await engine.getShopCatalog(shop.slug, NOW);
    expect(catalog?.shop).toMatchObject({
      name: "Fresh Cuts Uptown",
      phone: "+17185550142",
      address: "123 Dyckman St, New York, NY",
      aboutEn: "Fades and lineups since 2009.",
      aboutEs: "",
      logoUrl: profile.logoUrl,
      coverUrl: profile.coverUrl,
    });

    // Blank phone and address clear them; null pictures remove them.
    await admin.updateShopProfile({ userId: owner, shopId: shop.shopId, ...profile, phone: " ", address: "", logoUrl: null, coverUrl: null });
    expect(await admin.getShopProfile({ userId: owner, shopId: shop.shopId })).toMatchObject({
      phone: null,
      address: null,
      logoUrl: null,
      coverUrl: null,
    });
  });

  it("a slug sent along is ignored", async () => {
    await admin.updateShopProfile({ userId: owner, shopId: shop.shopId, ...profile, slug: "stolen-slug" } as Parameters<
      typeof admin.updateShopProfile
    >[0]);
    const [row] = await sql<{ slug: string }[]>`select slug from public.shops where id = ${shop.shopId}`;
    expect(row.slug).toBe(shop.slug);
  });

  it("a stranger, a Barber of the Shop and another Shop's Owner are refused", async () => {
    const stranger = await makeLoneUser();
    const other = await makeShop();
    try {
      const otherOwner = await makeUser(other.shopId, "owner");
      for (const userId of [stranger, barberUser, otherOwner]) {
        await expectCode(admin.updateShopProfile({ userId, shopId: shop.shopId, ...profile, name: "Hacked" }), "FORBIDDEN");
        await expectCode(admin.getShopProfile({ userId, shopId: shop.shopId }), "FORBIDDEN");
      }
      const [row] = await sql<{ name: string }[]>`select name from public.shops where id = ${shop.shopId}`;
      expect(row.name).not.toBe("Hacked");
    } finally {
      await dropShop(other);
      await dropUser(stranger);
    }
  });

  it("refuses a bad phone, http or non-URL pictures, a blank name and over-long text", async () => {
    const as = { userId: owner, shopId: shop.shopId, ...profile };
    await expectCode(admin.updateShopProfile({ ...as, phone: "555-12" }), "INVALID_INPUT");
    await expectCode(admin.updateShopProfile({ ...as, logoUrl: "http://example.com/logo.webp" }), "INVALID_INPUT");
    await expectCode(admin.updateShopProfile({ ...as, coverUrl: "javascript:alert(1)" }), "INVALID_INPUT");
    await expectCode(admin.updateShopProfile({ ...as, name: "   " }), "INVALID_INPUT");
    await expectCode(admin.updateShopProfile({ ...as, name: "x".repeat(81) }), "INVALID_INPUT");
    await expectCode(admin.updateShopProfile({ ...as, address: "x".repeat(201) }), "INVALID_INPUT");
    await expectCode(admin.updateShopProfile({ ...as, aboutEs: "x".repeat(601) }), "INVALID_INPUT");
  });
});
