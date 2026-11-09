import type { Sql } from "postgres";
import { normalizePhone } from "@/lib/phone";
import { RULES } from "@/server/booking-engine";
import { authorizeForBarber, requireOwner } from "@/server/booking-engine/access";
import {
  barberHasBookings,
  barberLimit,
  invalid,
  notFound,
  PG_BARBER_LIMIT,
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
  pgCode,
} from "@/server/booking-engine/errors";
import { isLocalDate } from "@/server/booking-engine/time";

export const MAX_ACTIVE_BARBERS = 6;

type ShopActor = { userId: string; shopId: string };

export type DayHours = { weekday: number; start: string; end: string; breakStart?: string | null; breakEnd?: string | null };

/** "HH:MM" on the 15-minute grid, as minutes after midnight; null when malformed. */
function gridMinutes(t: string | null | undefined): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(t ?? "");
  if (!m) return null;
  const min = Number(m[1]) * 60 + Number(m[2]);
  return min % 15 === 0 ? min : null;
}

/** Validate a week of hours (each weekday once, 15-minute grid, break inside the day). */
export function checkWeek(days: DayHours[]) {
  const seen = new Set<number>();
  for (const d of days) {
    if (!Number.isInteger(d.weekday) || d.weekday < 0 || d.weekday > 6 || seen.has(d.weekday)) {
      throw invalid("Each weekday (0 = Sunday ... 6 = Saturday) may appear once.");
    }
    seen.add(d.weekday);
    const start = gridMinutes(d.start);
    const end = gridMinutes(d.end);
    if (start === null || end === null || start >= end) throw invalid("Hours must be HH:MM on the 15-minute grid, start before end.");
    const hasBreak = !!d.breakStart || !!d.breakEnd;
    if (hasBreak) {
      const bs = gridMinutes(d.breakStart);
      const be = gridMinutes(d.breakEnd);
      if (bs === null || be === null || !(start < bs && bs < be && be < end)) {
        throw invalid("A break must sit inside the working hours, on the 15-minute grid.");
      }
    }
  }
}

const MAX_GALLERY = 6;

/** Photos are shown on the public page, so only plain https links are accepted. */
function httpsUrl(u: string): boolean {
  try {
    return new URL(u).protocol === "https:" && u.length <= 500;
  } catch {
    return false;
  }
}

function phoneOrThrow(raw: string): string {
  const phone = normalizePhone(raw);
  if (!phone) throw invalid("That phone number doesn't look right.");
  return phone;
}

function dateOrThrow(date: string): string {
  if (!isLocalDate(date)) throw invalid("Date must be YYYY-MM-DD.");
  return date;
}

const isCents = (n: number) => Number.isInteger(n) && n >= 0 && n <= 1_000_000;
const onGrid = (min: number) => Number.isInteger(min) && min > 0 && min % 15 === 0 && min <= 480;

/**
 * Owner tools (B5): everything an Owner changes about their Shop, and the few
 * things a Barber may change about themselves. Runs as the database owner, so
 * every operation checks the caller's role first. Booking rules stay in the engine;
 * numbers and the client export live in reporting.
 */
