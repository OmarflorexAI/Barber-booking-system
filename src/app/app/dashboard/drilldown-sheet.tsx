"use client";

import { useEffect, useId, useRef } from "react";
import { CountUp, type CountFormat } from "@/components/motion/count-up";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import type { DashboardWeek } from "@/server/reporting";

/*
 * The Dashboard's drill-down: one native modal <dialog> (the Day view's sheet pattern), a
 * bottom sheet on phones and a centered dialog from 640px. It opens with a transform slide
 * (instant under reduced motion) and closes on the backdrop, Escape or the close button;
 * the caller puts focus back on the bar that opened it.
 *
 * Bars grow in with CSS only: each bar's final size is its real style, and `@starting-style`
 * (Tailwind `starting:`, inside `motion-safe:`) starts it at scale 0 when it first renders or
 * when the dialog shows it. No script hides anything; reduced motion sees the final bars.
 */

export type Day = DashboardWeek["days"][number];
export type Barber = DashboardWeek["barbers"][number];

export const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
export const intl = (locale: Locale) => (locale === "es" ? "es-US" : "en-US");
/** Noon UTC keeps a local date on its own calendar day whatever the zone. */
export const noon = (date: string) => new Date(`${date}T12:00:00Z`);
/** "Mon", "mié": the short weekday without Spanish's trailing period. */
export const shortWeekday = (date: string, locale: Locale) =>
  new Intl.DateTimeFormat(intl(locale), { timeZone: "UTC", weekday: "short" }).format(noon(date)).replace(".", "");

/** Shared grow-in for every bar: transform only, the slow timing, staggered by `--i`. */
export const growY =
  "origin-bottom motion-safe:transition-transform motion-safe:duration-(--dur-slow) motion-safe:ease-(--ease-out) motion-safe:starting:scale-y-0";
export const growX =
  "origin-left motion-safe:transition-transform motion-safe:duration-(--dur-slow) motion-safe:ease-(--ease-out) motion-safe:starting:scale-x-0";
export const fadeIn = "motion-safe:transition-opacity motion-safe:duration-(--dur-base) motion-safe:ease-(--ease-out) motion-safe:starting:opacity-0";
export const delay = (ms: number): React.CSSProperties => ({ transitionDelay: `${ms}ms` });

const SHEET =
  "m-0 mt-auto max-h-[92dvh] w-full max-w-full overflow-y-auto overscroll-contain rounded-t-2xl border border-b-0 border-line bg-surface p-0 text-ink backdrop:bg-black/50 motion-safe:transition-[translate,opacity] motion-safe:duration-(--dur-slow) motion-safe:ease-(--ease-out) starting:open:translate-y-full sm:m-auto sm:w-[32rem] sm:rounded-2xl sm:border-b sm:motion-safe:duration-(--dur-base) sm:starting:open:translate-y-3 sm:starting:open:opacity-0";

