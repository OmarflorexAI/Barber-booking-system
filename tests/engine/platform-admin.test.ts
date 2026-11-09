import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { isBookingError } from "@/server/booking-engine";
import { staffRole } from "@/server/booking-engine/access";
import { createPlatformAdmin } from "@/server/platform-admin";
import { dropUser, engine, makeLoneUser, makePlatformAdmin, NOW, sql, TOMORROW } from "./fixtures";

/**
 * Platform admin (B6): our team sets up and supports Shops.
 * Real Postgres; every Shop a test creates is deleted afterwards.
 */
const platform = createPlatformAdmin(sql);

let adminUser: string;
let ownerLogin: string;
const shopIds: string[] = [];
const users: string[] = [];

beforeEach(async () => {
  adminUser = await makePlatformAdmin();
  ownerLogin = await makeLoneUser();
  users.push(adminUser, ownerLogin);
});
afterEach(async () => {
  if (shopIds.length) await sql`delete from public.shops where id in ${sql(shopIds.splice(0))}`;
  for (const u of users.splice(0)) await dropUser(u);
});
afterAll(async () => {
  await sql.end();
});

const errorCode = (e: unknown) => (isBookingError(e) ? e.code : String(e));
async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p.then(() => "resolved", errorCode)).resolves.toBe(code);
}

const slug = () => `test-${randomUUID().slice(0, 8)}`;
const tuesday = { weekday: 2, start: "09:00", end: "17:00", breakStart: "13:00", breakEnd: "14:00" };

async function newShop(over: Partial<Parameters<typeof platform.createShop>[0]> = {}) {
  const r = await platform.createShop({
    userId: adminUser,
    slug: slug(),
    name: "Kings Cuts",
    phone: "(718) 555-0100",
    address: "1 Fordham Rd, Bronx",
    manualBookingMinutes: 4,
    ownerUserId: ownerLogin,
    ownerBarberName: "Rafa",
    barbers: ["Tito"],
    services: [{ nameEn: "Haircut", nameEs: "Corte", durationMin: 30, priceCents: 2500 }],
    weeklyHours: [tuesday],
    ...over,
  });
  shopIds.push(r.shopId);
  return r;
}

describe("creating a Shop", () => {
  it("sets up a bookable Shop in one step: Owner, Barbers, Services and hours", async () => {
    const { shopId, slug: s } = await newShop();

    const catalog = (await engine.getShopCatalog(s, NOW))!;
    expect(catalog.shop).toMatchObject({ name: "Kings Cuts", phone: "+17185550100" });
    expect(catalog.barbers.map((b) => b.displayName)).toEqual(["Rafa", "Tito"]);
    expect(catalog.services).toEqual([expect.objectContaining({ nameEs: "Corte", fromPriceCents: 2500 })]);

    const slots = await engine.getAvailability({ shopId, serviceId: catalog.services[0].id, barberId: "any", date: TOMORROW, now: NOW });
    expect(slots.slots.length).toBeGreaterThan(0);

    // The Owner can sign in and run the Shop (and cut hair as Rafa).
    expect(await staffRole(sql, ownerLogin, shopId)).toEqual({ owner: true, barberId: catalog.barbers[0].id });
  });

  it("refuses a taken link name and more than 6 Barbers", async () => {
    const { slug: taken } = await newShop();
    const other = await makeLoneUser();
    users.push(other);
    await expectCode(newShop({ slug: taken, ownerUserId: other }), "SLUG_TAKEN");
    await expectCode(newShop({ barbers: ["A", "B", "C", "D", "E", "F"] }), "BARBER_LIMIT"); // + Rafa = 7
  });

  it("only Platform admins create Shops", async () => {
    await expectCode(newShop({ userId: ownerLogin }), "FORBIDDEN");
  });

  it("lists every Shop with what the admin needs to see at a glance", async () => {
    const { shopId } = await newShop();
    const list = await platform.listShops({ userId: adminUser, now: NOW });
    expect(list.find((s) => s.id === shopId)).toMatchObject({
      name: "Kings Cuts",
      status: "active",
      smsRegistration: "not_started",
      smsEnabled: false,
      billingStatus: "free_month",
      manualBookingMinutes: 4,
    });
  });
});

