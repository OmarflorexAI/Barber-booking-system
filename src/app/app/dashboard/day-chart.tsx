"use client";

import { useRef, useState } from "react";
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
  const max = Math.max(1, ...days.map((x) => x.bookings));
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
      <h2 id="per-day" className="text-lg font-semibold tracking-[-0.01em]">
        {d.perDay}
      </h2>
      {/* The row reaches into the card's padding on phones so seven 44px buttons fit at 360px. */}
      <div className="-mx-3 mt-5 flex h-52 items-stretch sm:mx-0 lg:h-60">
        {days.map((x, i) => {
          const isToday = x.date === today;
          return (
            <button
              key={x.date}
              type="button"
              aria-haspopup="dialog"
              aria-label={`${x.bookings} ${shortWeekday(x.date, locale)}, ${d.dayButton(label.format(noon(x.date)).replace(".", ""), x.bookings)}`}
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
              <span aria-hidden="true" className="flex w-full flex-1 flex-col items-center justify-end gap-1.5 border-b border-line">
                {isToday ? (
                  <span className={`rounded-full bg-ink px-2 py-0.5 font-mono text-sm leading-5 font-semibold text-paper tabular-nums ${fadeIn}`} style={delay(240 + i * 50)}>
                    {x.bookings}
                  </span>
                ) : (
                  <span className={`font-mono text-sm leading-5 text-muted tabular-nums transition-colors group-hover:text-ink ${fadeIn}`} style={delay(240 + i * 50)}>
                    {x.bookings}
                  </span>
                )}
                <span
                  className={`block w-[calc(100%-0.75rem)] max-w-12 rounded-t-lg ${x.bookings ? (isToday ? "bg-data" : "bg-data-soft") : "bg-line"} ${growY}`}
                  style={{ height: x.bookings ? `${(x.bookings / max) * 78}%` : "3px", ...delay(i * 50) }}
                />
              </span>
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
