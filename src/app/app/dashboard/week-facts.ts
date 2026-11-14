import type { Locale } from "@/lib/i18n/dictionaries";
import type { DashboardWeek } from "@/server/reporting";

export const intl = (locale: Locale) => (locale === "es" ? "es-US" : "en-US");
/** Noon UTC keeps a local date on its own calendar day whatever the zone. */
export const noon = (date: string) => new Date(`${date}T12:00:00Z`);
/** "11 AM", "11 a. m.": a whole local hour in the page's language. */
export const hourLabel = (hour: number, locale: Locale) =>
  new Intl.DateTimeFormat(intl(locale), { timeZone: "UTC", hour: "numeric" }).format(new Date(Date.UTC(2000, 0, 1, hour)));

/*
 * Small facts read straight off one Dashboard week, for the highlights strip and the busy-hours
 * map. Nothing here is estimated: each fact is a count the week already holds. Ties go to the
 * earlier day / earlier hour / earlier Barber in sort order, and a fact is null when its count
 * is zero (an empty week has no "busiest day").
 */

/** The day with the most Bookings. */
export function busiestDay(week: DashboardWeek) {
  let best: DashboardWeek["days"][number] | null = null;
  for (const d of week.days) if (d.bookings > (best?.bookings ?? 0)) best = d;
  return best ? { date: best.date, bookings: best.bookings } : null;
}

/** Bookings + Walk-ins per start hour, summed over the week. */
export function hourTotals(week: DashboardWeek) {
  const totals = new Map<number, number>();
  for (const d of week.days) for (const h of d.byHour) totals.set(h.hour, (totals.get(h.hour) ?? 0) + h.bookings + h.walkIns);
  return totals;
}

/** The start hour with the most Bookings + Walk-ins across the week. */
export function busiestHour(week: DashboardWeek) {
  let best: { hour: number; visits: number } | null = null;
  for (const [hour, visits] of [...hourTotals(week)].sort((a, b) => a[0] - b[0])) if (visits > (best?.visits ?? 0)) best = { hour, visits };
  return best;
}

/** The Barber (or Barbers, when tied) with the most Bookings. */
export function topBarbers(week: DashboardWeek) {
  const max = Math.max(0, ...week.barbers.map((b) => b.bookings));
  if (max === 0) return null;
  return { bookings: max, barbers: week.barbers.filter((b) => b.bookings === max) };
}

/** Competition ranks (1, 2, 2, 4) by Bookings; 0 Bookings gets no rank. */
export function ranks(week: DashboardWeek) {
  const out = new Map<string, number>();
  for (const b of week.barbers) if (b.bookings > 0) out.set(b.barberId, 1 + week.barbers.filter((o) => o.bookings > b.bookings).length);
  return out;
}
