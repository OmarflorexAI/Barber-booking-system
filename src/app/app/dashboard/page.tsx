import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { Dictionary, Locale } from "@/lib/i18n/dictionaries";
import { addDays, isLocalDate, toLocal, weekdayOf, type LocalDate } from "@/server/booking-engine/time";
import { reporting } from "@/server/engine";
import type { DashboardWeek } from "@/server/reporting";
import { focusRing, ownerContext } from "../settings/_owner";
import { DashboardSkeleton } from "./skeleton";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

/**
 * Owner Dashboard (Owner only): one Monday-to-Sunday week, New York days. The hero is the
 * week's online Bookings; Walk-ins, No-shows and Time saved sit under it; then Bookings per
 * day and per Barber. Every change is against the week before, in gray (never green/red).
 * URL state: `?week=YYYY-MM-DD` (a Monday, not after this week; anything else → this week).
 *
 * The bars are the only color here (`--data`, `--data-soft`). The per-day chart shows
 * Bookings only, not Walk-ins stacked on top: it explains the hero number day by day,
 * and Walk-ins have their own card.
 */
export default function DashboardPage(props: PageProps<"/app/dashboard">) {
  return (
    <div className="w-full">
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

const card = "rounded-2xl border border-line bg-surface p-5 lg:p-6";
const arrow = `inline-grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink transition-colors ${focusRing}`;

const intl = (locale: Locale) => (locale === "es" ? "es-US" : "en-US");
/** Noon UTC keeps a local date on its own calendar day whatever the zone. */
const noon = (d: LocalDate) => new Date(`${d}T12:00:00Z`);

/** "Nov 9 – 15", "Oct 26 – Nov 1"; the year only when it isn't this year. */
function weekRange(start: LocalDate, locale: Locale, thisYear: string) {
  const end = addDays(start, 6);
  const withYear = start.slice(0, 4) !== thisYear || end.slice(0, 4) !== thisYear;
  const f = new Intl.DateTimeFormat(intl(locale), { timeZone: "UTC", month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) });
  return f.formatRange(noon(start), noon(end));
}

async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [sp, ctx] = await Promise.all([searchParams, ownerContext()]);
  if (!ctx) return null;
  const { staff, membership, locale, t } = ctx;
  const d = t.dashboard;

  const today = toLocal(new Date(), membership.timezone).date;
  const thisMonday = addDays(today, -((weekdayOf(today) + 6) % 7));
  const asked = typeof sp.week === "string" ? sp.week : "";
  const weekStart = isLocalDate(asked) && weekdayOf(asked) === 1 && asked <= thisMonday ? asked : thisMonday;
  const isThisWeek = weekStart === thisMonday;

  const week = await reporting().dashboardWeek({ userId: staff.userId, shopId: membership.shopId, weekStart });
  const { totals, previous } = week;
  const href = (w: LocalDate) => (w === thisMonday ? "/app/dashboard" : `/app/dashboard?week=${w}`);
  const isEmpty = totals.bookings === 0 && totals.walkIns === 0 && totals.noShows === 0;
  // Minutes per online Booking are the Shop's own setting; read them back from the totals.
  const perBooking = totals.bookings ? totals.timeSavedMin / totals.bookings : previous.bookings ? previous.timeSavedMin / previous.bookings : null;
  const range = weekRange(weekStart, locale, today.slice(0, 4));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-[-0.015em]">{d.title}</h1>
        <nav aria-label={d.weekNav} className="flex items-center gap-3">
          <Link href={href(addDays(weekStart, -7))} scroll={false} className={`${arrow} hover:border-ink/40`} aria-label={d.prevWeek}>
            <Chevron dir="left" />
          </Link>
          <div className="flex min-w-32 flex-1 flex-col items-center text-center sm:flex-none">
            <p className="text-sm font-medium text-muted" aria-hidden={!isThisWeek}>
              {isThisWeek ? d.thisWeek : " "}
            </p>
            <p className="font-mono font-semibold tabular-nums" data-testid="week-range" aria-current={isThisWeek ? "date" : undefined}>
              {range}
            </p>
          </div>
          {isThisWeek ? (
            <span className={`${arrow} opacity-40`} role="link" aria-disabled="true" aria-label={d.nextWeek}>
              <Chevron dir="right" />
            </span>
          ) : (
            <Link href={href(addDays(weekStart, 7))} scroll={false} className={`${arrow} hover:border-ink/40`} aria-label={d.nextWeek}>
              <Chevron dir="right" />
            </Link>
          )}
        </nav>
      </div>
      {!isThisWeek && (
        <Link href="/app/dashboard" scroll={false} className="btn-ghost self-center text-sm sm:self-end">
          {d.backToThisWeek}
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <section aria-labelledby="hero-label" className={`${card} flex flex-col gap-3`}>
            <h2 id="hero-label" className="text-sm font-medium text-muted">
              {isThisWeek ? d.bookingsThisWeek : d.bookingsThatWeek}
            </h2>
            <p className="font-mono text-5xl leading-none font-semibold tracking-[-0.03em] tabular-nums lg:text-7xl" data-testid="stat-bookings">
              {totals.bookings}
            </p>
            <Delta cur={totals.bookings} prev={previous.bookings} d={d} isThisWeek={isThisWeek} />
            {isEmpty && (
              <p className="mt-2 border-t border-line pt-4 leading-relaxed text-muted">
                {d.empty}{" "}
                <Link href="/app/settings/link" className={`font-medium text-ink underline underline-offset-4 ${focusRing} rounded-sm`}>
                  {d.shareLink}
                </Link>
              </p>
            )}
          </section>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label={d.walkIns} testId="stat-walkins" value={String(totals.walkIns)} cur={totals.walkIns} prev={previous.walkIns} d={d} isThisWeek={isThisWeek} />
            <Stat label={d.noShows} testId="stat-noshows" value={String(totals.noShows)} cur={totals.noShows} prev={previous.noShows} d={d} isThisWeek={isThisWeek} />
            <Stat
              label={d.timeSaved}
              testId="stat-timesaved"
              value={d.duration(totals.timeSavedMin)}
              cur={totals.timeSavedMin}
              prev={previous.timeSavedMin}
              format={d.duration}
              d={d}
              isThisWeek={isThisWeek}
              className="col-span-2 sm:col-span-1"
            />
          </div>
          <p className="max-w-prose text-sm leading-relaxed text-muted">{d.howCounted(perBooking ? Math.round(perBooking) : null)}</p>

          <DayChart days={week.days} today={today} locale={locale} d={d} />
        </div>

        <BarberBars barbers={week.barbers} d={d} />
      </div>
    </div>
  );
}

type D = Dictionary["dashboard"];

/** Gray ↑ / ↓ / — and "+N vs last week". The words carry the meaning; the arrow is decoration. */
function Delta({ cur, prev, d, isThisWeek, format = String }: { cur: number; prev: number; d: D; isThisWeek: boolean; format?: (n: number) => string }) {
  const diff = cur - prev;
  const text =
    diff === 0
      ? isThisWeek
        ? d.sameAsLastWeek
        : d.sameAsWeekBefore
      : (isThisWeek ? d.vsLastWeek : d.vsWeekBefore)(`${diff > 0 ? "+" : "−"}${format(Math.abs(diff))}`);
  return (
    <p className="flex items-start gap-1.5 text-sm leading-snug text-muted">
      <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 shrink-0">
        {diff > 0 ? <path d="M8 13V3M4 7l4-4 4 4" /> : diff < 0 ? <path d="M8 3v10M4 9l4 4 4-4" /> : <path d="M3.5 8h9" />}
      </svg>
      <span>{text}</span>
    </p>
  );
}

function Stat({
  label,
  value,
  testId,
  className = "",
  ...delta
}: { label: string; value: string; testId: string; className?: string; cur: number; prev: number; d: D; isThisWeek: boolean; format?: (n: number) => string }) {
  return (
    <section className={`${card} flex min-w-0 flex-col gap-2 ${className}`}>
      <h2 className="text-sm font-medium text-muted">{label}</h2>
      <p className="font-mono text-2xl leading-tight font-semibold tracking-[-0.02em] tabular-nums lg:text-3xl" data-testid={testId}>
        {value}
      </p>
      <Delta {...delta} />
    </section>
  );
}

/** Mon–Sun Bookings, today's bar in the strong data tone. The table under it is what screen readers get. */
function DayChart({ days, today, locale, d }: { days: DashboardWeek["days"]; today: LocalDate; locale: Locale; d: D }) {
  const max = Math.max(1, ...days.map((x) => x.bookings));
  const weekday = new Intl.DateTimeFormat(intl(locale), { timeZone: "UTC", weekday: "short" });
  return (
    <section aria-labelledby="per-day" className={card}>
      <h2 id="per-day" className="text-lg font-semibold tracking-[-0.01em]">
        {d.perDay}
      </h2>
      <div aria-hidden="true" className="mt-6 flex h-44 items-stretch gap-2 sm:gap-3 lg:h-52">
        {days.map((day) => {
          const isToday = day.date === today;
          return (
            <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 flex-col items-center justify-end gap-1.5 border-b border-line">
                <span className={`font-mono text-sm tabular-nums ${isToday ? "font-semibold text-ink" : "text-muted"}`}>{day.bookings}</span>
                <div
                  className={`w-full max-w-12 rounded-t-lg ${isToday ? "bg-data" : "bg-data-soft"}`}
                  style={{ height: day.bookings ? `${(day.bookings / max) * 78}%` : "0px" }}
                />
              </div>
              <span className={`text-sm ${isToday ? "font-semibold text-ink" : "text-muted"}`}>{weekday.format(noon(day.date)).replace(".", "")}</span>
            </div>
          );
        })}
      </div>
      <table className="sr-only">
        <caption>{d.perDay}</caption>
        <thead>
          <tr>
            <th scope="col">{d.day}</th>
            <th scope="col">{d.bookings}</th>
            <th scope="col">{d.walkIns}</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <th scope="row">
                {new Intl.DateTimeFormat(intl(locale), { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" }).format(noon(day.date))}
                {day.date === today ? ` (${d.today})` : ""}
              </th>
              <td>{day.bookings}</td>
              <td>{day.walkIns}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** One row per active Barber in sort order: photo or initials, name, a bar and the count. */
function BarberBars({ barbers, d }: { barbers: DashboardWeek["barbers"]; d: D }) {
  const max = Math.max(1, ...barbers.map((b) => b.bookings));
  return (
    <section aria-labelledby="per-barber" className={`${card} flex flex-col gap-5`}>
      <h2 id="per-barber" className="text-lg font-semibold tracking-[-0.01em]">
        {d.perBarber}
      </h2>
      {barbers.length === 0 ? (
        <p className="text-muted">{d.noBarbers}</p>
      ) : (
        <ul className="flex flex-col gap-5">
          {barbers.map((b) => (
            <li key={b.barberId} className="flex items-center gap-3" data-testid="barber-row">
              {b.photoUrl ? (
                // A plain <img>: Barber photos come from Supabase Storage at their own size.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.photoUrl} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full border border-line object-cover" />
              ) : (
                <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-raised text-sm font-semibold text-ink">
                  {initials(b.name)}
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate font-semibold">{b.name}</span>
                  <span className="font-mono font-semibold tabular-nums">
                    <span className="sr-only">{d.bookings}: </span>
                    {b.bookings}
                  </span>
                </div>
                <div aria-hidden="true" className="h-2 w-full overflow-hidden rounded-full bg-raised">
                  <div className="h-full rounded-full bg-data" style={{ width: `${(b.bookings / max) * 100}%` }} />
                </div>
                {b.walkIns > 0 && <span className="text-sm text-muted">{d.walkInsCount(b.walkIns)}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}
