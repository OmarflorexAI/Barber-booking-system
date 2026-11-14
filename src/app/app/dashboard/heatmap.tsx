"use client";

import { useEffect, useState } from "react";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import type { DashboardWeek } from "@/server/reporting";
import { focusRing, hourLabel, intl, noon, shortWeekday } from "./drilldown-sheet";

/**
 * Busy hours: one square per day × start hour, filled with the data color at a strength that
 * follows its Bookings + Walk-ins. The squares pop in as a diagonal ripple (scale only, from
 * `@starting-style`; reduced motion sees them at rest). Hovering, tapping or arrowing through
 * the map moves a ring and rewrites the readout above it ("Tue 11 AM: 2 bookings, 1 walk-in"),
 * which is a polite live region, so keyboard and screen-reader users get every square too.
 * It opens on the week's busiest square. Days still to come are drawn hollow.
 */
export function Heatmap({ week, today, locale, className = "" }: { week: DashboardWeek; today: string; locale: Locale; className?: string }) {
  const d = dictionaries[locale].dashboard;
  const { days } = week;
  const hours = days[0]?.byHour.map((h) => h.hour) ?? [];
  const at = (col: number, row: number) => days[col]!.byHour[row]!;
  const visits = (col: number, row: number) => at(col, row).bookings + at(col, row).walkIns;

  let peak: [number, number] | null = null;
  let max = 0;
  days.forEach((_, c) =>
    hours.forEach((_, r) => {
      if (visits(c, r) > max) {
        max = visits(c, r);
        peak = [c, r];
      }
    }),
  );
  const [sel, setSel] = useState<[number, number] | null>(peak);
  // The ripple's per-square delays only matter for the entrance; afterwards the ring follows at once.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setSettled(true), (6 + hours.length) * 28 + 480);
    return () => clearTimeout(id);
  }, [hours.length]);

  const when = (c: number, r: number) =>
    `${new Intl.DateTimeFormat(intl(locale), { timeZone: "UTC", weekday: "short" }).format(noon(days[c]!.date)).replace(".", "")} ${hourLabel(hours[r]!, locale)}`;
  const readout = max === 0 || !sel ? d.busyEmpty : d.busyReadout(when(sel[0], sel[1]), at(sel[0], sel[1]).bookings, at(sel[0], sel[1]).walkIns);
  const step = hours.length > 9 ? 2 : 1;

  const pick = (e: React.PointerEvent) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>("[data-c]");
    if (t) setSel([Number(t.dataset.c), Number(t.dataset.r)]);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const move: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const m = move[e.key];
    if (!m || hours.length === 0) return;
    e.preventDefault();
    const [c, r] = sel ?? [0, 0];
    setSel([Math.min(6, Math.max(0, c + m[0])), Math.min(hours.length - 1, Math.max(0, r + m[1]))]);
  };

  return (
    <section aria-labelledby="busy-hours" className={`${className} flex flex-col gap-4`}>
      <div className="flex flex-col gap-1">
        <h2 id="busy-hours" className="text-lg font-semibold tracking-[-0.01em]">
          {d.busyHours}
        </h2>
        <p id="busy-hint" className="text-sm text-muted">
          {d.busyHint}
        </p>
      </div>

      <p aria-live="polite" data-testid="busy-readout" className="min-h-6 font-mono text-sm font-semibold tabular-nums">
        {readout}
      </p>

      {hours.length > 0 && (
        <div
          role="group"
          aria-label={d.busyHours}
          aria-describedby="busy-hint"
          tabIndex={0}
          onKeyDown={onKey}
          onPointerMove={pick}
          onPointerDown={pick}
          className={`grid touch-pan-y grid-cols-[auto_repeat(7,minmax(0,1fr))] gap-1 rounded-xl select-none ${focusRing}`}
        >
          <span />
          {days.map((x) => (
            <span key={x.date} aria-hidden="true" className={`pb-1 text-center text-xs ${x.date === today ? "font-semibold text-ink" : "text-muted"}`}>
              {shortWeekday(x.date, locale)}
            </span>
          ))}
          {hours.map((h, r) => (
            <Row key={h}>
              <span aria-hidden="true" className="pr-2.5 text-right font-mono text-[0.6875rem] leading-6 whitespace-nowrap text-muted tabular-nums">
                {r % step === 0 ? hourLabel(h, locale) : ""}
              </span>
              {days.map((x, c) => {
                const v = visits(c, r);
                const future = x.date > today;
                const on = sel?.[0] === c && sel?.[1] === r;
                return (
                  <span
                    key={x.date}
                    aria-hidden="true"
                    data-c={c}
                    data-r={r}
                    className={`h-6 rounded-[0.3rem] motion-safe:transition-[scale] motion-safe:duration-(--dur-base) motion-safe:ease-(--ease-spring) motion-safe:starting:scale-0 ${
                      future ? "border border-dashed border-line" : v ? "bg-data" : "bg-raised"
                    } ${on ? "z-10 scale-[1.18] shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--ink)]" : ""}`}
                    style={{ opacity: v ? 0.28 + 0.72 * (v / max) : undefined, transitionDelay: settled ? "0ms" : `${(c + r) * 28}ms` }}
                  />
                );
              })}
            </Row>
          ))}
        </div>
      )}

      {max > 0 && (
        <div aria-hidden="true" className="flex items-center justify-end gap-1.5 text-xs text-muted">
          {d.less}
          {[0.28, 0.52, 0.76, 1].map((o) => (
            <span key={o} className="h-3 w-3 rounded-[0.2rem] bg-data" style={{ opacity: o }} />
          ))}
          {d.more}
        </div>
      )}
    </section>
  );
}

/** Grid rows are flat children of the grid; this only groups them in the JSX. */
function Row({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
