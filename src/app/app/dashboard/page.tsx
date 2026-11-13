import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { Locale } from "@/lib/i18n/dictionaries";
import { addDays, isLocalDate, toLocal, weekdayOf, type LocalDate } from "@/server/booking-engine/time";
import { reporting } from "@/server/engine";
import { focusRing, ownerContext } from "../settings/_owner";
import { BarberBars } from "./barber-bars";
import { DayChart } from "./day-chart";
import { DashboardSkeleton } from "./skeleton";
import { CountUp } from "@/components/motion/count-up";
import { Delta, StatCard, statCard } from "./stat-card";

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

const card = "card-depth rounded-2xl border border-line bg-surface p-5 lg:p-6";
const arrow = `inline-grid h-12 w-12 shrink-0 place-items-center rounded-full text-ink transition-colors ${focusRing}`;

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
  // Sparklines stop at today: days that haven't happened aren't zeros.
  const soFar = week.days.filter((x) => x.date <= today);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-[-0.015em]">{d.title}</h1>
        {/* One segmented pill: ‹ | this week / range | ›. Hairlines split the segments. */}
        <nav aria-label={d.weekNav} className="card-depth flex h-14 items-center rounded-full border border-line bg-surface p-1 sm:min-w-72">
          <Link href={href(addDays(weekStart, -7))} scroll={false} className={`${arrow} press hover:bg-raised`} aria-label={d.prevWeek}>
            <Chevron dir="left" />
          </Link>
          <span aria-hidden="true" className="h-6 w-px shrink-0 bg-line" />
          <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-3 text-center leading-tight">
            {isThisWeek && <p className="text-xs font-medium text-muted">{d.thisWeek}</p>}
            <p className="font-mono text-sm font-semibold whitespace-nowrap tabular-nums" data-testid="week-range" aria-current={isThisWeek ? "date" : undefined}>
              {range}
            </p>
          </div>
          <span aria-hidden="true" className="h-6 w-px shrink-0 bg-line" />
          {isThisWeek ? (
            <span className={`${arrow} text-muted opacity-40`} role="link" aria-disabled="true" aria-label={d.nextWeek}>
              <Chevron dir="right" />
            </span>
          ) : (
            <Link href={href(addDays(weekStart, 7))} scroll={false} className={`${arrow} press hover:bg-raised`} aria-label={d.nextWeek}>
              <Chevron dir="right" />
            </Link>
          )}
        </nav>
      </div>
      {!isThisWeek && (
        <Link href="/app/dashboard" scroll={false} className="btn-ghost press self-center text-sm sm:self-end">
          {d.backToThisWeek}
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <section aria-labelledby="hero-label" className={`${statCard} enter flex flex-col gap-3`} style={{ "--i": 0 } as React.CSSProperties}>
            <h2 id="hero-label" className="text-sm font-medium text-muted">
              {isThisWeek ? d.bookingsThisWeek : d.bookingsThatWeek}
            </h2>
            <CountUp
              value={totals.bookings}
              locale={locale}
              duration={800}
              data-testid="stat-bookings"
              className="self-start text-5xl leading-none font-semibold tracking-[-0.03em] lg:text-7xl"
            />
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
            <StatCard
              index={1}
              label={d.walkIns}
              testId="stat-walkins"
              value={totals.walkIns}
              prev={previous.walkIns}
              series={soFar.map((x) => x.walkIns)}
              locale={locale}
              d={d}
              isThisWeek={isThisWeek}
            />
            <StatCard
              index={2}
              label={d.noShows}
              testId="stat-noshows"
              value={totals.noShows}
              prev={previous.noShows}
              series={soFar.map((x) => x.noShows)}
              locale={locale}
              d={d}
              isThisWeek={isThisWeek}
            />
            <StatCard
              index={3}
              label={d.timeSaved}
              testId="stat-timesaved"
              value={totals.timeSavedMin}
              prev={previous.timeSavedMin}
              series={soFar.map((x) => x.timeSavedMin)}
              format="duration"
              locale={locale}
              d={d}
              isThisWeek={isThisWeek}
              className="col-span-2 sm:col-span-1"
            />
          </div>
          <p className="max-w-prose text-sm leading-relaxed text-muted">{d.howCounted(perBooking ? Math.round(perBooking) : null)}</p>

          <DayChart week={week} today={today} locale={locale} className={card} />
        </div>

        <BarberBars week={week} today={today} locale={locale} className={card} />
      </div>
    </div>
  );
}


function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}
