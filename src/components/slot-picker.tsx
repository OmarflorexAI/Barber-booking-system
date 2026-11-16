"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Notice } from "@/components/notice";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

export type Slot = { startsAt: string; time: string; barberIds: string[] };

/** Today's calendar date in the Shop's time zone, as YYYY-MM-DD. */
function todayIn(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const intl = (locale: Locale) => (locale === "es" ? "es-US" : "en-US");
function to12h(time: string, locale: Locale): string {
  const [h, m] = time.split(":").map(Number);
  return new Date(Date.UTC(2000, 0, 1, h, m)).toLocaleTimeString(intl(locale), {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  });
}
/** Parts of a local date for the day strip, read at noon UTC so the date never shifts. */
function dayParts(date: string, locale: Locale) {
  const d = new Date(`${date}T12:00:00Z`);
  const f = (o: Intl.DateTimeFormatOptions) => d.toLocaleDateString(intl(locale), { timeZone: "UTC", ...o });
  return {
    weekday: f({ weekday: "short" }).replace(".", ""),
    day: f({ day: "numeric" }),
    month: f({ month: "short" }).replace(".", ""),
  };
}

async function fetchSlots(q: { shopId: string; serviceId: string; barberId: string; date: string }, signal?: AbortSignal): Promise<Slot[]> {
  const r = await fetch(`/api/availability?${new URLSearchParams(q)}`, { signal, cache: "no-store" });
  const body = await r.json();
  if (!r.ok) throw new Error(body.code ?? "UNKNOWN");
  return body.slots as Slot[];
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="c-chevron h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  );
}

/** "2026-11" → "November 2026". */
function monthName(month: string, locale: Locale) {
  return new Date(`${month}-01T12:00:00Z`).toLocaleDateString(intl(locale), { timeZone: "UTC", month: "long", year: "numeric" });
}
/** "2026-11-16" → "Monday, November 16". */
function longDate(date: string, locale: Locale) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(intl(locale), { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });
}
function MonthButton(props: { label: string; disabled: boolean; onClick: () => void; dir: 1 | -1 }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
      className="press grid size-11 place-items-center rounded-full text-ink transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:text-muted/40 disabled:hover:bg-transparent"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d={props.dir === 1 ? "M7.5 4.5 13 10l-5.5 5.5" : "M12.5 4.5 7 10l5.5 5.5"} />
      </svg>
    </button>
  );
}

const GROUPS = ["morning", "afternoon", "evening"] as const;
const groupOf = (time: string) => {
  const h = Number(time.slice(0, 2));
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
};

/**
 * Day strip (today + 30 days, scrolling sideways inside itself), or with `calendar` a month
 * grid with ‹ › between the (at most two) months those days touch, and the free times for the
 * chosen day as mono pills, grouped Morning / Afternoon / Evening. Taken times are not shown.
 * `refreshKey` forces a reload, e.g. after "that time was just taken".
 * Styled by `.c-slots` in globals.css (the Client recipe); outside a `.client-page` (the
 * staff day board) its rim and glint tokens fall back to plain --line.
 */
