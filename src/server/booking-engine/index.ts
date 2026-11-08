import { createHash, randomBytes } from "node:crypto";
import type { ISql, Sql } from "postgres";
import { normalizePhone } from "@/lib/phone";
import { bookingWindow, computeSlots, RULES, type DayHours, type Interval } from "./availability";
import {
  BookingError,
  forbidden,
  invalid,
  notFound,
  pgCode,
  PG_DAY_HAS_BOOKINGS,
  PG_EXCLUSION_VIOLATION,
  slotTaken,
} from "./errors";
import { isLocalDate, localDayRange, MINUTE, timeToMinutes, toLocal, weekdayOf, type LocalDate } from "./time";

export * from "./errors";
export { RULES } from "./availability";
export type { LocalDate } from "./time";

/**
 * The booking engine: the one place that knows the booking rules.
 * Everything else (public page, Barber day view, later the cron job and
 * Stripe webhook) calls these operations. Side effects such as texts,
 * Barber alerts and refunds are written to the `outbox` table in the same
 * transaction; dispatchers send them later.
 */

// ------------------------------------------------------------------ types

export type Actor =
  | { kind: "client"; token: string }
  | { kind: "staff"; userId: string };

export type PaymentMethod = "in_person" | "online";

export type Slot = { startsAt: string; time: string; barberIds: string[] };

export type BookingSummary = {
  id: string;
  shopId: string;
  barberId: string;
  serviceId: string;
  kind: "booking" | "walk_in";
  status: "confirmed" | "cancelled" | "arrived" | "no_show";
  startsAt: Date;
  endsAt: Date;
  priceCents: number;
  paymentMethod: PaymentMethod;
  paymentStatus: "unpaid" | "paid" | "refunded";
};

type Db = ISql;

type ShopRow = {
  id: string;
  slug: string;
  name: string;
  phone: string | null;
  address: string | null;
  timezone: string;
  cancel_cutoff_minutes: number;
  sms_enabled: boolean;
  status: string;
  stripe_account_id: string | null;
};

type ServiceRow = {
  id: string;
  name_en: string;
  name_es: string;
  duration_min: number;
  buffer_min: number;
  active: boolean;
};

type OfferRow = {
  barber_id: string;
  display_name: string;
  sort_order: number;
  price_cents: number;
  duration_override_min: number | null;
  special_price_cents: number | null;
  special_ends_at: Date | null;
};

type BookingRow = {
  id: string;
  shop_id: string;
  barber_id: string;
  service_id: string;
  client_id: string | null;
  kind: "booking" | "walk_in";
  status: "confirmed" | "cancelled" | "arrived" | "no_show";
  starts_at: Date;
  ends_at: Date;
  blocked_until: Date;
  price_cents: number;
  payment_method: PaymentMethod;
  payment_status: "unpaid" | "paid" | "refunded";
};

const toSummary = (b: BookingRow): BookingSummary => ({
  id: b.id,
  shopId: b.shop_id,
  barberId: b.barber_id,
  serviceId: b.service_id,
  kind: b.kind,
  status: b.status,
  startsAt: b.starts_at,
  endsAt: b.ends_at,
  priceCents: b.price_cents,
  paymentMethod: b.payment_method,
  paymentStatus: b.payment_status,
});

// ------------------------------------------------------------------ helpers

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newManageToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Special price applies while the deal has not ended at the moment of booking. */
export function effectivePrice(o: Pick<OfferRow, "price_cents" | "special_price_cents" | "special_ends_at">, now: Date) {
  const special = o.special_price_cents !== null && o.special_ends_at !== null && o.special_ends_at > now;
  return {
    priceCents: special ? o.special_price_cents! : o.price_cents,
    regularPriceCents: o.price_cents,
    specialEndsAt: special ? o.special_ends_at : null,
  };
}

/**
 * Queue writes to one Barber's calendar for the rest of the transaction.
 * Two inserts racing on the exclusion constraint can otherwise deadlock
 * (40P01) instead of failing cleanly with 23P01. Always taken after any
 * Client row lock, so lock order is consistent and cannot cycle.
 */
