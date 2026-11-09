import type postgres from "postgres";
import type { Sql } from "postgres";
import { parseCsv } from "@/lib/csv";
import { normalizePhone } from "@/lib/phone";
import { requirePlatformAdmin } from "@/server/booking-engine/access";
import {
  barberLimit,
  invalid,
  notFound,
  PG_BARBER_LIMIT,
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
  pgCode,
  slugTaken,
} from "@/server/booking-engine/errors";
import type { Failure } from "@/server/dispatch";
import { createReporting } from "@/server/reporting";
import { checkWeek, MAX_ACTIVE_BARBERS, type DayHours } from "@/server/shop-admin";

/**
 * Platform admin (B6): our team creates Shops, imports their clients, tracks
 * texting registration and billing, gives logged support, watches failures and
 * deletes cancelled Shops on schedule. Every operation requires a Platform admin.
 */

type AdminActor = { userId: string };
type ShopActor = AdminActor & { shopId: string };

const SMS_REGISTRATION = ["not_started", "submitted", "approved", "rejected"] as const;
export type SmsRegistration = (typeof SMS_REGISTRATION)[number];
const BILLING_STATUS = ["free_month", "paid", "overdue"] as const;
export type BillingStatus = (typeof BILLING_STATUS)[number];

export type NewShop = AdminActor & {
  slug: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  /** Minutes the Shop spends on each phone booking (from the install visit); drives "time saved". */
  manualBookingMinutes: number;
  /** The Owner's login (created by the app beforehand). */
  ownerUserId: string;
  /** Set when the Owner also cuts hair: their Barber name. */
  ownerBarberName?: string | null;
  barbers: string[];
  /** One price per Service for every Barber to start with; the Owner adjusts per Barber later. */
  services: { nameEn: string; nameEs: string; durationMin: number; bufferMin?: number; priceCents: number }[];
  /** The starting week for every Barber; each Barber edits their own later. */
  weeklyHours: DayHours[];
};

export type ShopOverview = {
  id: string;
  slug: string;
  name: string;
  status: "active" | "suspended" | "cancelled";
  smsRegistration: SmsRegistration;
  smsEnabled: boolean;
  billingStatus: BillingStatus;
  manualBookingMinutes: number;
  barbers: number;
  bookingsLast7Days: number;
  createdAt: Date;
  cancelledAt: Date | null;
};

export type SupportAccess = { id: string; shopId: string; adminUserId: string; reason: string; createdAt: Date };

export type AdminFailure = Failure & { shopName: string };

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_IMPORT_ROWS = 5000;
/** A cancelled Shop's data is deleted this many days after cancellation. */
export const PURGE_AFTER_DAYS = 30;
const DAY_MS = 24 * 60 * 60_000;

function checkManualMinutes(minutes: number) {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 60) {
    throw invalid("Minutes per manual booking must be between 0 and 60.");
  }
}

/**
 * Validate and tidy a new Shop without touching the database, so the app can
 * reject a bad form before it creates the Owner's login.
 */