describe("importing a Shop's client list", () => {
  it("imports names and phones however they were typed, merging repeats and reporting bad rows", async () => {
    const { shopId } = await newShop();
    const csv = [
      "Name,Phone Number,Notes",
      "Ana Lopez,(718) 555-0101,regular",
      '"Perez, Juan",718.555.0102,',
      "Ana L.,+1 718 555 0101,same phone as line 2",
      "No Phone,,",
      "Bad Phone,12345,",
      "",
    ].join("\r\n");

    const r = await platform.importClients({ userId: adminUser, shopId, csv });
    expect(r).toEqual({
      imported: 2,
      alreadyThere: 1,
      rejected: [
        { line: 5, reason: "missing phone" },
        { line: 6, reason: "invalid phone" },
      ],
    });

    const again = await platform.importClients({ userId: adminUser, shopId, csv });
    expect(again).toMatchObject({ imported: 0, alreadyThere: 3 });
  });

  it("never unblocks a number the Owner blocked", async () => {
    const { shopId } = await newShop();
    await sql`insert into public.clients (shop_id, name, phone_e164, blocked) values (${shopId}, 'Trouble', '+17185550199', true)`;
    await platform.importClients({ userId: adminUser, shopId, csv: "name,phone\nTrouble Maker,7185550199\n" });
    const [c] = await sql`select blocked from public.clients where shop_id = ${shopId} and phone_e164 = '+17185550199'`;
    expect(c.blocked).toBe(true);
  });

  it("needs a name and a phone column", async () => {
    const { shopId } = await newShop();
    await expectCode(platform.importClients({ userId: adminUser, shopId, csv: "first,last\nA,B\n" }), "INVALID_INPUT");
    await expectCode(platform.importClients({ userId: ownerLogin, shopId, csv: "name,phone\n" }), "FORBIDDEN");
  });
});

describe("tracking a Shop's setup", () => {
  it("turns texting on only when the carrier registration is approved", async () => {
    const { shopId } = await newShop();
    const smsOf = async () => (await platform.listShops({ userId: adminUser, now: NOW })).find((s) => s.id === shopId)!;

    await platform.setSmsRegistration({ userId: adminUser, shopId, status: "submitted" });
    expect(await smsOf()).toMatchObject({ smsRegistration: "submitted", smsEnabled: false });
    await platform.setSmsRegistration({ userId: adminUser, shopId, status: "approved" });
    expect(await smsOf()).toMatchObject({ smsRegistration: "approved", smsEnabled: true });
    await platform.setSmsRegistration({ userId: adminUser, shopId, status: "rejected" });
    expect(await smsOf()).toMatchObject({ smsRegistration: "rejected", smsEnabled: false });
  });

  it("records billing status and the minutes each phone booking used to take", async () => {
    const { shopId } = await newShop();
    await platform.setBillingStatus({ userId: adminUser, shopId, status: "paid" });
    await platform.setManualBookingMinutes({ userId: adminUser, shopId, minutes: 6 });
    const s = (await platform.listShops({ userId: adminUser, now: NOW })).find((x) => x.id === shopId)!;
    expect(s).toMatchObject({ billingStatus: "paid", manualBookingMinutes: 6 });

    await expectCode(platform.setBillingStatus({ userId: adminUser, shopId, status: "free" as never }), "INVALID_INPUT");
    await expectCode(platform.setManualBookingMinutes({ userId: adminUser, shopId, minutes: 61 }), "INVALID_INPUT");
    await expectCode(platform.setBillingStatus({ userId: ownerLogin, shopId, status: "paid" }), "FORBIDDEN");
  });
});

describe("supporting a Shop", () => {
  it("logs every time we look inside a Shop, with the reason", async () => {
    const { shopId } = await newShop();
    await expectCode(platform.openSupportAccess({ userId: adminUser, shopId, reason: " " }), "INVALID_INPUT");
    await platform.openSupportAccess({ userId: adminUser, shopId, reason: "Owner called: hours look wrong" });

    const log = await platform.listSupportAccess({ userId: adminUser, shopId });
    expect(log).toEqual([
      expect.objectContaining({ shopId, adminUserId: adminUser, reason: "Owner called: hours look wrong" }),
    ]);
    await expectCode(platform.listSupportAccess({ userId: ownerLogin, shopId }), "FORBIDDEN");
  });

  it("shows failed messages across Shops and sends one again", async () => {
    const { shopId } = await newShop();
    const [row] = await sql<{ id: string }[]>`
      insert into public.outbox (shop_id, type, status, attempts, last_error)
      values (${shopId}, 'barber_alert', 'failed', 4, 'telegram down')
      returning id
    `;
    const list = await platform.listFailures({ userId: adminUser });
    expect(list.find((f) => f.id === row.id)).toMatchObject({
      shopId,
      shopName: "Kings Cuts",
      type: "barber_alert",
      attempts: 4,
      lastError: "telegram down",
    });

    await platform.retryFailure({ userId: adminUser, outboxId: row.id, now: NOW });
    const [after] = await sql`select status, attempts, next_attempt_at from public.outbox where id = ${row.id}`;
    expect(after).toMatchObject({ status: "pending", attempts: 0, next_attempt_at: NOW });
    expect((await platform.listFailures({ userId: adminUser })).some((f) => f.id === row.id)).toBe(false);

    await expectCode(platform.retryFailure({ userId: adminUser, outboxId: row.id, now: NOW }), "NOT_FOUND"); // no longer failed
  });
});

