import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { isBookingError } from "@/server/booking-engine";
import { staffRole } from "@/server/booking-engine/access";
import { createSignup, slugFromName } from "@/server/signup";
import { dropUser, engine, makeLoneUser, NOW, sql, TOMORROW } from "./fixtures";

/**
 * Self sign-up: an Owner sets up their own Shop. The point of these tests is that nothing is
 * ever duplicated: one Shop per login, however often or however fast the form is sent.
 */
const signup = createSignup(sql);

const users: string[] = [];
let owner: string;

beforeEach(async () => {
  owner = await makeLoneUser();
  users.push(owner);
});
afterEach(async () => {
  const ids = users.splice(0);
  await sql`delete from public.shops where id in (select shop_id from public.shop_members where user_id in ${sql(ids)})`;
  for (const u of ids) await dropUser(u);
});
afterAll(async () => {
  await sql.end();
});

/** A name nobody else's test uses, so links don't collide across runs. */
const uniqueName = () => `Test Cuts ${randomUUID().slice(0, 8)}`;
const form = (over: Partial<Parameters<typeof signup.createOwnShop>[0]> = {}) => ({
  userId: owner,
  shopName: uniqueName(),
  ownerName: "Rafa",
  phone: "(718) 555-0100",
  address: "1 Fordham Rd, Bronx",
  haircutPriceCents: 2500,
  ...over,
});
const errorCode = (e: unknown) => (isBookingError(e) ? e.code : String(e));

describe("link names", () => {
  it("folds accents and punctuation, and pads very short names", () => {
    expect(slugFromName("Kings Cuts & Fades!")).toBe("kings-cuts-fades");
    expect(slugFromName("Peluquería Ñandú")).toBe("peluqueria-nandu");
    expect(slugFromName("JR")).toBe("jr-shop");
    expect(slugFromName("✂︎")).toBe("shop");
  });
});

describe("setting up your own Shop", () => {
  it("creates a bookable Shop on the free month, with the Owner as its first Barber", async () => {
    const r = await signup.createOwnShop(form());
    expect(r.created).toBe(true);

    const catalog = (await engine.getShopCatalog(r.slug, NOW))!;
    expect(catalog.barbers.map((b) => b.displayName)).toEqual(["Rafa"]);
    expect(catalog.services).toEqual([expect.objectContaining({ nameEn: "Haircut", nameEs: "Corte", fromPriceCents: 2500 })]);
    const slots = await engine.getAvailability({ shopId: r.shopId, serviceId: catalog.services[0].id, barberId: "any", date: TOMORROW, now: NOW });
    expect(slots.slots.length).toBeGreaterThan(0);

    const [shop] = await sql<{ plan: string; billing_status: string }[]>`select plan, billing_status from public.shops where id = ${r.shopId}`;
    expect(shop).toEqual({ plan: "free", billing_status: "free_month" });
    expect(await staffRole(sql, owner, r.shopId)).toEqual({ owner: true, barberId: catalog.barbers[0].id });
  });

  it("gives back the same Shop when the form is sent again", async () => {
    const first = await signup.createOwnShop(form());
    const again = await signup.createOwnShop(form({ shopName: "A different name" }));
    expect(again).toEqual({ shopId: first.shopId, slug: first.slug, created: false });
  });

  it("makes exactly one Shop when the form is sent five times at once", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => signup.createOwnShop(form())));
    expect(new Set(results.map((r) => r.shopId)).size).toBe(1);
    expect(results.filter((r) => r.created)).toHaveLength(1);
    const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from public.shop_members where user_id = ${owner}`;
    expect(n).toBe(1);
  });

  it("gives a second Shop with the same name the next free link", async () => {
    const name = uniqueName();
    const first = await signup.createOwnShop(form({ shopName: name }));
    const other = await makeLoneUser();
    users.push(other);
    const second = await signup.createOwnShop(form({ userId: other, shopName: name }));
    expect(second.slug).toBe(`${first.slug}-2`);
  });

  it("refuses a Barber's login and a bad form, writing nothing", async () => {
    const r = await signup.createOwnShop(form());
    const barber = await makeLoneUser();
    users.push(barber);
    await sql`insert into public.shop_members (shop_id, user_id, role) values (${r.shopId}, ${barber}, 'barber')`;
    await expect(signup.createOwnShop(form({ userId: barber })).catch(errorCode)).resolves.toBe("FORBIDDEN");

    const lone = await makeLoneUser();
    users.push(lone);
    await expect(signup.createOwnShop(form({ userId: lone, phone: "12" })).catch(errorCode)).resolves.toBe("INVALID_INPUT");
    await expect(signup.createOwnShop(form({ userId: lone, haircutPriceCents: -1 })).catch(errorCode)).resolves.toBe("INVALID_INPUT");
    const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from public.shop_members where user_id = ${lone}`;
    expect(n).toBe(0);
  });
});