export function checkNewShop(args: Omit<NewShop, "userId" | "ownerUserId">) {
  const slug = args.slug.trim().toLowerCase();
  const name = args.name.trim();
  if (!SLUG.test(slug) || slug.length < 3 || slug.length > 40) {
    throw invalid("Link name: 3-40 lowercase letters, numbers and dashes.");
  }
  if (!name || name.length > 80) throw invalid("Shop name is required (max 80 characters).");
  const phone = args.phone ? normalizePhone(args.phone) : null;
  if (args.phone && !phone) throw invalid("That phone number doesn't look right.");
  checkManualMinutes(args.manualBookingMinutes);
  const ownerBarberName = args.ownerBarberName?.trim() || null;
  const barberNames = [ownerBarberName, ...args.barbers.map((n) => n.trim())].filter((n): n is string => !!n);
  if (barberNames.length === 0) throw invalid("A Shop needs at least one Barber.");
  if (barberNames.length > MAX_ACTIVE_BARBERS) throw barberLimit(MAX_ACTIVE_BARBERS);
  if (args.services.length === 0) throw invalid("A Shop needs at least one Service.");
  for (const s of args.services) {
    const buffer = s.bufferMin ?? 0;
    if (
      !s.nameEn.trim() ||
      s.durationMin <= 0 ||
      s.durationMin % 15 !== 0 ||
      !Number.isInteger(buffer) ||
      buffer < 0 ||
      buffer % 15 !== 0 ||
      !Number.isInteger(s.priceCents) ||
      s.priceCents < 0
    ) {
      throw invalid("Each Service needs a name, a duration and buffer on the 15-minute grid, and a price.");
    }
  }
  checkWeek(args.weeklyHours);
  return { slug, name, phone, address: args.address?.trim() || null, ownerCutsHair: !!ownerBarberName, barberNames };
}