export function DrilldownSheet({
  open,
  onClose,
  title,
  subtitle,
  leading,
  locale,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  locale: Locale;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={SHEET}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className="flex flex-col gap-6 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-6">
        <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-line sm:hidden" />
        <div className="flex items-start gap-3">
          {leading}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 id={titleId} className="text-xl font-semibold tracking-[-0.01em] text-balance">
              {title}
            </h2>
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            aria-label={dictionaries[locale].close}
            onClick={() => ref.current?.close()}
            className={`press -mt-1 -mr-2 inline-grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-raised hover:text-ink ${focusRing}`}
          >
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-6 w-6">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

/** A hairline-ruled grid of numbers that count up as the sheet opens. */
function Numbers({ items, locale }: { items: { label: string; value: number; format?: CountFormat; testId: string }[]; locale: Locale }) {
  return (
    <dl className={`grid gap-px overflow-hidden rounded-xl border border-line bg-line ${items.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {items.map((x) => (
        <div key={x.testId} className="flex min-w-0 flex-col gap-1 bg-surface p-4">
          <dt className="text-sm font-medium text-muted">{x.label}</dt>
          <dd>
            <CountUp value={x.value} locale={locale} format={x.format} data-testid={x.testId} className="text-2xl leading-tight font-semibold tracking-[-0.02em]" />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted">
      <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-sm ${className}`} />
      {label}
    </span>
  );
}

const hourLabel = (hour: number, locale: Locale) =>
  new Intl.DateTimeFormat(intl(locale), { timeZone: "UTC", hour: "numeric" }).format(new Date(Date.UTC(2000, 0, 1, hour)));

/** One day: its four numbers, then Bookings by start hour (Walk-ins stacked lighter) and by Barber. */
export function DayDetail({ day, hours, barbers, locale }: { day: Day; hours: DashboardWeek["hours"]; barbers: Barber[]; locale: Locale }) {
  const d = dictionaries[locale].dashboard;
  if (day.bookings + day.walkIns + day.noShows === 0) return <p className="leading-relaxed text-muted">{d.dayEmpty}</p>;

  const hourMax = Math.max(1, ...day.byHour.map((h) => h.bookings + h.walkIns));
  const step = day.byHour.length > 8 ? 3 : day.byHour.length > 4 ? 2 : 1;
  const anyWalkIns = day.byHour.some((h) => h.walkIns > 0);
  const names = new Map(barbers.map((b) => [b.barberId, b.name]));
  const barberMax = Math.max(1, ...day.byBarber.map((b) => b.bookings + b.walkIns));

  return (
    <>
      <Numbers
        locale={locale}
        items={[
          { label: d.bookings, value: day.bookings, testId: "drill-bookings" },
          { label: d.walkIns, value: day.walkIns, testId: "drill-walkins" },
          { label: d.noShows, value: day.noShows, testId: "drill-noshows" },
          { label: d.timeSaved, value: day.timeSavedMin, format: "duration", testId: "drill-timesaved" },
        ]}
      />

      {hours && day.byHour.length > 0 && (
        <section aria-labelledby="drill-hour" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 id="drill-hour" className="font-semibold">
              {d.byHour}
            </h3>
            <div aria-hidden="true" className="flex gap-3">
              <Swatch className="bg-data" label={d.bookings} />
              {anyWalkIns && <Swatch className="bg-data-soft" label={d.walkIns} />}
            </div>
          </div>
          <div aria-hidden="true">
            <div className="flex h-32 items-stretch gap-1 border-b border-line">
              {day.byHour.map((h, i) => {
                const total = h.bookings + h.walkIns;
                return (
                  <div key={h.hour} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                    {total > 0 && (
                      <span className={`font-mono text-xs text-muted tabular-nums ${fadeIn}`} style={delay(160 + i * 25)}>
                        {total}
                      </span>
                    )}
                    <div
                      className={`flex w-full max-w-8 flex-col overflow-hidden rounded-t-md ${growY}`}
                      style={{ height: total ? `${(total / hourMax) * 80}%` : "0px", ...delay(i * 25) }}
                    >
                      {h.walkIns > 0 && <div className="bg-data-soft" style={{ flexGrow: h.walkIns }} />}
                      {h.bookings > 0 && <div className="bg-data" style={{ flexGrow: h.bookings }} />}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex h-4 gap-1">
              {day.byHour.map((h) => (
                <div key={h.hour} className="relative min-w-0 flex-1">
                  {(h.hour - hours.first) % step === 0 && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap text-muted">{hourLabel(h.hour, locale)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="sr-only"><table>
            <caption>{d.byHour}</caption>
            <thead>
              <tr>
                <th scope="col">{d.hour}</th>
                <th scope="col">{d.bookings}</th>
                <th scope="col">{d.walkIns}</th>
              </tr>
            </thead>
            <tbody>
              {day.byHour.map((h) => (
                <tr key={h.hour}>
                  <th scope="row">{hourLabel(h.hour, locale)}</th>
                  <td>{h.bookings}</td>
                  <td>{h.walkIns}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </section>
      )}

      {day.byBarber.length > 0 && (
        <section aria-labelledby="drill-barber" className="flex flex-col gap-3">
          <h3 id="drill-barber" className="font-semibold">
            {d.byBarber}
          </h3>
          <ul className="flex flex-col divide-y divide-line">
            {day.byBarber.map((b, i) => {
              const parts = [d.bookingsCount(b.bookings), ...(b.walkIns ? [d.walkInsCount(b.walkIns)] : []), ...(b.noShows ? [d.noShowsCount(b.noShows)] : [])];
              return (
                <li key={b.barberId} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0" data-testid="drill-barber">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate font-medium">{names.get(b.barberId) ?? ""}</span>
                    <span className="shrink-0 text-sm text-muted">{parts.join(" · ")}</span>
                  </div>
                  <div aria-hidden="true" className="flex h-2 w-full overflow-hidden rounded-full bg-raised">
                    <div
                      className={`flex h-full overflow-hidden rounded-full ${growX}`}
                      style={{ width: `${((b.bookings + b.walkIns) / barberMax) * 100}%`, ...delay(80 + i * 40) }}
                    >
                      {b.bookings > 0 && <div className="bg-data" style={{ flexGrow: b.bookings }} />}
                      {b.walkIns > 0 && <div className="bg-data-soft" style={{ flexGrow: b.walkIns }} />}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}

/** One Barber's week: their three numbers and a Mon–Sun bar per day (Bookings). */
export function BarberDetail({ barber, dates, today, locale }: { barber: Barber; dates: string[]; today: string; locale: Locale }) {
  const d = dictionaries[locale].dashboard;
  const max = Math.max(1, ...barber.days);
  const long = new Intl.DateTimeFormat(intl(locale), { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });
  return (
    <>
      <Numbers
        locale={locale}
        items={[
          { label: d.bookings, value: barber.bookings, testId: "drill-barber-bookings" },
          { label: d.walkIns, value: barber.walkIns, testId: "drill-barber-walkins" },
          { label: d.noShows, value: barber.noShows, testId: "drill-barber-noshows" },
        ]}
      />
      <section aria-labelledby="drill-week" className="flex flex-col gap-4">
        <h3 id="drill-week" className="font-semibold">
          {d.perDay}
        </h3>
        <div aria-hidden="true">
          <div className="flex h-28 items-stretch gap-2 border-b border-line">
            {barber.days.map((n, i) => {
              const isToday = dates[i] === today;
              return (
                <div key={dates[i] ?? i} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  <span className={`font-mono text-xs tabular-nums ${isToday ? "font-semibold text-ink" : "text-muted"} ${fadeIn}`} style={delay(160 + i * 40)}>
                    {n}
                  </span>
                  <div
                    className={`w-full max-w-9 rounded-t-md ${n ? (isToday ? "bg-data" : "bg-data-soft") : "bg-line"} ${growY}`}
                    style={{ height: n ? `${(n / max) * 80}%` : "3px", ...delay(i * 40) }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2">
            {dates.map((date) => (
              <span key={date} className={`min-w-0 flex-1 text-center text-xs ${date === today ? "font-semibold text-ink" : "text-muted"}`}>
                {shortWeekday(date, locale)}
              </span>
            ))}
          </div>
        </div>
        <div className="sr-only"><table>
          <caption>{d.perDay}</caption>
          <thead>
            <tr>
              <th scope="col">{d.day}</th>
              <th scope="col">{d.bookings}</th>
            </tr>
          </thead>
          <tbody>
            {barber.days.map((n, i) => (
              <tr key={dates[i] ?? i}>
                <th scope="row">{dates[i] ? long.format(noon(dates[i])) : ""}</th>
                <td>{n}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>
    </>
  );
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function Avatar({ barber, size = 40 }: { barber: Barber; size?: 40 | 48 }) {
  const box = size === 48 ? "h-12 w-12" : "h-10 w-10";
  return barber.photoUrl ? (
    // A plain <img>: Barber photos come from Supabase Storage at their own size.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={barber.photoUrl} alt="" width={size} height={size} className={`${box} shrink-0 rounded-full border border-line object-cover`} />
  ) : (
    <span aria-hidden="true" className={`${box} grid shrink-0 place-items-center rounded-full border border-line bg-raised text-sm font-semibold text-ink`}>
      {initials(barber.name)}
    </span>
  );
}