export function createShopAdmin(sql: Sql) {
  async function addBarber(args: ShopActor & { displayName: string }): Promise<{ barberId: string }> {
    await requireOwner(sql, args.userId, args.shopId);
    const displayName = args.displayName.trim();
    if (!displayName || displayName.length > 60) throw invalid("Name is required (max 60 characters).");
    try {
      const [b] = await sql<{ id: string }[]>`
        insert into public.barbers (shop_id, display_name, sort_order)
        values (
          ${args.shopId}, ${displayName},
          (select coalesce(max(sort_order) + 1, 0) from public.barbers where shop_id = ${args.shopId})
        )
        returning id
      `;
      return { barberId: b.id };
    } catch (e) {
      if (pgCode(e) === PG_BARBER_LIMIT) throw barberLimit(MAX_ACTIVE_BARBERS);
      throw e;
    }
  }

  /**
   * Take a Barber off the booking page and remove their access. Refused while they
   * still have upcoming Bookings: the Owner cancels or moves those first (Clients get texted).
   * History stays: past Bookings keep pointing at the (now inactive) Barber.
   */
  async function removeBarber(args: ShopActor & { barberId: string; now: Date }): Promise<void> {
    await requireOwner(sql, args.userId, args.shopId);
    await sql.begin(async (tx) => {
      // Same lock the engine takes before writing this Barber's calendar, so no Booking sneaks in.
      await tx`select pg_advisory_xact_lock(hashtextextended(${args.barberId}, 0))`;
      const [b] = await tx<{ user_id: string | null }[]>`
        select user_id from public.barbers where id = ${args.barberId} and shop_id = ${args.shopId} for update
      `;
      if (!b) throw notFound("Barber");
      const [{ n }] = await tx<{ n: number }[]>`
        select count(*)::int n from public.bookings
        where barber_id = ${args.barberId} and status = 'confirmed' and starts_at >= ${args.now}
      `;
      if (n > 0) throw barberHasBookings(n);
      await tx`update public.barbers set active = false, user_id = null where id = ${args.barberId}`;
      // An Owner who also cut hair keeps owning the Shop; a plain Barber loses access.
      if (b.user_id) {
        await tx`delete from public.shop_members where shop_id = ${args.shopId} and user_id = ${b.user_id} and role = 'barber'`;
      }
    });
  }

  /** Create a Service, or edit one when serviceId is given. Durations sit on the 15-minute grid. */
  async function saveService(
    args: ShopActor & { serviceId?: string; nameEn: string; nameEs: string; durationMin: number; bufferMin: number },
  ): Promise<{ serviceId: string }> {
    await requireOwner(sql, args.userId, args.shopId);
    const nameEn = args.nameEn.trim();
    const nameEs = args.nameEs.trim() || nameEn;
    if (!nameEn || nameEn.length > 80 || nameEs.length > 80) throw invalid("Service name is required (max 80 characters).");
    if (!onGrid(args.durationMin)) throw invalid("Duration must be a multiple of 15 minutes.");
    if (!Number.isInteger(args.bufferMin) || args.bufferMin < 0 || args.bufferMin > 120) {
      throw invalid("Cleaning buffer must be between 0 and 120 minutes.");
    }
    if (args.serviceId) {
      const [row] = await sql<{ id: string }[]>`
        update public.services
        set name_en = ${nameEn}, name_es = ${nameEs}, duration_min = ${args.durationMin}, buffer_min = ${args.bufferMin}
        where id = ${args.serviceId} and shop_id = ${args.shopId}
        returning id
      `;
      if (!row) throw notFound("Service");
      return { serviceId: row.id };
    }
    const [row] = await sql<{ id: string }[]>`
      insert into public.services (shop_id, name_en, name_es, duration_min, buffer_min, sort_order)
      values (
        ${args.shopId}, ${nameEn}, ${nameEs}, ${args.durationMin}, ${args.bufferMin},
        (select coalesce(max(sort_order) + 1, 0) from public.services where shop_id = ${args.shopId})
      )
      returning id
    `;
    return { serviceId: row.id };
  }

  /** Hide a Service from the booking page. Existing Bookings keep it. */
  async function archiveService(args: ShopActor & { serviceId: string }): Promise<void> {
    await requireOwner(sql, args.userId, args.shopId);
    const rows = await sql`update public.services set active = false where id = ${args.serviceId} and shop_id = ${args.shopId}`;
    if (rows.count === 0) throw notFound("Service");
  }

  /** What one Barber charges for a Service (and optionally how long it takes them). Owner only. */
  async function setBarberPrice(
    args: ShopActor & { barberId: string; serviceId: string; priceCents: number; durationOverrideMin?: number | null },
  ): Promise<void> {
    await requireOwner(sql, args.userId, args.shopId);
    if (!isCents(args.priceCents)) throw invalid("Price must be a whole number of cents.");
    const override = args.durationOverrideMin ?? null;
    if (override !== null && !onGrid(override)) throw invalid("Duration must be a multiple of 15 minutes.");
    try {
      await sql`
        insert into public.barber_services (shop_id, barber_id, service_id, price_cents, duration_override_min)
        values (${args.shopId}, ${args.barberId}, ${args.serviceId}, ${args.priceCents}, ${override})
        on conflict (barber_id, service_id) do update
          set price_cents = excluded.price_cents, duration_override_min = excluded.duration_override_min
      `;
    } catch (e) {
      if (pgCode(e) === PG_FOREIGN_KEY_VIOLATION) throw notFound("Barber or Service"); // not in this Shop
      throw e;
    }
  }

  /** The Barber stops offering a Service. */
  async function removeBarberPrice(args: ShopActor & { barberId: string; serviceId: string }): Promise<void> {
    await requireOwner(sql, args.userId, args.shopId);
    await sql`
      delete from public.barber_services
      where shop_id = ${args.shopId} and barber_id = ${args.barberId} and service_id = ${args.serviceId}
    `;
  }

  /**
   * A promotion: a special price with an end date, for every Barber who offers the
   * Service (or one Barber). No caps, no approvals. Pass null to end it now.
   */
  async function setSpecialPrice(
    args: ShopActor & { serviceId: string; barberId?: string; specialPriceCents: number | null; endsAt: Date | null },
  ): Promise<void> {
    await requireOwner(sql, args.userId, args.shopId);
    const clear = args.specialPriceCents === null || args.endsAt === null;
    if (!clear && !isCents(args.specialPriceCents!)) throw invalid("Price must be a whole number of cents.");
    const rows = await sql`
      update public.barber_services
      set special_price_cents = ${clear ? null : args.specialPriceCents},
          special_ends_at = ${clear ? null : args.endsAt}
      where shop_id = ${args.shopId} and service_id = ${args.serviceId}
        ${args.barberId ? sql`and barber_id = ${args.barberId}` : sql``}
    `;
    if (rows.count === 0) throw notFound("Service price");
  }

  /**
   * Replace a Barber's whole week. Weekdays left out are days off. A Barber sets
   * their own; the Owner can fix anyone's. Existing Bookings are not moved.
   */
  async function setWeeklyHours(args: ShopActor & { barberId: string; days: DayHours[] }): Promise<void> {
    await authorizeForBarber(sql, args.userId, args.shopId, args.barberId);
    checkWeek(args.days);
    await sql.begin(async (tx) => {
      await tx`delete from public.weekly_hours where shop_id = ${args.shopId} and barber_id = ${args.barberId}`;
      for (const d of args.days) {
        await tx`
          insert into public.weekly_hours (shop_id, barber_id, weekday, start_time, end_time, break_start, break_end)
          values (${args.shopId}, ${args.barberId}, ${d.weekday}, ${d.start}, ${d.end}, ${d.breakStart || null}, ${d.breakEnd || null})
        `;
      }
    });
  }

  async function removeBarberDayOff(args: ShopActor & { barberId: string; date: string }): Promise<void> {
    await authorizeForBarber(sql, args.userId, args.shopId, args.barberId);
    await sql`delete from public.barber_time_off where shop_id = ${args.shopId} and barber_id = ${args.barberId} and day = ${dateOrThrow(args.date)}::date`;
  }

  async function removeShopClosedDay(args: ShopActor & { date: string }): Promise<void> {
    await requireOwner(sql, args.userId, args.shopId);
    await sql`delete from public.shop_closed_days where shop_id = ${args.shopId} and day = ${dateOrThrow(args.date)}::date`;
  }

  /**
   * How long before a Booking the Client can still cancel or change online.
   * Over 2 hours, the reminder text arrives after the cutoff, so the Owner gets a warning.
   */
  async function setCancelCutoff(
    args: ShopActor & { minutes: number },
  ): Promise<{ warning: "REMINDER_AFTER_CUTOFF" | null }> {
    await requireOwner(sql, args.userId, args.shopId);
    if (!Number.isInteger(args.minutes) || args.minutes < 0 || args.minutes > 7 * 24 * 60) {
      throw invalid("Cutoff must be between 0 minutes and 7 days.");
    }
    await sql`update public.shops set cancel_cutoff_minutes = ${args.minutes} where id = ${args.shopId}`;
    return { warning: args.minutes > RULES.reminderLeadMin ? "REMINDER_AFTER_CUTOFF" : null };
  }

  /** Stop a phone number from booking in this Shop (the engine refuses it). */
  async function blockPhone(args: ShopActor & { phone: string }): Promise<void> {
    await requireOwner(sql, args.userId, args.shopId);
    const phone = phoneOrThrow(args.phone);
    await sql`
      insert into public.clients (shop_id, name, phone_e164, blocked)
      values (${args.shopId}, 'Blocked number', ${phone}, true)
      on conflict (shop_id, phone_e164) do update set blocked = true
    `;
  }

  async function unblockPhone(args: ShopActor & { phone: string }): Promise<void> {
    await requireOwner(sql, args.userId, args.shopId);
    const phone = phoneOrThrow(args.phone);
    await sql`update public.clients set blocked = false where shop_id = ${args.shopId} and phone_e164 = ${phone}`;
  }

  async function listBlocked(args: ShopActor): Promise<{ phone: string; name: string }[]> {
    await requireOwner(sql, args.userId, args.shopId);
    const rows = await sql<{ phone_e164: string; name: string }[]>`
      select phone_e164, name from public.clients where shop_id = ${args.shopId} and blocked order by name
    `;
    return rows.map((r) => ({ phone: r.phone_e164, name: r.name }));
  }

  /** What Clients see about a Barber. The Barber edits their own; the Owner can edit anyone's. */
  async function updateBarberProfile(
    args: ShopActor & { barberId: string; displayName: string; bio: string; specialties: string[]; photoUrl: string | null },
  ): Promise<void> {
    await authorizeForBarber(sql, args.userId, args.shopId, args.barberId);
    const displayName = args.displayName.trim();
    const specialties = args.specialties.map((x) => x.trim()).filter(Boolean);
    if (!displayName || displayName.length > 60) throw invalid("Name is required (max 60 characters).");
    if (args.bio.length > 500) throw invalid("Bio is too long (max 500 characters).");
    if (specialties.length > 8 || specialties.some((x) => x.length > 40)) throw invalid("Up to 8 short specialties.");
    if (args.photoUrl !== null && !httpsUrl(args.photoUrl)) throw invalid("Photo must be an https link.");
    await sql`
      update public.barbers
      set display_name = ${displayName}, bio = ${args.bio.trim()}, specialties = ${specialties}, photo_url = ${args.photoUrl}
      where id = ${args.barberId} and shop_id = ${args.shopId}
    `;
  }

  /** Replace a Barber's gallery, in display order (up to 6 photos). */
  async function setGallery(args: ShopActor & { barberId: string; urls: string[] }): Promise<void> {
    await authorizeForBarber(sql, args.userId, args.shopId, args.barberId);
    if (args.urls.length > MAX_GALLERY) throw invalid(`A gallery holds at most ${MAX_GALLERY} photos.`);
    if (!args.urls.every(httpsUrl)) throw invalid("Photos must be https links.");
    await sql.begin(async (tx) => {
      await tx`delete from public.barber_gallery where shop_id = ${args.shopId} and barber_id = ${args.barberId}`;
      for (const [position, url] of args.urls.entries()) {
        await tx`
          insert into public.barber_gallery (shop_id, barber_id, url, position)
          values (${args.shopId}, ${args.barberId}, ${url}, ${position})
        `;
      }
    });
  }

  /**
   * Tie a login (an invited auth user) to a Barber, so they can sign in and see their day.
   * The invite email itself is sent by the app (Supabase Auth); this only grants access.
   */
  async function linkBarberLogin(args: ShopActor & { barberId: string; loginUserId: string }): Promise<void> {
    await requireOwner(sql, args.userId, args.shopId);
    try {
      await sql.begin(async (tx) => {
        const [b] = await tx<{ user_id: string | null }[]>`
          select user_id from public.barbers
          where id = ${args.barberId} and shop_id = ${args.shopId} and active
          for update
        `;
        if (!b) throw notFound("Barber");
        await tx`update public.barbers set user_id = ${args.loginUserId} where id = ${args.barberId}`;
        // The login this Barber had before loses access (an Owner keeps owning the Shop).
        if (b.user_id && b.user_id !== args.loginUserId) {
          await tx`
            delete from public.shop_members
            where shop_id = ${args.shopId} and user_id = ${b.user_id} and role = 'barber'
          `;
        }
        // An existing Owner keeps the owner role; anyone else joins as a Barber.
        await tx`
          insert into public.shop_members (shop_id, user_id, role)
          values (${args.shopId}, ${args.loginUserId}, 'barber')
          on conflict (shop_id, user_id) do nothing
        `;
      });
    } catch (e) {
      if (pgCode(e) === PG_UNIQUE_VIOLATION) throw invalid("That login is already connected to another barber in this shop.");
      throw e;
    }
  }

  return {
    linkBarberLogin,
    blockPhone,
    unblockPhone,
    listBlocked,
    updateBarberProfile,
    setGallery,
    addBarber,
    removeBarber,
    saveService,
    archiveService,
    setBarberPrice,
    removeBarberPrice,
    setSpecialPrice,
    setWeeklyHours,
    removeBarberDayOff,
    removeShopClosedDay,
    setCancelCutoff,
  };
}

export type ShopAdmin = ReturnType<typeof createShopAdmin>;
