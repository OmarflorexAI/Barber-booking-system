"use client";

import { useRef, useState } from "react";

type Metric = "bookings" | "walkIns" | "noShows";
const METRICS: Metric[] = ["bookings", "walkIns", "noShows"];
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import type { DashboardWeek } from "@/server/reporting";
import { DayDetail, DrilldownSheet, delay, fadeIn, focusRing, growY, intl, noon, shortWeekday } from "./drilldown-sheet";

/**
 * Mon–Sun Bookings, one button per day: the bars grow in (staggered, transform only), today's
 * bar is the strong data tone with its count in a bubble, the others the soft tone. Tapping a
 * day opens its drill-down sheet. The table under it is what screen readers get for the chart.
 *
 * Bookings only, not Walk-ins stacked on top: the chart explains the hero number day by day;
 * the drill-down shows Walk-ins per hour.
 */
export function DayChart({ week, today, locale, className = "" }: { week: DashboardWeek; today: string; locale: Locale; className?: string }) {
  const d = dictionaries[locale].dashboard;
  const { days } = week;
  const [metric, setMetric] = useState<Metric>("bookings");
  const max = Math.max(1, ...days.map((x) => x[metric]));
  const long = new Intl.DateTimeFormat(intl(locale), { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });
  const label = new Intl.DateTimeFormat(intl(locale), { timeZone: "UTC", weekday: "long", month: "short", day: "numeric" });

  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  // A fresh key per opening, so the bars and numbers play again even for the same day.
  const [opened, setOpened] = useState(0);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const day = days.find((x) => x.date === selected) ?? null;

  return (
    <section aria-labelledby="per-day" className={className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="per-day" className="text-lg font-semibold tracking-[-0.01em]">
          {d.perDayOf[metric]}
        </h2>
        {/* Three equal segments; the pill under the chosen one slides (translate only). */}
        <div role="group" aria-label={d.metric} className="relative grid h-11 grid-cols-3 rounded-full bg-raised p-1 sm:w-80">
          <span
            aria-hidden="true"
            className="card-depth absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-surface motion-safe:transition-transform motion-safe:duration-(--dur-base) motion-safe:ease-(--ease-spring)"
            style={{ transform: `translateX(${METRICS.indexOf(metric) * 100}%)` }}
          />
          {METRICS.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={metric === m}
              data-testid={`metric-${m}`}
              onClick={() => setMetric(m)}
              className={`press relative z-10 min-w-0 truncate rounded-full px-2 text-sm font-medium transition-colors ${metric === m ? "text-ink" : "text-muted hover:text-ink"} ${focusRing}`}
            >
              {m === "bookings" ? d.bookings : m === "walkIns" ? d.walkIns : d.noShows}
            </button>
          ))}
        </div>
      </div>
      {/* The row reaches into the card's padding on phones so seven 44px buttons fit at 360px. */}
      <div className="-mx-3 mt-6 flex h-56 items-stretch sm:mx-0 lg:h-64">
        {days.map((x, i) => {
          const isToday = x.date === today;
          const value = x[metric];
          const ratio = value / max;
          const count = metric === "bookings" ? d.bookingsCount(value) : metric === "walkIns" ? d.walkInsCount(value) : d.noShowsCount(value);
          return (
            <button
              key={x.date}
              type="button"
              aria-haspopup="dialog"
              aria-label={`${value} ${shortWeekday(x.date, locale)}, ${
                metric === "bookings"
                  ? d.dayButton(label.format(noon(x.date)).replace(".", ""), value)
                  : d.dayMetricButton(label.format(noon(x.date)).replace(".", ""), count)
              }`}
              aria-current={isToday ? "date" : undefined}
              data-testid="day-bar"
              ref={(el) => {
                if (el) buttons.current.set(x.date, el);
                else buttons.current.delete(x.date);
              }}
              onClick={() => {
                setSelected(x.date);
                setOpened((n) => n + 1);
                setOpen(true);
              }}
              className={`press group flex min-w-11 flex-1 cursor-pointer flex-col items-center gap-2 rounded-xl pt-2 pb-2.5 transition-colors hover:bg-raised ${focusRing}`}
            >
              {/* Fixed-size bar scaled to its value, so switching metric morphs it (transform only);
                  the count rides a full-height layer translated to the bar's top. */}
              <span aria-hidden="true" className="relative w-full flex-1 border-b border-line">
                <span className="absolute inset-x-0 bottom-0 mx-auto h-[3px] w-[calc(100%-0.75rem)] max-w-12 rounded-t-sm bg-line" />
                <span
                  className={`absolute inset-x-0 bottom-0 mx-auto h-[78%] w-[calc(100%-0.75rem)] max-w-12 rounded-t-lg ${isToday ? "bg-data" : "bg-data-soft"} ${growY}`}
                  style={{ transform: `scaleY(${ratio})`, ...delay(i * 50) }}
                />
                <span
                  className="absolute inset-0 flex items-start justify-center motion-safe:transition-transform motion-safe:duration-(--dur-slow) motion-safe:ease-(--ease-out)"
                  style={{ transform: `translateY(calc(${(1 - 0.78 * ratio) * 100}% - 1.875rem))` }}
                >
                  {isToday ? (
                    <span className={`rounded-full bg-ink px-2 py-0.5 font-mono text-sm leading-5 font-semibold text-paper tabular-nums ${fadeIn}`} style={delay(240 + i * 50)}>
                      {value}
                    </span>
                  ) : (
                    <span className={`py-0.5 font-mono text-sm leading-5 text-muted tabular-nums transition-colors group-hover:text-ink ${fadeIn}`} style={delay(240 + i * 50)}>
                      {value}
                    </span>
                  )}
                </span>
              </span>
              {/* A real space between the count and the weekday, so the visible text reads "2 Tue"
                  and the aria-label above starts with it (WCAG 2.5.3, label in name). */}
              {" "}
              <span aria-hidden="true" className={`text-sm ${isToday ? "font-semibold text-ink" : "text-muted group-hover:text-ink"}`}>
                {shortWeekday(x.date, locale)}
              </span>
            </button>
          );
        })}
      </div>
      <div className="sr-only"><table>
        <caption>{d.perDay}</caption>
        <thead>
          <tr>
            <th scope="col">{d.day}</th>
            <th scope="col">{d.bookings}</th>
            <th scope="col">{d.walkIns}</th>
          </tr>
        </thead>
        <tbody>
          {days.map((x) => (
            <tr key={x.date}>
              <th scope="row">
                {long.format(noon(x.date))}
                {x.date === today ? ` (${d.today})` : ""}
              </th>
              <td>{x.bookings}</td>
              <td>{x.walkIns}</td>
            </tr>
          ))}
        </tbody>
      </table></div>

      <DrilldownSheet
        open={open}
        locale={locale}
        title={day ? long.format(noon(day.date)) : ""}
        subtitle={day?.date === today ? d.today : undefined}
        onClose={() => {
          setOpen(false);
          if (selected) buttons.current.get(selected)?.focus();
        }}
      >
        {day && <DayDetail key={opened} day={day} hours={week.hours} barbers={week.barbers} locale={locale} />}
      </DrilldownSheet>
    </section>
  );
}
