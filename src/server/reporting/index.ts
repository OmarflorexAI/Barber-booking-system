import type { Sql } from "postgres";
import { requireOwner, requirePlatformAdmin } from "@/server/booking-engine/access";
import { invalid } from "@/server/booking-engine/errors";
import { csvCell } from "@/lib/csv";
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
type DayRow = {
  day: string;
  barber_id: string | null;
  hour: number | null;
  bookings: number;
  walk_ins: number;
  no_shows: number;
  minutes: number;
};

/** One Barber's counts on one day of the Dashboard. */
export type DashboardBarberDay = { barberId: string; bookings: number; walkIns: number; noShows: number };
/** One local start hour (0-23, New York wall clock) of one day of the Dashboard. */
export type DashboardHour = { hour: number; bookings: number; walkIns: number };

/** One week of the Owner Dashboard (U2): totals, the week before, each day, each Barber. */
export type DashboardWeek = {
  weekStart: LocalDate;
  totals: PeriodStats;
  previous: PeriodStats;
  days: {
    date: LocalDate;
    bookings: number;
    walkIns: number;
    noShows: number;
    timeSavedMin: number;
    /** Every active Barber, in the same order as `barbers`, zeros included. */
    byBarber: DashboardBarberDay[];
    /** The week's open span (see `hours`), one entry per hour, zeros included. */
    byHour: DashboardHour[];
  }[];
  /**
   * The local hours every `byHour` covers, the same for all 7 days: from the earliest
   * opening to the latest closing across the active Barbers' weekly hours, widened to
   * any hour that has a Booking. `null` when there are neither hours nor Bookings.
   */
  hours: { first: number; last: number } | null;
  barbers: {
    barberId: string;
    name: string;
    photoUrl: string | null;
    bookings: number;
    walkIns: number;
    noShows: number;
    /** Bookings (not Walk-ins) per day, Monday to Sunday: 7 numbers for a sparkline. */
    days: number[];
  }[];
};

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