async function lockBarberCalendar(db: Db, barberId: string) {
  await db`select pg_advisory_xact_lock(hashtextextended(${barberId}, 0))`;
}

async function writeOutbox(db: Db, shopId: string, bookingId: string | null, type: string, payload: Record<string, unknown>) {
  await db`
    insert into public.outbox (shop_id, booking_id, type, payload)
    values (${shopId}, ${bookingId}, ${type}, ${JSON.stringify(payload)}::jsonb)
  `;
}

/** Schedule (or reschedule) the 2-hour reminder; skip it when the Booking is less than 2 hours away. */
async function scheduleReminder(db: Db, b: { id: string; shop_id: string; starts_at: Date }, now: Date) {
  const sendAt = new Date(b.starts_at.getTime() - RULES.reminderLeadMin * MINUTE);
  if (sendAt <= now) {
    await db`delete from public.scheduled_messages where booking_id = ${b.id} and kind = 'reminder_2h' and sent_at is null`;
    return;
  }
  await db`
    insert into public.scheduled_messages (shop_id, booking_id, kind, send_at)
    values (${b.shop_id}, ${b.id}, 'reminder_2h', ${sendAt})
    on conflict (booking_id, kind) do update set send_at = excluded.send_at, sent_at = null
  `;
}

async function loadShop(db: Db, shopId: string): Promise<ShopRow> {
  const [shop] = await db<ShopRow[]>`
    select id, slug, name, phone, address, timezone, cancel_cutoff_minutes, sms_enabled, status, stripe_account_id
    from public.shops where id = ${shopId}
  `;
  if (!shop) throw notFound("Shop");
  if (shop.status !== "active") throw new BookingError("SHOP_UNAVAILABLE", "This shop is not taking bookings.");
  return shop;
}

type Offer = {
  barberId: string;
  displayName: string;
  sortOrder: number;
  durationMin: number;
  bufferMin: number;
  priceCents: number;
  slots: Date[];
  bookingsThatDay: number;
};

/**
 * Everything needed to decide availability for one Service on one local day:
 * which Barbers offer it, their hours, days off, and live Bookings.
 */
