import type { Locale } from "@/lib/i18n/dictionaries";

const intl = (l: Locale) => (l === "es" ? "es-US" : "en-US");
const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

/** "Thursday, November 19" / "Jueves, 19 de noviembre". */
export function longDay(d: Date | string, tz: string, locale: Locale) {
  return capitalize(new Date(d).toLocaleDateString(intl(locale), { timeZone: tz, weekday: "long", month: "long", day: "numeric" }));
}

/** "10:30 AM" / "10:30 a. m." */
export function clock(d: Date | string, tz: string, locale: Locale) {
  return new Date(d).toLocaleTimeString(intl(locale), { timeZone: tz, hour: "numeric", minute: "2-digit" });
}

/** "Thu, Nov 19" / "jue, 19 nov" */
export function shortDay(d: Date | string, tz: string, locale: Locale) {
  return new Date(d).toLocaleDateString(intl(locale), { timeZone: tz, weekday: "short", month: "short", day: "numeric" });
}

/** "Thu, Nov 19, 10:30 AM" / "jue, 19 nov, 10:30 a. m." */
export function shortWhen(d: Date | string, tz: string, locale: Locale) {
  return new Date(d).toLocaleString(intl(locale), {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function sameLocalDay(a: Date | string, b: Date | string, tz: string) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  return f.format(new Date(a)) === f.format(new Date(b));
}

/** "DR" for "Dre", "CM" for "Carlos Méndez". */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase();
}