export function createReporting(sql: Sql) {
  /**
   * Counts per local day in [from, to), optionally split per Barber. The one place
   * that knows what counts: every report goes through here.
   */
  async function statsByDay(shopId: string, from: LocalDate, to: LocalDate, split: { barber?: boolean; hour?: boolean } = {}) {
    return sql<DayRow[]>`
      select (b.starts_at at time zone s.timezone)::date::text as day,
             ${split.barber ? sql`b.barber_id` : sql`null::uuid`} as barber_id,
             ${split.hour ? sql`extract(hour from b.starts_at at time zone s.timezone)::int` : sql`null::int`} as hour,
             count(*) filter (where b.kind = 'booking')::int as bookings,
             count(*) filter (where b.kind = 'walk_in')::int as walk_ins,
             count(*) filter (where b.status = 'no_show')::int as no_shows,
             max(s.manual_booking_minutes)::int as minutes
      from public.bookings b
      join public.shops s on s.id = b.shop_id
      where b.shop_id = ${shopId}
        and b.status not in ('cancelled', 'pending_payment')
        and (b.starts_at at time zone s.timezone)::date >= ${from}::date
        and (b.starts_at at time zone s.timezone)::date < ${to}::date
      group by 1, 2, 3
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

  /**
   * The Owner Dashboard for one Monday-to-Sunday week (New York days): totals and the
   * week before, per day, and per active Barber (sort order, Barbers with nothing included).
   * Each day drills down per Barber and per local start hour. Two queries, run together.
   */
  async function dashboardWeek(args: ShopActor & { weekStart: LocalDate }): Promise<DashboardWeek> {
    await requireOwner(sql, args.userId, args.shopId);
    const { weekStart } = args;
    if (!isLocalDate(weekStart) || weekdayOf(weekStart) !== 1) throw invalid("Week must start on a Monday (YYYY-MM-DD).");

    const [rows, barberRows] = await Promise.all([
      statsByDay(args.shopId, addDays(weekStart, -7), addDays(weekStart, 7), { barber: true, hour: true }),
      // first_hour / end_hour: this Barber's weekly hours as whole local hours [first, end).
      sql<{ id: string; display_name: string; photo_url: string | null; first_hour: number | null; end_hour: number | null }[]>`
        select b.id, b.display_name, b.photo_url,
               min(extract(hour from wh.start_time))::int as first_hour,
               max(ceil(extract(epoch from wh.end_time) / 3600))::int as end_hour
        from public.barbers b
        left join public.weekly_hours wh on wh.barber_id = b.id
        where b.shop_id = ${args.shopId} and b.active
        group by b.id
        order by b.sort_order, b.id
      `,
    ]);
    const week = rows.filter((r) => r.day >= weekStart);

    const spanHours = [
      ...barberRows.flatMap((b) => (b.first_hour === null || b.end_hour === null ? [] : [b.first_hour, b.end_hour - 1])),
      ...week.map((r) => r.hour ?? 0),
    ];
    const hours = spanHours.length ? { first: Math.min(...spanHours), last: Math.max(...spanHours) } : null;
    const hourList = hours ? Array.from({ length: hours.last - hours.first + 1 }, (_, i) => hours.first + i) : [];
    const dates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return {
      weekStart,
      totals: sumDays(week),
      previous: sumDays(rows.filter((r) => r.day < weekStart)),
      days: dates.map((date) => {
        const day = week.filter((r) => r.day === date);
        return {
          date,
          ...sumDays(day),
          byBarber: barberRows.map((b) => {
            const { bookings, walkIns, noShows } = sumDays(day.filter((r) => r.barber_id === b.id));
            return { barberId: b.id, bookings, walkIns, noShows };
          }),
          byHour: hourList.map((hour) => {
            const { bookings, walkIns } = sumDays(day.filter((r) => r.hour === hour));
            return { hour, bookings, walkIns };
          }),
        };
      }),
      hours,
      barbers: barberRows.map((b) => {
        const mine = week.filter((r) => r.barber_id === b.id);
        const { bookings, walkIns, noShows } = sumDays(mine);
        return {
          barberId: b.id,
          name: b.display_name,
          photoUrl: b.photo_url,
          bookings,
          walkIns,
          noShows,
          days: dates.map((date) => sumDays(mine.filter((r) => r.day === date)).bookings),
        };
      }),
    };
  }

  /** Every Client of the Shop as CSV (the Shop owns its data). */
  async function exportClientsCsv(args: ShopActor): Promise<string> {
    await requireOwner(sql, args.userId, args.shopId);
    return clientsCsv(sql, args.shopId);
  }

  /**
   * The same export for our team (e.g. an Owner who is leaving). The caller must be a
   * Platform admin; the platform-admin module logs the support access before calling this.
   */
  async function exportClientsCsvForAdmin(args: ShopActor): Promise<string> {
    await requirePlatformAdmin(sql, args.userId);
    return clientsCsv(sql, args.shopId);
  }

  /** Scheduled job only (the Owner's daily email): one local day, no caller to check. */
  async function dayStatsForScheduledJob(args: { shopId: string; date: LocalDate }): Promise<PeriodStats> {
    return sumDays(await statsByDay(args.shopId, args.date, addDays(args.date, 1)));
  }

  return { weeklyStats, dayStats, dashboardWeek, exportClientsCsv, exportClientsCsvForAdmin, dayStatsForScheduledJob };
}

export type Reporting = ReturnType<typeof createReporting>;

/** The Shop's Clients as CSV. No access check here: the exports below check first. */
async function clientsCsv(sql: Sql, shopId: string): Promise<string> {
  const rows = await sql<
    { name: string; phone_e164: string; bookings: number; no_shows: number; last_booking: string | null; sms_opt_out: boolean; blocked: boolean }[]
  >`
    select c.name, c.phone_e164, c.sms_opt_out, c.blocked,
           count(b.id)::int as bookings,
           count(b.id) filter (where b.status = 'no_show')::int as no_shows,
           max((b.starts_at at time zone s.timezone)::date)::text as last_booking
    from public.clients c
    join public.shops s on s.id = c.shop_id
    left join public.bookings b on b.client_id = c.id and b.status not in ('cancelled', 'pending_payment')
    where c.shop_id = ${shopId}
    group by c.id, c.name, c.phone_e164, c.sms_opt_out, c.blocked
    order by c.name
  `;
  const yesNo = (v: boolean) => (v ? "yes" : "no");
  const lines = [
    "name,phone,bookings,no_shows,last_booking,texts_opted_out,blocked",
    ...rows.map((r) =>
      [csvCell(r.name), r.phone_e164, String(r.bookings), String(r.no_shows), r.last_booking ?? "", yesNo(r.sms_opt_out), yesNo(r.blocked)].join(","),
    ),
  ];
  return lines.join("\r\n") + "\r\n";
}