async function loadDay(
  db: Db,
  args: { shopId: string; serviceId: string; date: LocalDate; barberId?: string; excludeBookingId?: string; now: Date },
): Promise<{ shop: ShopRow; service: ServiceRow; offers: Offer[] }> {
  const { shopId, serviceId, date, barberId, excludeBookingId, now } = args;
  const shop = await loadShop(db, shopId);

  const [service] = await db<ServiceRow[]>`
    select id, name_en, name_es, duration_min, buffer_min, active
    from public.services where id = ${serviceId} and shop_id = ${shopId}
  `;
  if (!service || !service.active) throw notFound("Service");

  const offers = await db<OfferRow[]>`
    select b.id as barber_id, b.display_name, b.sort_order,
           bs.price_cents, bs.duration_override_min, bs.special_price_cents, bs.special_ends_at
    from public.barbers b
    join public.barber_services bs on bs.barber_id = b.id and bs.service_id = ${serviceId}
    where b.shop_id = ${shopId} and b.active
      ${barberId ? db`and b.id = ${barberId}` : db``}
    order by b.sort_order, b.id
  `;
  if (offers.length === 0) return { shop, service, offers: [] };

  const ids = offers.map((o) => o.barber_id);
  const { start: dayStart, end: dayEnd } = localDayRange(date, shop.timezone);

  const [hoursRows, offRows, closedRows, busyRows] = await Promise.all([
    db<{ barber_id: string; start_time: string; end_time: string; break_start: string | null; break_end: string | null }[]>`
      select barber_id, start_time::text, end_time::text, break_start::text, break_end::text
      from public.weekly_hours where barber_id in ${db(ids)} and weekday = ${weekdayOf(date)}
    `,
    db<{ barber_id: string }[]>`
      select barber_id from public.barber_time_off where barber_id in ${db(ids)} and day = ${date}::date
    `,
    db<{ day: string }[]>`
      select day::text from public.shop_closed_days where shop_id = ${shopId} and day = ${date}::date
    `,
    db<{ id: string; barber_id: string; kind: string; starts_at: Date; blocked_until: Date }[]>`
      select id, barber_id, kind, starts_at, blocked_until from public.bookings
      where barber_id in ${db(ids)} and status <> 'cancelled'
        and starts_at < ${dayEnd} and blocked_until > ${dayStart}
        ${excludeBookingId ? db`and id <> ${excludeBookingId}` : db``}
    `,
  ]);

  const shopClosed = closedRows.length > 0;
  const off = new Set(offRows.map((r) => r.barber_id));

  return {
    shop,
    service,
    offers: offers.map((o) => {
      const h = hoursRows.find((r) => r.barber_id === o.barber_id);
      const hours: DayHours | null = h
        ? {
            start: timeToMinutes(h.start_time),
            end: timeToMinutes(h.end_time),
            breakStart: h.break_start ? timeToMinutes(h.break_start) : null,
            breakEnd: h.break_end ? timeToMinutes(h.break_end) : null,
          }
        : null;
      const mine = busyRows.filter((b) => b.barber_id === o.barber_id);
      const busy: Interval[] = mine.map((b) => ({ start: b.starts_at, end: b.blocked_until }));
      const durationMin = o.duration_override_min ?? service.duration_min;
      return {
        barberId: o.barber_id,
        displayName: o.display_name,
        sortOrder: o.sort_order,
        durationMin,
        bufferMin: service.buffer_min,
        priceCents: effectivePrice(o, now).priceCents,
        bookingsThatDay: mine.filter((b) => b.kind === "booking" && b.starts_at >= dayStart && b.starts_at < dayEnd).length,
        slots: computeSlots({
          date,
          tz: shop.timezone,
          hours,
          dayOff: shopClosed || off.has(o.barber_id),
          durationMin,
          bufferMin: service.buffer_min,
          busy,
          now,
        }),
      };
    }),
  };
}

type StaffRole = { owner: boolean; barberId: string | null };

async function staffRole(db: Db, userId: string, shopId: string): Promise<StaffRole | null> {
  const [row] = await db<{ role: string; barber_id: string | null }[]>`
    select m.role, b.id as barber_id
    from public.shop_members m
    left join public.barbers b on b.shop_id = m.shop_id and b.user_id = m.user_id
    where m.shop_id = ${shopId} and m.user_id = ${userId}
  `;
  return row ? { owner: row.role === "owner", barberId: row.barber_id } : null;
}

/** Owners may act on any Barber in their Shop; a Barber only on themselves. */
async function authorizeForBarber(db: Db, userId: string, shopId: string, barberId: string): Promise<StaffRole> {
  const role = await staffRole(db, userId, shopId);
  if (!role || (!role.owner && role.barberId !== barberId)) throw forbidden();
  return role;
}

function assertDate(date: string): asserts date is LocalDate {
  if (!isLocalDate(date)) throw invalid("Invalid date");
}

// ------------------------------------------------------------------ the engine

