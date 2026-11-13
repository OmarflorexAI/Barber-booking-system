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

const GROUPS = ["morning", "afternoon", "evening"] as const;
const groupOf = (time: string) => {
  const h = Number(time.slice(0, 2));
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
};

/**
 * Day strip (today + 30 days, scrolling sideways inside itself) and the free times for the
 * chosen day as mono pills, grouped Morning / Afternoon / Evening. Taken times are not shown.
 * `refreshKey` forces a reload, e.g. after "that time was just taken".
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
}) {
  const { shopId, serviceId, barberId, timezone, locale, selected, onPick, refreshKey = 0 } = props;
  const t = dictionaries[locale];
  const days = useMemo(() => {
    const today = todayIn(timezone);
    return Array.from({ length: 31 }, (_, i) => addDays(today, i));
  }, [timezone]);
  const [date, setDate] = useState(days[0]);
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

  return (
    <div className="flex min-w-0 flex-col gap-5">
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
              className={`flex w-14 shrink-0 flex-col items-center gap-0.5 rounded-full border py-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                on ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink hover:border-ink/40"
              }`}
            >
              <span className={`text-xs font-medium ${on ? "" : "text-muted"}`}>{p.weekday}</span>
              <span className="font-mono text-lg leading-6 font-medium tabular-nums">{p.day}</span>
              <span className={`text-xs ${on ? "" : "text-muted"}`}>{p.month}</span>
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="status" aria-busy="true">
          <span className="sr-only">{t.loadingSlots}</span>
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="h-12 rounded-full bg-raised motion-safe:animate-pulse" />
          ))}
        </div>
      )}

      {!loading && state.error && (
        <Notice role="alert">
          <p>{t.errors[state.error] ?? t.errors.UNKNOWN}</p>
        </Notice>
      )}

      {!loading && slots && slots.length === 0 && (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted">{search === "none" ? t.noSlotsAhead : t.noSlots}</p>
          {search !== "none" && days.indexOf(date) < days.length - 1 && (
            <button type="button" className="btn-ghost" disabled={search === "searching"} onClick={nextFreeDay}>
              {t.nextFreeDay}
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
                        className={`min-h-12 rounded-full border px-2 font-mono text-base font-medium whitespace-nowrap tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                          on ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink hover:border-ink/40"
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
    </div>
  );
}
