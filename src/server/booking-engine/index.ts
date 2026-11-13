import { createHash, randomUUID } from "node:crypto";
import type postgres from "postgres";
import type { ISql, Sql } from "postgres";
import type { Locale } from "@/lib/i18n/dictionaries";
import { normalizePhone } from "@/lib/phone";
import { bookingWindow, computeSlots, RULES, type DayHours, type Interval } from "./availability";
import {
  BookingError,
  invalid,
  notFound,
  pgCode,
  PG_DAY_HAS_BOOKINGS,
  PG_EXCLUSION_VIOLATION,
  slotTaken,
} from "./errors";
import { authorizeForBarber, requireOwner } from "./access";
import { manageTokenFor } from "./manage-token";
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
  status: "pending_payment" | "confirmed" | "cancelled" | "arrived" | "no_show";
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
  payment_account_id: string | null;
  payments_enabled: boolean;
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
  status: "pending_payment" | "confirmed" | "cancelled" | "arrived" | "no_show";
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
    values (${shopId}, ${bookingId}, ${type}, ${db.json(payload as postgres.JSONValue)})
  `;
}

/** Schedule (or reschedule) the 2-hour reminder; skip it when the Booking is less than 2 hours away. */
/** A Booking became real: schedule the reminder, alert the Barber, text the Client (when allowed). */
async function announceConfirmed(db: Db, b: BookingRow, textTo: string | null, now: Date) {
  await scheduleReminder(db, b, now);
  await writeOutbox(db, b.shop_id, b.id, "barber_alert", { event: "created", barberId: b.barber_id });
  if (textTo) await writeOutbox(db, b.shop_id, b.id, "sms_confirmation", { phone: textTo });
}

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
    select id, slug, name, phone, address, timezone, cancel_cutoff_minutes, sms_enabled, status, payment_account_id, payments_enabled
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


function assertDate(date: string): asserts date is LocalDate {
  if (!isLocalDate(date)) throw invalid("Invalid date");
}

// ------------------------------------------------------------------ the engine

export function createBookingEngine(sql: Sql, opts: { manageLinkSecret: string }) {
  /** Shop page data: Services with "from" prices and Barbers with profiles. No business rules here beyond pricing. */
  async function getShopCatalog(slug: string, now: Date) {
    const [shop] = await sql<ShopRow[]>`
      select id, slug, name, phone, address, timezone, cancel_cutoff_minutes, sms_enabled, status, payment_account_id, payments_enabled
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
        onlinePayments: shop.payments_enabled,
        smsEnabled: shop.sms_enabled,
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
    /** The language the Client booked in; their texts use it. */
    locale?: Locale;
    now: Date;
  }): Promise<{ booking: BookingSummary; manageToken: string }> {
    const { shopId, serviceId, startsAt, now } = args;
    if (args.locale !== undefined && args.locale !== "en" && args.locale !== "es") throw invalid("Unknown language.");
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
    if (args.paymentMethod === "online" && !shop.payments_enabled) throw invalid("Online payment is not available.");

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

    const online = args.paymentMethod === "online";
    for (const offer of candidates) {
      const id = randomUUID();
      const token = manageTokenFor(id, opts.manageLinkSecret);
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
            where client_id = ${client.id} and kind = 'booking' and status in ('confirmed', 'pending_payment')
              and payment_status = 'unpaid' and starts_at > ${now}
          `;
          if (unpaid >= 2) {
            throw new BookingError("UNPAID_LIMIT", "You already have 2 upcoming unpaid bookings at this shop.");
          }
          if (!online && shop.payments_enabled) {
            const since = new Date(now.getTime() - RULES.noShowWindowDays * 24 * 60 * MINUTE);
            const [{ missed }] = await tx<{ missed: number }[]>`
              select count(*)::int as missed from public.bookings
              where client_id = ${client.id} and status = 'no_show' and starts_at > ${since} and starts_at <= ${now}
            `;
            if (missed >= RULES.noShowLimit) {
              throw new BookingError("PAY_ONLINE_REQUIRED", "Please pay online to book: this number missed recent visits.");
            }
          }

          const endsAt = new Date(startsAt.getTime() + offer.durationMin * MINUTE);
          const blockedUntil = new Date(endsAt.getTime() + offer.bufferMin * MINUTE);
          await lockBarberCalendar(tx, offer.barberId);
          const [b] = await tx<BookingRow[]>`
            insert into public.bookings
              (id, shop_id, barber_id, service_id, client_id, kind, status, hold_expires_at, starts_at, ends_at, blocked_until,
               price_cents, payment_method, manage_token_hash, locale)
            values
              (${id}, ${shopId}, ${offer.barberId}, ${serviceId}, ${client.id}, 'booking',
               ${online ? "pending_payment" : "confirmed"}, ${online ? new Date(now.getTime() + RULES.paymentHoldMin * MINUTE) : null},
               ${startsAt}, ${endsAt}, ${blockedUntil},
               ${offer.priceCents}, ${args.paymentMethod}, ${hashToken(token)}, ${args.locale ?? "en"})
            returning *
          `;

          // An online Booking only holds the time; it is confirmed (and announced) when paid.
          if (!online) await announceConfirmed(tx, b, shop.sms_enabled && !client.sms_opt_out ? phone : null, now);
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
      if (b.status === "pending_payment") throw new BookingError("BOOKING_NOT_ACTIVE", "This booking is still waiting for its payment.");
      const [updated] = await tx<BookingRow[]>`
        update public.bookings set status = ${args.status} where id = ${b.id} returning *
      `;
      return toSummary(updated);
    });
  }

  /** Staff undo: a Booking marked arrived or no-show goes back to confirmed (so a mistaken no-show stops counting). */
  async function undoAttendance(args: { userId: string; bookingId: string }) {
    return sql.begin(async (tx) => {
      const [b] = await tx<BookingRow[]>`select * from public.bookings where id = ${args.bookingId} for update`;
      if (!b) throw notFound("Booking");
      await authorizeForBarber(tx, args.userId, b.shop_id, b.barber_id);
      if (b.kind === "walk_in") throw invalid("A walk-in can only be removed.");
      if (b.status !== "arrived" && b.status !== "no_show") {
        throw new BookingError("BOOKING_NOT_ACTIVE", "This booking is not marked arrived or no-show.");
      }
      await lockBarberCalendar(tx, b.barber_id);
      const [updated] = await tx<BookingRow[]>`
        update public.bookings set status = 'confirmed' where id = ${b.id} returning *
      `;
      return toSummary(updated);
    });
  }

  /**
   * Remove a Walk-in logged by mistake: cancelled by staff, so the time frees up and it
   * leaves the stats. A Walk-in has no Client, so nothing is texted and no outbox row is written.
   */
  async function removeWalkIn(args: { userId: string; bookingId: string; now: Date }) {
    return sql.begin(async (tx) => {
      const [b] = await tx<BookingRow[]>`select * from public.bookings where id = ${args.bookingId} for update`;
      if (!b) throw notFound("Booking");
      const role = await authorizeForBarber(tx, args.userId, b.shop_id, b.barber_id);
      if (b.kind !== "walk_in") throw invalid("Only a walk-in can be removed. Cancel a booking instead.");
      if (b.status === "cancelled") throw new BookingError("BOOKING_NOT_ACTIVE", "This walk-in was already removed.");
      await lockBarberCalendar(tx, b.barber_id);
      const [updated] = await tx<BookingRow[]>`
        update public.bookings
        set status = 'cancelled', cancelled_by = ${role.owner ? "owner" : "barber"}, cancelled_at = ${args.now}
        where id = ${b.id} returning *
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
    await requireOwner(sql, args.userId, args.shopId);
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
        shop_address: string | null;
        shop_slug: string;
        barber_name: string;
        barber_photo_url: string | null;
        name_en: string;
        name_es: string;
        client_name: string | null;
        cancelled_by: "client" | "barber" | "owner" | "admin" | "system" | null;
        hold_expires_at: Date | null;
      })[]
    >`
      select b.*, s.cancel_cutoff_minutes, s.timezone, s.name as shop_name, s.phone as shop_phone, s.address as shop_address, s.slug as shop_slug,
             br.display_name as barber_name, br.photo_url as barber_photo_url, sv.name_en, sv.name_es, c.name as client_name
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
      shop: { name: b.shop_name, phone: b.shop_phone, address: b.shop_address, slug: b.shop_slug, timezone: b.timezone, cancelCutoffMinutes: b.cancel_cutoff_minutes },
      barberName: b.barber_name,
      barberPhotoUrl: b.barber_photo_url,
      serviceName: { en: b.name_en, es: b.name_es },
      clientName: b.client_name,
      /** Who cancelled it; "system" = the payment hold ran out unpaid and the time was released. */
      cancelledBy: b.cancelled_by,
      /** While `pending_payment`: when the 10-minute hold ends. */
      holdExpiresAt: b.hold_expires_at,
      canChange: b.status === "confirmed" && now <= cutoff,
      cutoffAt: cutoff,
    };
  }

  /**
   * The payment for an online Booking arrived (called by the payments module, inside
   * its transaction). A held Booking becomes confirmed; one whose hold already ran out
   * is refunded in full; a repeat changes nothing.
   */
  async function recordOnlinePayment(
    args: { bookingId: string; paymentRef: string; now: Date },
    db: Db = sql,
  ): Promise<"confirmed" | "refunding" | "already_paid"> {
    const [b] = await db<(BookingRow & { sms_enabled: boolean; sms_opt_out: boolean | null; phone_e164: string | null })[]>`
      select b.*, s.sms_enabled, c.sms_opt_out, c.phone_e164
      from public.bookings b
      join public.shops s on s.id = b.shop_id
      left join public.clients c on c.id = b.client_id
      where b.id = ${args.bookingId}
      for update of b
    `;
    if (!b) throw notFound("Booking");
    if (b.payment_status !== "unpaid") return "already_paid";

    if (b.status === "pending_payment") {
      const [updated] = await db<BookingRow[]>`
        update public.bookings
        set status = 'confirmed', payment_status = 'paid', payment_ref = ${args.paymentRef}, hold_expires_at = null
        where id = ${b.id} returning *
      `;
      await announceConfirmed(db, updated, b.sms_enabled && b.phone_e164 && !b.sms_opt_out ? b.phone_e164 : null, args.now);
      return "confirmed";
    }
    // Paid after the hold was released (or the Booking was otherwise cancelled): give it all back.
    await db`update public.bookings set payment_status = 'paid', payment_ref = ${args.paymentRef} where id = ${b.id}`;
    await writeOutbox(db, b.shop_id, b.id, "refund_requested", { amountCents: b.price_cents, reason: "late_payment" });
    return "refunding";
  }

  /** Scheduled job: cancel online Bookings whose payment hold ran out, freeing the time. */
  async function releaseExpiredHolds(args: { now: Date }): Promise<{ bookingId: string; accountId: string | null; checkoutRef: string | null }[]> {
    const rows = await sql<{ id: string; payment_account_id: string | null; checkout_ref: string | null }[]>`
      update public.bookings b
      set status = 'cancelled', cancelled_by = 'system', cancelled_at = ${args.now}, hold_expires_at = null
      from public.shops s
      where s.id = b.shop_id and b.status = 'pending_payment' and b.hold_expires_at <= ${args.now}
      returning b.id, s.payment_account_id, b.checkout_ref
    `;
    return rows.map((r) => ({ bookingId: r.id, accountId: r.payment_account_id, checkoutRef: r.checkout_ref }));
  }

  return {
    recordOnlinePayment,
    releaseExpiredHolds,
    getShopCatalog,
    getAvailability,
    createBooking,
    cancelBooking,
    rescheduleBooking,
    logWalkIn,
    setAttendance,
    undoAttendance,
    removeWalkIn,
    addBarberDayOff,
    addShopClosedDay,
    getBookingByToken,
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