export function SlotPicker(props: {
  shopId: string;
  serviceId: string;
  barberId: string | "any";
  timezone: string;
  locale: Locale;
  selected: string | null;
  onPick: (slot: Slot) => void;
  refreshKey?: number;
  /** A month calendar in one card (the Client pages) instead of the sideways day strip. */
  calendar?: boolean;
}) {
  const { shopId, serviceId, barberId, timezone, locale, selected, onPick, refreshKey = 0, calendar = false } = props;
  const t = dictionaries[locale];
  const days = useMemo(() => {
    const today = todayIn(timezone);
    return Array.from({ length: 31 }, (_, i) => addDays(today, i));
  }, [timezone]);
  const [date, setDate] = useState(days[0]);
  const [view, setView] = useState(days[0].slice(0, 7)); // the month on show, "YYYY-MM"
  const [state, setState] = useState<{ key: string; slots: Slot[] | null; error: string | null }>({ key: "", slots: null, error: null });
  const [search, setSearch] = useState<"idle" | "searching" | "none">("idle");
  const stripRef = useRef<HTMLDivElement>(null);
  const key = `${shopId}|${serviceId}|${barberId}|${date}|${refreshKey}`;

  useEffect(() => {
    const ctrl = new AbortController();
    fetchSlots({ shopId, serviceId, barberId, date }, ctrl.signal)
      .then((slots) => setState({ key, slots, error: null }))
      .catch((e: Error) => {
        if (e.name !== "AbortError") setState({ key, slots: null, error: e.message });
      });
    return () => ctrl.abort();
  }, [key, shopId, serviceId, barberId, date]);

  // Keep the chosen day visible inside the strip (the strip scrolls; the page doesn't).
  useEffect(() => {
    const strip = stripRef.current;
    const chip = strip?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!strip || !chip) return;
    const left = chip.offsetLeft - strip.clientWidth / 2 + chip.clientWidth / 2;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    strip.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
  }, [date]);

  function pickDay(d: string) {
    setSearch("idle");
    setDate(d);
    setView(d.slice(0, 7));
  }

  /** Looks ahead day by day for the first day with a free time. */
  async function nextFreeDay() {
    setSearch("searching");
    for (let i = days.indexOf(date) + 1; i < days.length; i++) {
      try {
        const slots = await fetchSlots({ shopId, serviceId, barberId, date: days[i] });
        if (slots.length > 0) {
          setState({ key: `${shopId}|${serviceId}|${barberId}|${days[i]}|${refreshKey}`, slots, error: null });
          pickDay(days[i]);
          return;
        }
      } catch {
        break;
      }
    }
    setSearch("none");
  }

  const loading = state.key !== key;
  const slots = loading ? null : state.slots;

  const times = (
    <>
      {loading && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="status" aria-busy="true">
          <span className="sr-only">{t.loadingSlots}</span>
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="h-12 rounded-full bg-raised motion-safe:animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      )}

      {!loading && state.error && (
        <Notice role="alert">
          <p>{t.errors[state.error] ?? t.errors.UNKNOWN}</p>
        </Notice>
      )}

      {!loading && slots && slots.length === 0 && (
        <div className="c-slots-empty flex flex-col items-center gap-4 rounded-2xl px-5 py-8 text-center">
          <CalendarIcon />
          <p className="max-w-[28ch] text-pretty text-muted">{search === "none" ? t.noSlotsAhead : t.noSlots}</p>
          {search !== "none" && days.indexOf(date) < days.length - 1 && (
            <button
              type="button"
              className="c-btn c-btn-secondary press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              disabled={search === "searching"}
              aria-busy={search === "searching" || undefined}
              onClick={nextFreeDay}
            >
              {t.nextFreeDay}
              <ArrowIcon />
            </button>
          )}
        </div>
      )}

      {!loading && slots && slots.length > 0 && (
        <div className="flex flex-col gap-5">
          {GROUPS.map((g) => {
            const group = slots.filter((s) => groupOf(s.time) === g);
            if (group.length === 0) return null;
            return (
              <section key={g} className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-muted">{t.dayParts[g]}</h3>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {group.map((s) => {
                    const on = selected === s.startsAt;
                    return (
                      <button
                        key={s.startsAt}
                        type="button"
                        onClick={() => onPick(s)}
                        aria-pressed={on}
                        className={`min-h-12 rounded-full border px-2 font-mono text-base font-medium whitespace-nowrap tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                          on ? "bg-ink text-paper" : "bg-surface text-ink"
                        }`}
                      >
                        {to12h(s.time, locale)}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );

  if (!calendar) {
    return (
      <div className="c-slots flex min-w-0 flex-col gap-5">
      <div
        ref={stripRef}
        className="-mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pt-0.5 pb-2 [scrollbar-width:none]"
        role="tablist"
        aria-label={t.dayLabel}
      >
        {days.map((d) => {
          const p = dayParts(d, locale);
          const on = d === date;
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => pickDay(d)}
              className={`flex w-14 shrink-0 flex-col items-center gap-0.5 border py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                on ? "bg-ink text-paper" : "bg-surface text-ink"
              }`}
            >
              <span className={`text-xs font-medium ${on ? "" : "text-muted"}`}>{p.weekday}</span>
              <span className="font-mono text-lg leading-6 font-medium tabular-nums">{p.day}</span>
              <span className={`text-xs ${on ? "" : "text-muted"}`}>{p.month}</span>
            </button>
          );
        })}
      </div>
        {times}
      </div>
    );
  }

  // The month calendar (Client pages): one card, the month on top, the chosen day's times below.
  const viewDays = days.filter((d) => d.startsWith(view));
  const lead = new Date(`${view}-01T12:00:00Z`).getUTCDay(); // Sunday-first, like a US wall calendar
  const monthCount = new Date(Date.UTC(Number(view.slice(0, 4)), Number(view.slice(5, 7)), 0)).getUTCDate();
  const months = [...new Set(days.map((d) => d.slice(0, 7)))];
  // Weeks that are wholly past are left out (they only push the times down on a phone).
  const firstOpen = viewDays.length ? Number(viewDays[0].slice(8)) : 1;
  const cells = [...Array.from({ length: lead }, () => 0), ...Array.from({ length: monthCount }, (_, i) => i + 1)];
  const shown = cells.slice(Math.floor((lead + firstOpen - 1) / 7) * 7);
  const vi = months.indexOf(view);
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(2026, 10, 1 + i, 12)).toLocaleDateString(intl(locale), { timeZone: "UTC", weekday: "short" }).replace(".", ""),
  );
  return (
    <div className="c-slots c-card flex min-w-0 flex-col overflow-hidden">
      <div className="c-cal px-3 pt-4 pb-3 sm:px-4">
        <div className="flex items-center justify-between pl-2">
          <h3 className="text-lg leading-tight font-semibold tracking-[-0.02em] first-letter:uppercase" aria-live="polite">
            {monthName(view, locale)}
          </h3>
          <div className="flex gap-1">
            <MonthButton label={t.prevMonth} disabled={vi <= 0} onClick={() => setView(months[vi - 1])} dir={-1} />
            <MonthButton label={t.nextMonth} disabled={vi >= months.length - 1} onClick={() => setView(months[vi + 1])} dir={1} />
          </div>
        </div>
        <div aria-hidden="true" className="mt-3 grid grid-cols-7 text-center text-xs font-medium text-muted">
          {weekdays.map((w) => (
            <span key={w} className="py-1 capitalize">
              {w}
            </span>
          ))}
        </div>
        <div key={view} className="c-cal-grid mt-1 grid grid-cols-7 gap-y-1" role="tablist" aria-label={t.dayLabel}>
          {shown.map((n, i) => {
            if (n === 0) return <span key={`lead-${i}`} />;
            const d = `${view}-${String(n).padStart(2, "0")}`;
            const open = viewDays.includes(d);
            const on = d === date;
            const today = d === days[0];
            if (!open) {
              return (
                <span key={d} aria-hidden="true" className="grid h-11 place-items-center font-mono text-[0.9375rem] text-muted/45 tabular-nums">
                  {n}
                </span>
              );
            }
            return (
              <div key={d} className="grid place-items-center">
                <button
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-label={longDate(d, locale) + (today ? `, ${t.today}` : "")}
                  aria-current={today ? "date" : undefined}
                  onClick={() => pickDay(d)}
                  className={`c-day relative grid size-11 place-items-center border font-mono text-[0.9375rem] font-medium tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                    on ? "bg-ink text-paper" : "bg-transparent text-ink"
                  } ${today && !on ? "is-today" : ""}`}
                >
                  {n}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-5 border-t border-line px-4 pt-4 pb-5">
        <p className="text-[0.9375rem] font-semibold tracking-[-0.01em] first-letter:uppercase" aria-live="polite">
          {longDate(date, locale)}
        </p>
        {times}
      </div>
    </div>
  );
}
