"use client";

import { useRef, useState } from "react";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import type { DashboardWeek } from "@/server/reporting";
import { Avatar, BarberDetail, DrilldownSheet, delay, focusRing, growX } from "./drilldown-sheet";

/**
 * One row per active Barber in sort order: photo or initials, name, a bar that fills in on
 * load (staggered, transform only) and the count. Each row is a button that opens the same
 * drill-down sheet as the day chart, with that Barber's Mon–Sun bars and week numbers.
 */
export function BarberBars({ week, today, locale, className = "" }: { week: DashboardWeek; today: string; locale: Locale; className?: string }) {
  const d = dictionaries[locale].dashboard;
  const { barbers } = week;
  const dates = week.days.map((x) => x.date);
  const max = Math.max(1, ...barbers.map((b) => b.bookings));

  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(0);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const barber = barbers.find((b) => b.barberId === selected) ?? null;

  return (
    <section aria-labelledby="per-barber" className={`${className} flex flex-col gap-4`}>
      <h2 id="per-barber" className="text-lg font-semibold tracking-[-0.01em]">
        {d.perBarber}
      </h2>
      {barbers.length === 0 ? (
        <p className="text-muted">{d.noBarbers}</p>
      ) : (
        <ul className="-mx-3 flex flex-col gap-1">
          {barbers.map((b, i) => (
            <li key={b.barberId} data-testid="barber-row">
              <button
                type="button"
                aria-haspopup="dialog"
                ref={(el) => {
                  if (el) buttons.current.set(b.barberId, el);
                  else buttons.current.delete(b.barberId);
                }}
                onClick={() => {
                  setSelected(b.barberId);
                  setOpened((n) => n + 1);
                  setOpen(true);
                }}
                className={`press group flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-raised ${focusRing}`}
              >
                <Avatar barber={b} />
                <span className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate font-semibold">{b.name}</span>
                    <span className="font-mono font-semibold tabular-nums">
                      <span className="sr-only">{d.bookings}: </span>
                      {b.bookings}
                    </span>
                  </span>
                  <span aria-hidden="true" className="block h-2 w-full overflow-hidden rounded-full bg-raised transition-colors group-hover:bg-line">
                    <span className={`block h-full rounded-full bg-data ${growX}`} style={{ width: `${(b.bookings / max) * 100}%`, ...delay(120 + i * 60) }} />
                  </span>
                  {b.walkIns > 0 && <span className="text-sm text-muted">{d.walkInsCount(b.walkIns)}</span>}
                  <span className="sr-only">{d.showWeek}</span>
                </span>
                <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-muted transition-[translate,color] group-hover:translate-x-0.5 group-hover:text-ink motion-reduce:transition-none">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <DrilldownSheet
        open={open}
        locale={locale}
        title={barber?.name ?? ""}
        subtitle={d.barberWeek}
        leading={barber ? <Avatar barber={barber} size={48} /> : undefined}
        onClose={() => {
          setOpen(false);
          if (selected) buttons.current.get(selected)?.focus();
        }}
      >
        {barber && <BarberDetail key={opened} barber={barber} dates={dates} today={today} locale={locale} />}
      </DrilldownSheet>
    </section>
  );
}