export function createPlatformAdmin(sql: Sql) {
  const reporting = createReporting(sql);

  /** Set up a whole Shop in one transaction, so an install takes minutes and never half-exists. */
  async function createShop(args: NewShop): Promise<{ shopId: string; slug: string }> {
    await requirePlatformAdmin(sql, args.userId);
    const { slug, name, phone, address, ownerCutsHair, barberNames } = checkNewShop(args);

    try {
      return await sql.begin(async (tx) => {
        const [shop] = await tx<{ id: string }[]>`
          insert into public.shops (slug, name, phone, address, manual_booking_minutes)
          values (${slug}, ${name}, ${phone}, ${address}, ${args.manualBookingMinutes})
          returning id
        `;
        await tx`insert into public.shop_members (shop_id, user_id, role) values (${shop.id}, ${args.ownerUserId}, 'owner')`;

        const barberIds: string[] = [];
        for (const [i, displayName] of barberNames.entries()) {
          const userId = i === 0 && ownerCutsHair ? args.ownerUserId : null;
          const [b] = await tx<{ id: string }[]>`
            insert into public.barbers (shop_id, user_id, display_name, sort_order)
            values (${shop.id}, ${userId}, ${displayName}, ${i})
            returning id
          `;
          barberIds.push(b.id);
        }

        for (const [i, s] of args.services.entries()) {
          const [svc] = await tx<{ id: string }[]>`
            insert into public.services (shop_id, name_en, name_es, duration_min, buffer_min, sort_order)
            values (${shop.id}, ${s.nameEn.trim()}, ${s.nameEs.trim() || s.nameEn.trim()}, ${s.durationMin}, ${s.bufferMin ?? 0}, ${i})
            returning id
          `;
          for (const barberId of barberIds) {
            await tx`
              insert into public.barber_services (shop_id, barber_id, service_id, price_cents)
              values (${shop.id}, ${barberId}, ${svc.id}, ${s.priceCents})
            `;
          }
        }

        for (const barberId of barberIds) {
          for (const d of args.weeklyHours) {
            await tx`
              insert into public.weekly_hours (shop_id, barber_id, weekday, start_time, end_time, break_start, break_end)
              values (${shop.id}, ${barberId}, ${d.weekday}, ${d.start}, ${d.end}, ${d.breakStart || null}, ${d.breakEnd || null})
            `;
          }
        }
        return { shopId: shop.id, slug };
      });
    } catch (e) {
      if (pgCode(e) === PG_UNIQUE_VIOLATION && constraintName(e) === "shops_slug_key") throw slugTaken();
      if (pgCode(e) === PG_BARBER_LIMIT) throw barberLimit(MAX_ACTIVE_BARBERS);
      throw e;
    }
  }

  /** Every Shop, newest first, with the facts the admin checks daily. */
  async function listShops(args: AdminActor & { now: Date }): Promise<ShopOverview[]> {
    await requirePlatformAdmin(sql, args.userId);
    const since = new Date(args.now.getTime() - 7 * DAY_MS);
    const rows = await sql<
      {
        id: string;
        slug: string;
        name: string;
        status: ShopOverview["status"];
        sms_registration: SmsRegistration;
        sms_enabled: boolean;
        billing_status: BillingStatus;
        manual_booking_minutes: number;
        barbers: number;
        bookings_7d: number;
        created_at: Date;
        cancelled_at: Date | null;
      }[]
    >`
      select s.id, s.slug, s.name, s.status, s.sms_registration, s.sms_enabled, s.billing_status,
             s.manual_booking_minutes, s.created_at, s.cancelled_at,
             (select count(*)::int from public.barbers b where b.shop_id = s.id and b.active) as barbers,
             (select count(*)::int from public.bookings k
               where k.shop_id = s.id and k.kind = 'booking' and k.status <> 'cancelled' and k.created_at >= ${since}) as bookings_7d
      from public.shops s
      order by s.created_at desc
    `;
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      status: r.status,
      smsRegistration: r.sms_registration,
      smsEnabled: r.sms_enabled,
      billingStatus: r.billing_status,
      manualBookingMinutes: r.manual_booking_minutes,
      barbers: r.barbers,
      bookingsLast7Days: r.bookings_7d,
      createdAt: r.created_at,
      cancelledAt: r.cancelled_at,
    }));
  }

  /**
   * Import a Shop's existing client list from a spreadsheet (CSV with a name and a
   * phone column). Phones are normalized and merged; existing Clients are left as
   * they are, so a blocked number stays blocked. Bad rows are reported, not fatal.
   */
  async function importClients(
    args: AdminActor & { shopId: string; csv: string },
  ): Promise<{ imported: number; alreadyThere: number; rejected: { line: number; reason: string }[] }> {
    await requirePlatformAdmin(sql, args.userId);
    await requireShop(args.shopId);
    const [header, ...rows] = parseCsv(args.csv);
    const cols = (header?.cells ?? []).map((c) => c.trim().toLowerCase());
    const exactName = cols.indexOf("name");
    const nameCol = exactName >= 0 ? exactName : cols.findIndex((c) => c.includes("name"));
    const phoneCol = cols.findIndex((c) => /phone|mobile|cell|tel/.test(c));
    if (nameCol < 0 || phoneCol < 0) throw invalid("The spreadsheet needs a name column and a phone column.");
    if (rows.length > MAX_IMPORT_ROWS) throw invalid(`At most ${MAX_IMPORT_ROWS} clients per import.`);

    const rejected: { line: number; reason: string }[] = [];
    const clients = new Map<string, string>(); // phone -> name (first one wins)
    let repeats = 0;
    for (const r of rows) {
      if (r.cells.every((c) => !c.trim())) continue; // blank line
      const name = (r.cells[nameCol] ?? "").trim().slice(0, 80);
      const rawPhone = (r.cells[phoneCol] ?? "").trim();
      if (!rawPhone) {
        rejected.push({ line: r.line, reason: "missing phone" });
        continue;
      }
      const phone = normalizePhone(rawPhone);
      if (!phone) {
        rejected.push({ line: r.line, reason: "invalid phone" });
        continue;
      }
      if (clients.has(phone)) repeats++;
      else clients.set(phone, name || "Client");
    }

    let imported = 0;
    if (clients.size > 0) {
      const values = [...clients].map(([phone, name]) => ({ shop_id: args.shopId, name, phone_e164: phone }));
      const inserted = await sql`
        insert into public.clients ${sql(values, "shop_id", "name", "phone_e164")}
        on conflict (shop_id, phone_e164) do nothing
        returning id
      `;
      imported = inserted.length;
    }
    await logAccess(args.shopId, args.userId, `Imported client list (${imported} new)`);
    return { imported, alreadyThere: clients.size - imported + repeats, rejected };
  }

  /** Carrier (10DLC) registration progress. Texts go out only once it is approved. */
  async function setSmsRegistration(args: ShopActor & { status: SmsRegistration }): Promise<void> {
    await requirePlatformAdmin(sql, args.userId);
    if (!SMS_REGISTRATION.includes(args.status)) throw invalid("Unknown registration status.");
    await updateShop(args.shopId, sql`sms_registration = ${args.status}, sms_enabled = ${args.status === "approved"}`);
  }

  async function setBillingStatus(args: ShopActor & { status: BillingStatus }): Promise<void> {
    await requirePlatformAdmin(sql, args.userId);
    if (!BILLING_STATUS.includes(args.status)) throw invalid("Unknown billing status.");
    await updateShop(args.shopId, sql`billing_status = ${args.status}`);
  }

  /** Minutes the Shop spent on each phone booking; drives the Owner's "time saved". */
  async function setManualBookingMinutes(args: ShopActor & { minutes: number }): Promise<void> {
    await requirePlatformAdmin(sql, args.userId);
    checkManualMinutes(args.minutes);
    await updateShop(args.shopId, sql`manual_booking_minutes = ${args.minutes}`);
  }

  /** Record why we are looking inside a Shop. The admin UI calls this before showing Shop data. */
  async function openSupportAccess(args: ShopActor & { reason: string }): Promise<void> {
    await requirePlatformAdmin(sql, args.userId);
    const reason = args.reason.trim();
    if (!reason || reason.length > 500) throw invalid("Say why you need access (max 500 characters).");
    await logAccess(args.shopId, args.userId, reason);
  }

  async function listSupportAccess(args: AdminActor & { shopId?: string; limit?: number }): Promise<SupportAccess[]> {
    await requirePlatformAdmin(sql, args.userId);
    const rows = await sql<{ id: string; shop_id: string; admin_user_id: string; reason: string; created_at: Date }[]>`
      select id, shop_id, admin_user_id, reason, created_at
      from public.support_access_log
      ${args.shopId ? sql`where shop_id = ${args.shopId}` : sql``}
      order by created_at desc
      limit ${listLimit(args.limit, 200)}
    `;
    return rows.map((r) => ({ id: r.id, shopId: r.shop_id, adminUserId: r.admin_user_id, reason: r.reason, createdAt: r.created_at }));
  }

  /** Messages that gave up after every retry, newest first, across all Shops. */
  async function listFailures(args: AdminActor & { limit?: number }): Promise<AdminFailure[]> {
    await requirePlatformAdmin(sql, args.userId);
    const rows = await sql<
      { id: string; shop_id: string; shop_name: string; booking_id: string | null; type: string; attempts: number; last_error: string | null; created_at: Date }[]
    >`
      select o.id, o.shop_id, s.name as shop_name, o.booking_id, o.type, o.attempts, o.last_error, o.created_at
      from public.outbox o join public.shops s on s.id = o.shop_id
      where o.status = 'failed'
      order by o.created_at desc
      limit ${listLimit(args.limit, 100)}
    `;
    return rows.map((r) => ({
      id: r.id,
      shopId: r.shop_id,
      shopName: r.shop_name,
      bookingId: r.booking_id,
      type: r.type,
      attempts: r.attempts,
      lastError: r.last_error,
      createdAt: r.created_at,
    }));
  }

  /** Put a failed message back in the queue with a fresh set of retries. */
  async function retryFailure(args: AdminActor & { outboxId: string; now: Date }): Promise<void> {
    await requirePlatformAdmin(sql, args.userId);
    const rows = await sql`
      update public.outbox
      set status = 'pending', attempts = 0, next_attempt_at = ${args.now}, processed_at = null
      where id = ${args.outboxId} and status = 'failed'
      returning id
    `;
    if (rows.length === 0) throw notFound("Failed message");
  }

  /** Stop a Shop: its booking page closes now and its data is deleted PURGE_AFTER_DAYS later. */
  async function cancelShop(args: ShopActor & { now: Date }): Promise<void> {
    await requirePlatformAdmin(sql, args.userId);
    // Cancelling again keeps the first date, so the deletion clock never restarts.
    await updateShop(args.shopId, sql`status = 'cancelled', cancelled_at = coalesce(cancelled_at, ${args.now})`);
  }

  /** Undo a cancellation before the data is deleted. */
  async function reactivateShop(args: ShopActor): Promise<void> {
    await requirePlatformAdmin(sql, args.userId);
    const rows = await sql`update public.shops set status = 'active', cancelled_at = null where id = ${args.shopId} and status = 'cancelled' returning id`;
    if (rows.length === 0) {
      await requireShop(args.shopId);
      throw invalid("Only a cancelled Shop can be reactivated.");
    }
  }

  /**
   * Scheduled job (no user): delete Shops cancelled PURGE_AFTER_DAYS ago or more,
   * with everything in them and the staff logins that belonged only to them.
   */
  async function purgeCancelledShops(args: { now: Date }): Promise<{ shops: number }> {
    const before = new Date(args.now.getTime() - PURGE_AFTER_DAYS * DAY_MS);
    return sql.begin(async (tx) => {
      const shops = await tx<{ id: string }[]>`
        select id from public.shops where status = 'cancelled' and cancelled_at <= ${before} for update
      `;
      if (shops.length === 0) return { shops: 0 };
      const ids = shops.map((s) => s.id);
      const members = await tx<{ user_id: string }[]>`select distinct user_id from public.shop_members where shop_id in ${tx(ids)}`;
      await tx`delete from public.shops where id in ${tx(ids)}`;
      if (members.length) {
        await tx`
          delete from auth.users u
          where u.id in ${tx(members.map((m) => m.user_id))}
            and not exists (select 1 from public.shop_members m where m.user_id = u.id)
            and not exists (select 1 from public.platform_admins a where a.user_id = u.id)
        `;
      }
      return { shops: ids.length };
    });
  }

  /** The Shop's Clients as CSV, e.g. for an Owner who is leaving. Logged as support access. */
  async function exportClients(args: ShopActor & { reason: string }): Promise<string> {
    await openSupportAccess(args);
    return reporting.exportClientsCsvForAdmin(args);
  }

  async function logAccess(shopId: string, adminUserId: string, reason: string) {
    try {
      await sql`insert into public.support_access_log (shop_id, admin_user_id, reason) values (${shopId}, ${adminUserId}, ${reason})`;
    } catch (e) {
      if (pgCode(e) === PG_FOREIGN_KEY_VIOLATION) throw notFound("Shop");
      throw e;
    }
  }

  async function requireShop(shopId: string) {
    const [row] = await sql`select 1 from public.shops where id = ${shopId}`;
    if (!row) throw notFound("Shop");
  }

  async function updateShop(shopId: string, set: postgres.PendingQuery<postgres.Row[]>) {
    const rows = await sql`update public.shops set ${set} where id = ${shopId} returning id`;
    if (rows.length === 0) throw notFound("Shop");
  }

  return {
    createShop,
    listShops,
    importClients,
    setSmsRegistration,
    setBillingStatus,
    setManualBookingMinutes,
    openSupportAccess,
    listSupportAccess,
    listFailures,
    retryFailure,
    cancelShop,
    reactivateShop,
    purgeCancelledShops,
    exportClients,
  };
}

export type PlatformAdmin = ReturnType<typeof createPlatformAdmin>;

function constraintName(e: unknown): string | undefined {
  return typeof e === "object" && e !== null && "constraint_name" in e ? String((e as { constraint_name: unknown }).constraint_name) : undefined;
}

function listLimit(limit: number | undefined, fallback: number): number {
  if (limit === undefined) return fallback;
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw invalid("Limit must be between 1 and 1000.");
  return limit;
}
