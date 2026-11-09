import type { Sql } from "postgres";
import { requireOwner } from "@/server/booking-engine/access";
import { invalid } from "@/server/booking-engine/errors";
import { addDays, isLocalDate, toLocal, weekdayOf, type LocalDate } from "@/server/booking-engine/time";

/**
 * Reporting: the Owner's numbers (dashboard, daily email) and their data export.
 * Owner only: Barbers never see the Shop's totals.
 *
 * A Booking counts on its own local day. Time saved = Bookings made online
 * (not walk-ins, not cancelled) × the Shop's minutes per manual booking.
 * No-shows are reported separately; they are data, not a success metric.
 */

export type PeriodStats = { bookings: number; walkIns: number; noShows: number; timeSavedMin: number };

type ShopActor = { userId: string; shopId: string };
type DayRow = { day: string; bookings: number; walk_ins: number; no_shows: number; minutes: number };

function sumDays(days: DayRow[]): PeriodStats {
  return days.reduce<PeriodStats>(
    (t, d) => ({
      bookings: t.bookings + d.bookings,
      walkIns: t.walkIns + d.walk_ins,
      noShows: t.noShows + d.no_shows,
      timeSavedMin: t.timeSavedMin + d.bookings * d.minutes,
    }),
    { bookings: 0, walkIns: 0, noShows: 0, timeSavedMin: 0 },
  );
}

/** Quote a CSV cell, and defuse cells a spreadsheet would run as a formula. */
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) && !/^\+\d+$/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function createReporting(sql: Sql) {
  /** Counts per local day in [from, to). */
  async function statsByDay(shopId: string, from: LocalDate, to: LocalDate) {
    return sql<DayRow[]>`
      select (b.starts_at at time zone s.timezone)::date::text as day,
             count(*) filter (where b.kind = 'booking')::int as bookings,
             count(*) filter (where b.kind = 'walk_in')::int as walk_ins,
             count(*) filter (where b.status = 'no_show')::int as no_shows,
             max(s.manual_booking_minutes)::int as minutes
      from public.bookings b
      join public.shops s on s.id = b.shop_id
      where b.shop_id = ${shopId}
        and b.status <> 'cancelled'
        and (b.starts_at at time zone s.timezone)::date >= ${from}::date
        and (b.starts_at at time zone s.timezone)::date < ${to}::date
      group by 1
    `;
  }

  /** Bookings per week (Monday to Sunday, New York time) for the last `weeks` weeks, oldest first. */
  async function weeklyStats(args: ShopActor & { weeks: number; now: Date }): Promise<(PeriodStats & { weekStart: LocalDate })[]> {
    await requireOwner(sql, args.userId, args.shopId);
    const weeks = Math.min(Math.max(Math.trunc(args.weeks), 1), 52);
    const [shop] = await sql<{ timezone: string }[]>`select timezone from public.shops where id = ${args.shopId}`;
    const today = toLocal(args.now, shop.timezone).date;
    const thisMonday = addDays(today, -((weekdayOf(today) + 6) % 7));
    const first = addDays(thisMonday, -7 * (weeks - 1));
    const days = await statsByDay(args.shopId, first, addDays(thisMonday, 7));

    return Array.from({ length: weeks }, (_, i) => {
      const weekStart = addDays(first, 7 * i);
      const weekEnd = addDays(weekStart, 7);
      return { weekStart, ...sumDays(days.filter((d) => d.day >= weekStart && d.day < weekEnd)) };
    });
  }

  /** One local day, for the Owner's daily email. */
  async function dayStats(args: ShopActor & { date: LocalDate }): Promise<PeriodStats & { date: LocalDate }> {
    await requireOwner(sql, args.userId, args.shopId);
    if (!isLocalDate(args.date)) throw invalid("Date must be YYYY-MM-DD.");
    return { date: args.date, ...sumDays(await statsByDay(args.shopId, args.date, addDays(args.date, 1))) };
  }

  /** Every Client of the Shop as CSV (the Shop owns its data). */
  async function exportClientsCsv(args: ShopActor): Promise<string> {
    await requireOwner(sql, args.userId, args.shopId);
    const rows = await sql<
      { name: string; phone_e164: string; bookings: number; last_booking: string | null; sms_opt_out: boolean; blocked: boolean }[]
    >`
      select c.name, c.phone_e164, c.sms_opt_out, c.blocked,
             count(b.id)::int as bookings,
             max((b.starts_at at time zone s.timezone)::date)::text as last_booking
      from public.clients c
      join public.shops s on s.id = c.shop_id
      left join public.bookings b on b.client_id = c.id and b.status <> 'cancelled'
      where c.shop_id = ${args.shopId}
      group by c.id, c.name, c.phone_e164, c.sms_opt_out, c.blocked
      order by c.name
    `;
    const yesNo = (v: boolean) => (v ? "yes" : "no");
    const lines = [
      "name,phone,bookings,last_booking,texts_opted_out,blocked",
      ...rows.map((r) =>
        [csvCell(r.name), r.phone_e164, String(r.bookings), r.last_booking ?? "", yesNo(r.sms_opt_out), yesNo(r.blocked)].join(","),
      ),
    ];
    return lines.join("\r\n") + "\r\n";
  }

  return { weeklyStats, dayStats, exportClientsCsv };
}

export type Reporting = ReturnType<typeof createReporting>;