describe("cancelling a Shop", () => {
  it("closes the booking page at once and can be undone within 30 days", async () => {
    const { shopId, slug: s } = await newShop();
    await platform.cancelShop({ userId: adminUser, shopId, now: NOW });
    expect((await platform.listShops({ userId: adminUser, now: NOW })).find((x) => x.id === shopId)).toMatchObject({
      status: "cancelled",
      cancelledAt: NOW,
    });
    expect(await engine.getShopCatalog(s, NOW)).toBeNull();

    await platform.reactivateShop({ userId: adminUser, shopId });
    expect(await engine.getShopCatalog(s, NOW)).not.toBeNull();
  });

  it("deletes a cancelled Shop and its staff logins 30 days later, not before", async () => {
    const { shopId } = await newShop();
    await platform.cancelShop({ userId: adminUser, shopId, now: NOW });
    const day = 24 * 60 * 60_000;

    expect(await platform.purgeCancelledShops({ now: new Date(NOW.getTime() + 29 * day) })).toEqual({ shops: 0 });
    expect(await platform.purgeCancelledShops({ now: new Date(NOW.getTime() + 30 * day) })).toEqual({ shops: 1 });

    expect(await sql`select 1 from public.shops where id = ${shopId}`).toHaveLength(0);
    expect(await sql`select 1 from auth.users where id = ${ownerLogin}`).toHaveLength(0);
    expect(await sql`select 1 from auth.users where id = ${adminUser}`).toHaveLength(1); // admins stay
  });

  it("exports a Shop's clients for the Owner to keep, and logs that we did", async () => {
    const { shopId } = await newShop();
    await platform.importClients({ userId: adminUser, shopId, csv: "name,phone\nAna,7185550101\n" });
    const csv = await platform.exportClients({ userId: adminUser, shopId, reason: "Shop cancelled, owner wants their list" });
    expect(csv.split("\r\n")[1]).toBe("Ana,+17185550101,0,,no,no");
    expect((await platform.listSupportAccess({ userId: adminUser, shopId })).map((l) => l.reason)).toContain(
      "Shop cancelled, owner wants their list",
    );
  });
});

describe("review fixes", () => {
  it("never links the Owner's login to another Barber when the Owner doesn't cut hair", async () => {
    const { shopId } = await newShop({ ownerBarberName: "   " });
    expect(await staffRole(sql, ownerLogin, shopId)).toEqual({ owner: true, barberId: null });
  });

  it("cancelling twice keeps the first date, and only cancelled Shops can be reactivated", async () => {
    const { shopId } = await newShop();
    await expectCode(platform.reactivateShop({ userId: adminUser, shopId }), "INVALID_INPUT");
    await platform.cancelShop({ userId: adminUser, shopId, now: NOW });
    await platform.cancelShop({ userId: adminUser, shopId, now: new Date(NOW.getTime() + 86_400_000) });
    expect((await platform.listShops({ userId: adminUser, now: NOW })).find((s) => s.id === shopId)?.cancelledAt).toEqual(NOW);
  });

  it("reports an unknown Shop as not found", async () => {
    const shopId = randomUUID();
    await expectCode(platform.importClients({ userId: adminUser, shopId, csv: "name,phone\nA,7185550101\n" }), "NOT_FOUND");
    await expectCode(platform.openSupportAccess({ userId: adminUser, shopId, reason: "check" }), "NOT_FOUND");
  });

  it("logs a client import as support access", async () => {
    const { shopId } = await newShop();
    await platform.importClients({ userId: adminUser, shopId, csv: "name,phone\nA,7185550101\n" });
    expect(await platform.listSupportAccess({ userId: adminUser, shopId })).toEqual([
      expect.objectContaining({ reason: "Imported client list (1 new)" }),
    ]);
  });

  it("the deletion removes the Shop's bookings and clients and leaves other Shops alone", async () => {
    const gone = await newShop();
    const kept = await newShop({ ownerUserId: (users.push(await makeLoneUser()), users.at(-1)!) });
    for (const { shopId, slug: s } of [gone, kept]) {
      const c = (await engine.getShopCatalog(s, NOW))!;
      await engine.createBooking({
        shopId, serviceId: c.services[0].id, barberId: c.barbers[0].id, startsAt: new Date("2027-01-12T15:00:00Z"),
        client: { name: "Ana", phone: "7185550101" }, paymentMethod: "in_person", now: NOW,
      });
    }
    await platform.cancelShop({ userId: adminUser, shopId: gone.shopId, now: NOW });
    await platform.purgeCancelledShops({ now: new Date(NOW.getTime() + 31 * 86_400_000) });

    const count = async (shopId: string) =>
      (await sql`select (select count(*) from public.bookings where shop_id = ${shopId})::int as b,
                        (select count(*) from public.clients where shop_id = ${shopId})::int as c`)[0];
    expect(await count(gone.shopId)).toEqual({ b: 0, c: 0 });
    expect(await count(kept.shopId)).toEqual({ b: 1, c: 1 });
  });
});
