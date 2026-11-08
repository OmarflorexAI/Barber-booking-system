import { TZDate } from "@date-fns/tz";

/**
 * Time helpers. The rule everywhere: store and compare instants in UTC,
 * think about the Shop's day in local wall-clock time (America/New_York).
 * Local calendar days are plain "YYYY-MM-DD" strings; local times are "HH:MM".
 */

export type LocalDate = string; // "2026-11-01"
export type LocalTime = string; // "09:30"

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})(?::\d{2})?$/;

export function isLocalDate(s: string): s is LocalDate {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function parseDate(d: LocalDate): [number, number, number] {
  const m = DATE_RE.exec(d);
  if (!m) throw new Error(`bad local date: ${d}`);
  return [+m[1], +m[2], +m[3]];
}

/** "HH:MM" or "HH:MM:SS" (Postgres time) -> minutes since midnight. */
export function timeToMinutes(t: string): number {
  const m = TIME_RE.exec(t);
  if (!m) throw new Error(`bad local time: ${t}`);
  return +m[1] * 60 + +m[2];
}

export function minutesToTime(min: number): LocalTime {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/**
 * The UTC instant for a local wall-clock time, or null when that wall time
 * does not exist (the skipped hour on the spring-forward day).
 */
export function localToUtc(date: LocalDate, minutes: number, tz: string): Date | null {
  const [y, mo, d] = parseDate(date);
  const h = Math.floor(minutes / 60);
  const mi = minutes % 60;
  const t = new TZDate(y, mo - 1, d, h, mi, tz);
  if (t.getFullYear() !== y || t.getMonth() !== mo - 1 || t.getDate() !== d || t.getHours() !== h || t.getMinutes() !== mi) {
    return null;
  }
  return new Date(t.getTime());
}

/** Local calendar parts of a UTC instant. weekday: 0 = Sunday. */
export function toLocal(instant: Date, tz: string): { date: LocalDate; time: LocalTime; minutes: number; weekday: number } {
  const t = new TZDate(instant.getTime(), tz);
  const date = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  const minutes = t.getHours() * 60 + t.getMinutes();
  return { date, time: minutesToTime(minutes), minutes, weekday: t.getDay() };
}

/** Weekday (0 = Sunday) of a local calendar date; independent of time zone. */
export function weekdayOf(date: LocalDate): number {
  const [y, mo, d] = parseDate(date);
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const [y, mo, d] = parseDate(date);
  const u = new Date(Date.UTC(y, mo - 1, d + days));
  return u.toISOString().slice(0, 10);
}

/** [start, end) of a local calendar day as UTC instants (23 or 25 hours on DST days). */
export function localDayRange(date: LocalDate, tz: string): { start: Date; end: Date } {
  const [y, mo, d] = parseDate(date);
  const start = new TZDate(y, mo - 1, d, 0, 0, tz);
  const next = addDays(date, 1);
  const [ny, nmo, nd] = parseDate(next);
  const end = new TZDate(ny, nmo - 1, nd, 0, 0, tz);
  return { start: new Date(start.getTime()), end: new Date(end.getTime()) };
}

export const MINUTE = 60_000;
