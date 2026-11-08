"use client";

import { useEffect, useMemo, useState } from "react";
import { dictionaries, formatDay, type Locale } from "@/lib/i18n/dictionaries";

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
function to12h(time: string, locale: Locale): string {
  const [h, m] = time.split(":").map(Number);
  return new Date(Date.UTC(2000, 0, 1, h, m)).toLocaleTimeString(locale === "es" ? "es-US" : "en-US", {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Day strip (today + 30 days) and the free times for the chosen day.
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
  const key = `${shopId}|${serviceId}|${barberId}|${date}|${refreshKey}`;

  useEffect(() => {
    const ctrl = new AbortController();
    const q = new URLSearchParams({ shopId, serviceId, barberId, date });
    fetch(`/api/availability?${q}`, { signal: ctrl.signal, cache: "no-store" })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.code ?? "UNKNOWN");
        setState({ key, slots: body.slots as Slot[], error: null });
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setState({ key, slots: null, error: e.message });
      });
    return () => ctrl.abort();
  }, [key, shopId, serviceId, barberId, date]);

  const loading = state.key !== key;
  const slots = loading ? null : state.slots;

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Day">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={d === date}
            onClick={() => setDate(d)}
            className={`min-h-12 shrink-0 snap-start rounded-xl border px-3 text-sm whitespace-nowrap ${
              d === date ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink"
            }`}
          >
            {formatDay(d, locale)}
          </button>
        ))}
      </div>

      {loading && <p className="text-muted">{t.loadingSlots}</p>}
      {!loading && state.error && <p className="text-accent">{t.errors[state.error] ?? t.errors.UNKNOWN}</p>}
      {!loading && slots && slots.length === 0 && <p className="text-muted">{t.noSlots}</p>}
      {!loading && slots && slots.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((s) => (
            <button
              key={s.startsAt}
              type="button"
              onClick={() => onPick(s)}
              aria-pressed={selected === s.startsAt}
              className={`min-h-12 rounded-xl border text-sm font-medium ${
                selected === s.startsAt ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface hover:border-ink/40"
              }`}
            >
              {to12h(s.time, locale)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
