import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { createBookingEngine } from "@/server/booking-engine";
import { localToUtc } from "@/server/booking-engine/time";

/**
 * Engine tests run against the real hosted Postgres, because the
 * no-double-booking guarantee lives in the database. Every test builds its
 * own throwaway Shop (random slug) and deletes it afterwards, so tests are
 * isolated from each other and from real data.
 */

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing: engine tests need .env.local");

export const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 10, onnotice: () => {} });
export const engine = createBookingEngine(sql);

export const TZ = "America/New_York";
/** Monday 2027-01-11, 09:00 in New York. All tests use this injected clock. */
export const NOW = new Date("2027-01-11T14:00:00Z");
export const TOMORROW = "2027-01-12";

export const at = (date: string, h: number, m = 0) => localToUtc(date, h * 60 + m, TZ)!;
export const minutesBefore = (d: Date, min: number) => new Date(d.getTime() - min * 60_000);

export type TestShop = Awaited<ReturnType<typeof makeShop>>;

export async function makeShop(opts: { smsEnabled?: boolean; cutoffMin?: number } = {}) {
  const slug = `test-${randomUUID().slice(0, 8)}`;
  const [shop] = await sql<{ id: string }[]>`
    insert into public.shops (slug, name, sms_enabled, cancel_cutoff_minutes)
    values (${slug}, 'Test Shop', ${opts.smsEnabled ?? false}, ${opts.cutoffMin ?? 60})
    returning id
  `;
  const shopId = shop.id;

  const barber = async (name: string, sort: number) => {
    const [b] = await sql<{ id: string }[]>`
      insert into public.barbers (shop_id, display_name, sort_order) values (${shopId}, ${name}, ${sort}) returning id
    `;
    // Every day 09:00-17:00 with a 13:00-14:00 break.
    for (let wd = 0; wd < 7; wd++) {
      await sql`
        insert into public.weekly_hours (shop_id, barber_id, weekday, start_time, end_time, break_start, break_end)
        values (${shopId}, ${b.id}, ${wd}, '09:00', '17:00', '13:00', '14:00')
      `;
    }
    return b.id;
  };
  const alex = await barber("Alex", 0);
  const blake = await barber("Blake", 1);

  const service = async (name: string, duration: number, buffer: number) => {
    const [s] = await sql<{ id: string }[]>`
      insert into public.services (shop_id, name_en, name_es, duration_min, buffer_min)
      values (${shopId}, ${name}, ${name}, ${duration}, ${buffer}) returning id
    `;
    return s.id;
  };
  const cut = await service("Cut", 30, 0);
  const fade = await service("Fade", 30, 15);

  for (const b of [alex, blake]) {
    for (const s of [cut, fade]) {
      await sql`
        insert into public.barber_services (shop_id, barber_id, service_id, price_cents)
        values (${shopId}, ${b}, ${s}, 3000)
      `;
    }
  }

  return { shopId, slug, alex, blake, cut, fade };
}

let phoneSeq = 0;
/** A unique valid US number per call, so tests never trip the unpaid limit by accident. */
export function uniquePhone(): string {
  phoneSeq += 1;
  const n = (Date.now() % 1_000_000) * 7 + phoneSeq;
  return `+1718${String(2_000_000 + (n % 7_999_999)).padStart(7, "0")}`;
}

export async function book(
  shop: TestShop,
  over: Partial<Parameters<typeof engine.createBooking>[0]> = {},
) {
  return engine.createBooking({
    shopId: shop.shopId,
    serviceId: shop.cut,
    barberId: shop.alex,
    startsAt: at(TOMORROW, 10),
    client: { name: "Test Client", phone: uniquePhone() },
    paymentMethod: "in_person",
    now: NOW,
    ...over,
  });
}

/** A signed-in staff user. Inserted straight into auth.users (test-only). */
export async function makeUser(shopId: string, role: "owner" | "barber", barberId?: string) {
  const id = randomUUID();
  await sql`
    insert into auth.users (id, instance_id, aud, role, email)
    values (${id}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${`${id}@test.invalid`})
  `;
  await sql`insert into public.shop_members (shop_id, user_id, role) values (${shopId}, ${id}, ${role})`;
  if (barberId) await sql`update public.barbers set user_id = ${id} where id = ${barberId}`;
  return id;
}

/** A signed-in user with no Shop yet (an invited Owner, or a Platform admin). Remove with dropUser. */
export async function makeLoneUser() {
  const id = randomUUID();
  await sql`
    insert into auth.users (id, instance_id, aud, role, email)
    values (${id}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${`${id}@test.invalid`})
  `;
  return id;
}

export async function makePlatformAdmin() {
  const id = await makeLoneUser();
  await sql`insert into public.platform_admins (user_id) values (${id})`;
  return id;
}

export async function dropUser(id: string) {
  await sql`delete from auth.users where id = ${id}`;
}

export async function outboxTypes(bookingId: string): Promise<string[]> {
  const rows = await sql<{ type: string }[]>`select type from public.outbox where booking_id = ${bookingId} order by created_at, type`;
  return rows.map((r) => r.type);
}

export async function dropShop(shop: TestShop) {
  const users = await sql<{ user_id: string }[]>`select user_id from public.shop_members where shop_id = ${shop.shopId}`;
  await sql`delete from public.shops where id = ${shop.shopId}`;
  if (users.length) await sql`delete from auth.users where id in ${sql(users.map((u) => u.user_id))}`;
}