export function createBookingEngine(sql: Sql) {
  /** Shop page data: Services with "from" prices and Barbers with profiles. No business rules here beyond pricing. */
  async function getShopCatalog(slug: string, now: Date) {
    const [shop] = await sql<ShopRow[]>`
      select id, slug, name, phone, address, timezone, cancel_cutoff_minutes, sms_enabled, status, stripe_account_id
      from public.shops where slug = ${slug} and status = 'active'
    `;
    if (!shop) return null;

    const [services, barbers, gallery, offers] = await Promise.all([
      sql<ServiceRow[]>`
        select id, name_en, name_es, duration_min, buffer_min, active from public.services
        where shop_id = ${shop.id} and active order by sort_order, name_en
      `,
      sql<{ id: string; display_name: string; bio: string; photo_url: string | null; specialties: string[] }[]>`
        select id, display_name, bio, photo_url, specialties from public.barbers
        where shop_id = ${shop.id} and active order by sort_order, display_name
      `,
      sql<{ barber_id: string; url: string }[]>`
        select g.barber_id, g.url from public.barber_gallery g
        join public.barbers b on b.id = g.barber_id and b.active
        where g.shop_id = ${shop.id} order by g.position
      `,
      sql<(OfferRow & { service_id: string })[]>`
        select bs.barber_id, b.display_name, b.sort_order, bs.service_id, bs.price_cents,
               bs.duration_override_min, bs.special_price_cents, bs.special_ends_at
        from public.barber_services bs join public.barbers b on b.id = bs.barber_id and b.active
        where bs.shop_id = ${shop.id}
      `,
    ]);

    return {
      shop: {
        id: shop.id,
        slug: shop.slug,
        name: shop.name,
        phone: shop.phone,
        address: shop.address,
        timezone: shop.timezone,
        cancelCutoffMinutes: shop.cancel_cutoff_minutes,
        onlinePayments: shop.stripe_account_id !== null,
      },
      services: services
        .map((s) => {
          const prices = offers
            .filter((o) => o.service_id === s.id)
            .map((o) => ({ ...effectivePrice(o, now), durationMin: o.duration_override_min ?? s.duration_min }));
          if (prices.length === 0) return null;
          const cheapest = prices.reduce((a, b) => (b.priceCents < a.priceCents ? b : a));
          return {
            id: s.id,
            nameEn: s.name_en,
            nameEs: s.name_es,
            durationMin: s.duration_min,
            fromPriceCents: cheapest.priceCents,
            regularPriceCents: cheapest.regularPriceCents,
            specialEndsAt: cheapest.specialEndsAt?.toISOString() ?? null,
            pricesVary: new Set(prices.map((p) => p.priceCents)).size > 1,
          };
        })
        .filter((s) => s !== null),
      barbers: barbers.map((b) => ({
        id: b.id,
        displayName: b.display_name,
        bio: b.bio,
        photoUrl: b.photo_url,
        specialties: b.specialties,
        gallery: gallery.filter((g) => g.barber_id === b.id).map((g) => g.url),
        services: Object.fromEntries(
          offers
            .filter((o) => o.barber_id === b.id)
            .map((o) => {
              const p = effectivePrice(o, now);
              return [
                o.service_id,
                {
                  priceCents: p.priceCents,
                  regularPriceCents: p.regularPriceCents,
                  specialEndsAt: p.specialEndsAt?.toISOString() ?? null,
                },
              ];
            }),
        ),
      })),
    };
  }

  /** Free start times for one local day. barberId "any" merges all Barbers who offer the Service. */
  async function getAvailability(args: { shopId: string; serviceId: string; barberId: string | "any"; date: string; now: Date }) {
    assertDate(args.date);
    const { shop, offers } = await loadDay(sql, {
      shopId: args.shopId,
      serviceId: args.serviceId,
      date: args.date,
      barberId: args.barberId === "any" ? undefined : args.barberId,
      now: args.now,
    });

    const byTime = new Map<number, string[]>();
    for (const o of offers) {
      for (const s of o.slots) byTime.set(s.getTime(), [...(byTime.get(s.getTime()) ?? []), o.barberId]);
    }
    const slots: Slot[] = [...byTime.entries()]
      .sort(([a], [b]) => a - b)
      .map(([ms, barberIds]) => {
        const d = new Date(ms);
        return { startsAt: d.toISOString(), time: toLocal(d, shop.timezone).time, barberIds };
      });
    return { date: args.date, timezone: shop.timezone, slots };
  }

  async function createBooking(args: {
    shopId: string;
    serviceId: string;
    barberId: string | "any";
    startsAt: Date;
    client: { name: string; phone: string };
    paymentMethod: PaymentMethod;
    now: Date;
  }): Promise<{ booking: BookingSummary; manageToken: string }> {
    const { shopId, serviceId, startsAt, now } = args;
    const name = args.client.name.trim().replace(/\s+/g, " ");
    if (name.length < 1 || name.length > 80) throw invalid("Please enter your name.");
    const phone = normalizePhone(args.client.phone);
    if (!phone) throw invalid("Please enter a valid phone number.");
    if (Number.isNaN(startsAt.getTime())) throw invalid("Invalid time");

    const { earliest, latest } = bookingWindow(now);
    if (startsAt < earliest || startsAt > latest) {
      throw new BookingError("OUTSIDE_WINDOW", "Bookings must be at least 30 minutes and at most 30 days ahead.");
    }

    const shop = await loadShop(sql, shopId);
    if (args.paymentMethod === "online" && !shop.stripe_account_id) throw invalid("Online payment is not available.");

    const date = toLocal(startsAt, shop.timezone).date;
    const { offers } = await loadDay(sql, {
      shopId,
      serviceId,
      date,
      barberId: args.barberId === "any" ? undefined : args.barberId,
      now,
    });

    // Barbers free at that exact time. "Any": fewest Bookings that day first, then list order.
    const candidates = offers
      .filter((o) => o.slots.some((s) => s.getTime() === startsAt.getTime()))
      .sort((a, b) => a.bookingsThatDay - b.bookingsThatDay || a.sortOrder - b.sortOrder || a.barberId.localeCompare(b.barberId));
    if (candidates.length === 0) throw slotTaken();

    for (const offer of candidates) {
      const token = newManageToken();
      try {
        const booking = await sql.begin(async (tx) => {
          // Upserting the Client row locks it until commit, so two Bookings for one
          // phone are counted one after the other (the unpaid limit cannot be raced).
          const [client] = await tx<{ id: string; blocked: boolean; sms_opt_out: boolean }[]>`
            insert into public.clients (shop_id, name, phone_e164) values (${shopId}, ${name}, ${phone})
            on conflict (shop_id, phone_e164) do update set name = excluded.name
            returning id, blocked, sms_opt_out
          `;
          if (client.blocked) {
            throw new BookingError("PHONE_BLOCKED", "This number cannot book online. Please call the shop.");
          }
          const [{ unpaid }] = await tx<{ unpaid: number }[]>`
            select count(*)::int as unpaid from public.bookings
            where client_id = ${client.id} and kind = 'booking' and status = 'confirmed'
              and payment_status = 'unpaid' and starts_at > ${now}
          `;
          if (unpaid >= 2) {
            throw new BookingError("UNPAID_LIMIT", "You already have 2 upcoming unpaid bookings at this shop.");
          }

          const endsAt = new Date(startsAt.getTime() + offer.durationMin * MINUTE);
          const blockedUntil = new Date(endsAt.getTime() + offer.bufferMin * MINUTE);
          await lockBarberCalendar(tx, offer.barberId);
          const [b] = await tx<BookingRow[]>`
            insert into public.bookings
              (shop_id, barber_id, service_id, client_id, kind, starts_at, ends_at, blocked_until,
               price_cents, payment_method, manage_token_hash)
            values
              (${shopId}, ${offer.barberId}, ${serviceId}, ${client.id}, 'booking', ${startsAt}, ${endsAt}, ${blockedUntil},
               ${offer.priceCents}, ${args.paymentMethod}, ${hashToken(token)})
            returning *
          `;

          await scheduleReminder(tx, b, now);
          await writeOutbox(tx, shopId, b.id, "barber_alert", { event: "created", barberId: b.barber_id });
          if (shop.sms_enabled && !client.sms_opt_out) {
            await writeOutbox(tx, shopId, b.id, "sms_confirmation", { phone });
          }
          return b;
        });
        return { booking: toSummary(booking), manageToken: token };
      } catch (e) {
        if (pgCode(e) === PG_EXCLUSION_VIOLATION) continue; // lost the race for this Barber; try the next one
        throw e;
      }
    }
    throw slotTaken();
  }

  /** Lock the Booking and check the caller may change it. */
  async function lockForChange(tx: Db, actor: Actor, bookingId: string | undefined, now: Date) {
    const rows =
      actor.kind === "client"
        ? await tx<(BookingRow & ShopFields)[]>`
            select b.*, s.cancel_cutoff_minutes, s.sms_enabled, s.timezone, c.sms_opt_out, c.phone_e164
            from public.bookings b
            join public.shops s on s.id = b.shop_id
            left join public.clients c on c.id = b.client_id
            where b.manage_token_hash = ${hashToken(actor.token)}
            for update of b
          `
        : await tx<(BookingRow & ShopFields)[]>`
            select b.*, s.cancel_cutoff_minutes, s.sms_enabled, s.timezone, c.sms_opt_out, c.phone_e164
            from public.bookings b
            join public.shops s on s.id = b.shop_id
            left join public.clients c on c.id = b.client_id
            where b.id = ${bookingId ?? null}
            for update of b
          `;
    const b = rows[0];
    if (!b) throw notFound("Booking");

    let cancelledBy: "client" | "barber" | "owner" = "client";
    if (actor.kind === "staff") {
      const role = await authorizeForBarber(tx, actor.userId, b.shop_id, b.barber_id);
      cancelledBy = role.owner ? "owner" : "barber";
    }
    if (b.status !== "confirmed") throw new BookingError("BOOKING_NOT_ACTIVE", "This booking can no longer be changed.");
    if (actor.kind === "client") {
      const cutoff = new Date(b.starts_at.getTime() - b.cancel_cutoff_minutes * MINUTE);
      if (now > cutoff) {
        throw new BookingError("CUTOFF_PASSED", "It is too late to change this booking online. Please call the shop.");
      }
    }
    return { b, cancelledBy };
  }
  type ShopFields = { cancel_cutoff_minutes: number; sms_enabled: boolean; timezone: string; sms_opt_out: boolean | null; phone_e164: string | null };

  async function cancelBooking(args: { actor: Actor; bookingId?: string; now: Date }): Promise<BookingSummary> {
    const { actor, now } = args;
    const row = await sql.begin(async (tx) => {
      const { b, cancelledBy } = await lockForChange(tx, actor, args.bookingId, now);
      const [updated] = await tx<BookingRow[]>`
        update public.bookings set status = 'cancelled', cancelled_by = ${cancelledBy}, cancelled_at = ${now}
        where id = ${b.id} returning *
      `;
      await tx`delete from public.scheduled_messages where booking_id = ${b.id} and sent_at is null`;

      // Client before the cutoff (checked above) or any staff cancel: full automatic refund.
      if (b.payment_status === "paid") {
        await writeOutbox(tx, b.shop_id, b.id, "refund_requested", { amountCents: b.price_cents, reason: `cancelled_by_${cancelledBy}` });
      }
      await writeOutbox(tx, b.shop_id, b.id, "barber_alert", { event: "cancelled", barberId: b.barber_id, by: cancelledBy });
      if (cancelledBy !== "client" && b.sms_enabled && b.phone_e164 && !b.sms_opt_out) {
        await writeOutbox(tx, b.shop_id, b.id, "sms_cancelled", { phone: b.phone_e164 });
      }
      return updated;
    });
    return toSummary(row);
  }

  async function rescheduleBooking(args: { actor: Actor; bookingId?: string; newStartsAt: Date; now: Date }): Promise<BookingSummary> {
    const { actor, newStartsAt, now } = args;
    const { earliest, latest } = bookingWindow(now);
    if (actor.kind === "client" && (newStartsAt < earliest || newStartsAt > latest)) {
      throw new BookingError("OUTSIDE_WINDOW", "Bookings must be at least 30 minutes and at most 30 days ahead.");
    }
    try {
      const row = await sql.begin(async (tx) => {
        const { b, cancelledBy } = await lockForChange(tx, actor, args.bookingId, now);
        const { offers } = await loadDay(tx, {
          shopId: b.shop_id,
          serviceId: b.service_id,
          date: toLocal(newStartsAt, b.timezone).date,
          barberId: b.barber_id,
          excludeBookingId: b.id,
          now,
        });
        const offer = offers[0];
        if (!offer || !offer.slots.some((s) => s.getTime() === newStartsAt.getTime())) throw slotTaken();

        const endsAt = new Date(newStartsAt.getTime() + offer.durationMin * MINUTE);
        const blockedUntil = new Date(endsAt.getTime() + offer.bufferMin * MINUTE);
        await lockBarberCalendar(tx, b.barber_id);
        // Same Barber, same Service, same price and payment.
        const [updated] = await tx<BookingRow[]>`
          update public.bookings set starts_at = ${newStartsAt}, ends_at = ${endsAt}, blocked_until = ${blockedUntil}
          where id = ${b.id} returning *
        `;
        await scheduleReminder(tx, updated, now);
        await writeOutbox(tx, b.shop_id, b.id, "barber_alert", {
          event: "rescheduled",
          barberId: b.barber_id,
          by: cancelledBy,
          from: b.starts_at.toISOString(),
        });
        if (cancelledBy !== "client" && b.sms_enabled && b.phone_e164 && !b.sms_opt_out) {
          await writeOutbox(tx, b.shop_id, b.id, "sms_rescheduled", { phone: b.phone_e164 });
        }
        return updated;
      });
      return toSummary(row);
    } catch (e) {
      if (pgCode(e) === PG_EXCLUSION_VIOLATION) throw slotTaken();
      throw e;
    }
  }

  /** A Client who walked in. Blocks the time like a Booking; no grid or notice rules. */
  async function logWalkIn(args: { userId: string; shopId: string; barberId: string; serviceId: string; startsAt?: Date; now: Date }) {
    const { userId, shopId, barberId, serviceId, now } = args;
    const startsAt = new Date(Math.floor((args.startsAt ?? now).getTime() / MINUTE) * MINUTE);
    try {
      const row = await sql.begin(async (tx) => {
        await authorizeForBarber(tx, userId, shopId, barberId);
        const [offer] = await tx<(OfferRow & { duration_min: number; buffer_min: number })[]>`
          select bs.price_cents, bs.duration_override_min, bs.special_price_cents, bs.special_ends_at,
                 s.duration_min, s.buffer_min
          from public.barber_services bs join public.services s on s.id = bs.service_id
          where bs.shop_id = ${shopId} and bs.barber_id = ${barberId} and bs.service_id = ${serviceId}
        `;
        if (!offer) throw notFound("Service");
        const endsAt = new Date(startsAt.getTime() + (offer.duration_override_min ?? offer.duration_min) * MINUTE);
        const blockedUntil = new Date(endsAt.getTime() + offer.buffer_min * MINUTE);
        await lockBarberCalendar(tx, barberId);
        const [b] = await tx<BookingRow[]>`
          insert into public.bookings
            (shop_id, barber_id, service_id, kind, status, starts_at, ends_at, blocked_until, price_cents, payment_method)
          values
            (${shopId}, ${barberId}, ${serviceId}, 'walk_in', 'arrived', ${startsAt}, ${endsAt}, ${blockedUntil},
             ${effectivePrice(offer, now).priceCents}, 'in_person')
          returning *
        `;
        return b;
      });
      return toSummary(row);
    } catch (e) {
      if (pgCode(e) === PG_EXCLUSION_VIOLATION) throw slotTaken();
      throw e;
    }
  }

  async function setAttendance(args: { userId: string; bookingId: string; status: "arrived" | "no_show" }) {
    return sql.begin(async (tx) => {
      const [b] = await tx<BookingRow[]>`select * from public.bookings where id = ${args.bookingId} for update`;
      if (!b) throw notFound("Booking");
      await authorizeForBarber(tx, args.userId, b.shop_id, b.barber_id);
      if (b.status === "cancelled") throw new BookingError("BOOKING_NOT_ACTIVE", "This booking was cancelled.");
      const [updated] = await tx<BookingRow[]>`
        update public.bookings set status = ${args.status} where id = ${b.id} returning *
      `;
      return toSummary(updated);
    });
  }

  async function addBarberDayOff(args: { userId: string; shopId: string; barberId: string; date: string }) {
    assertDate(args.date);
    const date = args.date;
    await authorizeForBarber(sql, args.userId, args.shopId, args.barberId);
    try {
      await sql`
        insert into public.barber_time_off (shop_id, barber_id, day) values (${args.shopId}, ${args.barberId}, ${date}::date)
        on conflict do nothing
      `;
    } catch (e) {
      if (pgCode(e) === PG_DAY_HAS_BOOKINGS) throw dayHasBookings(e);
      throw e;
    }
  }

  async function addShopClosedDay(args: { userId: string; shopId: string; date: string }) {
    assertDate(args.date);
    const date = args.date;
    const role = await staffRole(sql, args.userId, args.shopId);
    if (!role?.owner) throw forbidden();
    try {
      await sql`insert into public.shop_closed_days (shop_id, day) values (${args.shopId}, ${date}::date) on conflict do nothing`;
    } catch (e) {
      if (pgCode(e) === PG_DAY_HAS_BOOKINGS) throw dayHasBookings(e);
      throw e;
    }
  }

  /** Booking details for the Client's manage link. */
  async function getBookingByToken(token: string, now: Date) {
    const [b] = await sql<
      (BookingRow & {
        cancel_cutoff_minutes: number;
        timezone: string;
        shop_name: string;
        shop_phone: string | null;
        shop_slug: string;
        barber_name: string;
        name_en: string;
        name_es: string;
        client_name: string | null;
      })[]
    >`
      select b.*, s.cancel_cutoff_minutes, s.timezone, s.name as shop_name, s.phone as shop_phone, s.slug as shop_slug,
             br.display_name as barber_name, sv.name_en, sv.name_es, c.name as client_name
      from public.bookings b
      join public.shops s on s.id = b.shop_id
      join public.barbers br on br.id = b.barber_id
      join public.services sv on sv.id = b.service_id
      left join public.clients c on c.id = b.client_id
      where b.manage_token_hash = ${hashToken(token)}
    `;
    if (!b) return null;
    const cutoff = new Date(b.starts_at.getTime() - b.cancel_cutoff_minutes * MINUTE);
    return {
      booking: toSummary(b),
      shop: { name: b.shop_name, phone: b.shop_phone, slug: b.shop_slug, timezone: b.timezone, cancelCutoffMinutes: b.cancel_cutoff_minutes },
      barberName: b.barber_name,
      serviceName: { en: b.name_en, es: b.name_es },
      clientName: b.client_name,
      canChange: b.status === "confirmed" && now <= cutoff,
      cutoffAt: cutoff,
    };
  }

  /** Claim due reminders exactly once, even if two cron runs overlap. */
  async function claimDueReminders(args: { now: Date; limit?: number }) {
    return sql<{ id: string; booking_id: string; shop_id: string; send_at: Date }[]>`
      update public.scheduled_messages sm set sent_at = ${args.now}
      where sm.id in (
        select id from public.scheduled_messages
        where sent_at is null and send_at <= ${args.now}
        order by send_at
        limit ${args.limit ?? 50}
        for update skip locked
      )
      returning sm.id, sm.booking_id, sm.shop_id, sm.send_at
    `;
  }

  return {
    getShopCatalog,
    getAvailability,
    createBooking,
    cancelBooking,
    rescheduleBooking,
    logWalkIn,
    setAttendance,
    addBarberDayOff,
    addShopClosedDay,
    getBookingByToken,
    claimDueReminders,
  };
}

function dayHasBookings(e: unknown) {
  const detail = typeof e === "object" && e !== null && "detail" in e ? Number((e as { detail: unknown }).detail) : NaN;
  return new BookingError(
    "DAY_HAS_BOOKINGS",
    "There are bookings on that day. Cancel or move them first.",
    Number.isFinite(detail) ? { count: detail } : undefined,
  );
}

export type BookingEngine = ReturnType<typeof createBookingEngine>;
