"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Notice } from "@/components/notice";
import { dictionaries, formatDay, formatTime, type Locale } from "@/lib/i18n/dictionaries";
import { addDayOffAction, removeDayOffAction, saveHoursAction } from "./hours-actions";
import { focusRing, Switch } from "./prices-list";

export type WeekDay = { weekday: number; start: string; end: string; breakStart: string | null; breakEnd: string | null };

type DayState = { on: boolean; start: string; end: string; hasBreak: boolean; breakStart: string; breakEnd: string };

/** Monday first, the way a Shop's week reads; 0 = Sunday as the engine stores it. */
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const TEXT_BTN = `-ml-2 inline-flex min-h-11 items-center self-start rounded-md px-2 text-sm font-medium text-ink underline underline-offset-4 decoration-line hover:decoration-ink ${focusRing}`;
const ICON_BTN = `-mr-2 inline-grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-raised hover:text-ink disabled:pointer-events-none disabled:opacity-40 ${focusRing}`;

/** Every quarter hour of the day, "00:00" … "23:45". */
const TIMES = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`);
const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
/** "13:30" shown the way the Day view shows times (12-hour in both languages, "1:30 p. m." in Spanish). */
const timeLabel = (t: string, locale: Locale) => formatTime(new Date(Date.UTC(2000, 0, 1, Number(t.slice(0, 2)), Number(t.slice(3, 5)))), "UTC", locale);

function initial(week: WeekDay[]): Record<number, DayState> {
  const out: Record<number, DayState> = {};
  for (const wd of ORDER) {
    const d = week.find((w) => w.weekday === wd);
    out[wd] = d
      ? { on: true, start: d.start, end: d.end, hasBreak: !!d.breakStart, breakStart: d.breakStart ?? "13:00", breakEnd: d.breakEnd ?? "14:00" }
      : { on: false, start: "09:00", end: "18:00", hasBreak: false, breakStart: "13:00", breakEnd: "14:00" };
  }
  return out;
}

/** The weekly hours, Monday to Sunday: on/off, start and end, an optional break; one Save for the week. */
export function HoursEditor({ shopId, barberId, locale, week }: { shopId: string; barberId: string; locale: Locale; week: WeekDay[] }) {
  const h = dictionaries[locale].settings.barberProfile.hours;
  const router = useRouter();
  const [days, setDays] = useState(() => initial(week));
  const [bad, setBad] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [pending, start] = useTransition();

  const set = (wd: number, patch: Partial<DayState>) => {
    setDays((prev) => ({ ...prev, [wd]: { ...prev[wd]!, ...patch } }));
    setStatus("");
    if (error) {
      setError(null);
      setBad(new Set());
    }
  };

  function save() {
    const problems: string[] = [];
    const wrong = new Set<number>();
    for (const wd of ORDER) {
      const d = days[wd]!;
      if (!d.on) continue;
      if (mins(d.start) >= mins(d.end)) {
        problems.push(h.endBeforeStart(h.weekdays[wd]!));
        wrong.add(wd);
      } else if (d.hasBreak && !(mins(d.start) < mins(d.breakStart) && mins(d.breakStart) < mins(d.breakEnd) && mins(d.breakEnd) < mins(d.end))) {
        problems.push(h.breakOutside(h.weekdays[wd]!));
        wrong.add(wd);
      }
    }
    if (problems.length) {
      setBad(wrong);
      setError(problems.join(" "));
      return;
    }
    setError(null);
    setBad(new Set());
    setStatus("");
    const payload = ORDER.filter((wd) => days[wd]!.on).map((wd) => {
      const d = days[wd]!;
      return {
        weekday: wd,
        start: d.start,
        end: d.end,
        breakStart: d.hasBreak ? d.breakStart : null,
        breakEnd: d.hasBreak ? d.breakEnd : null,
      };
    });
    start(async () => {
      const res = await saveHoursAction({ shopId, barberId, days: payload });
      if (res.ok) {
        setStatus(h.saved);
        router.refresh();
      } else setError(h.errors[res.code as keyof typeof h.errors] ?? h.errors.UNKNOWN);
    });
  }

  const timeSelect = (wd: number, label: string, value: string, onChange: (v: string) => void) => (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm text-muted">{label}</span>
      <select
        className="field font-mono tabular-nums"
        value={value}
        aria-invalid={bad.has(wd) || undefined}
        aria-describedby={bad.has(wd) ? "hours-error" : undefined}
        onChange={(e) => onChange(e.target.value)}
      >
        {TIMES.map((t) => (
          <option key={t} value={t}>
            {timeLabel(t, locale)}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <form
      noValidate
      aria-label={h.weekLabel}
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <ul className="border-t border-line">
        {ORDER.map((wd) => {
          const d = days[wd]!;
          const name = h.weekdays[wd]!;
          return (
            <li key={wd} className="flex flex-col border-b border-line">
              <div className="flex min-h-14 items-center gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span id={`day-${wd}`} className="font-semibold">
                    {name}
                  </span>
                  <span className="font-mono text-sm text-muted tabular-nums">
                    {d.on
                      ? `${timeLabel(d.start, locale)} – ${timeLabel(d.end, locale)}${d.hasBreak ? ` · ${h.breakShort(timeLabel(d.breakStart, locale), timeLabel(d.breakEnd, locale))}` : ""}`
                      : h.off}
                  </span>
                </div>
                <Switch checked={d.on} disabled={pending} label={h.worksOn(name)} onChange={(on) => set(wd, { on })} />
              </div>
              {d.on && (
                <div className="flex flex-col gap-3 pb-4">
                  <div className="grid grid-cols-2 gap-3">
                    {timeSelect(wd, h.from, d.start, (v) => set(wd, { start: v }))}
                    {timeSelect(wd, h.to, d.end, (v) => set(wd, { end: v }))}
                  </div>
                  {d.hasBreak ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        {timeSelect(wd, h.breakFrom, d.breakStart, (v) => set(wd, { breakStart: v }))}
                        {timeSelect(wd, h.breakTo, d.breakEnd, (v) => set(wd, { breakEnd: v }))}
                      </div>
                      <button type="button" className={TEXT_BTN} onClick={() => set(wd, { hasBreak: false })}>
                        {h.removeBreak}
                      </button>
                    </>
                  ) : (
                    <button type="button" className={TEXT_BTN} onClick={() => set(wd, { hasBreak: true })}>
                      {h.addBreak}
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {error && (
        <Notice role="alert" id="hours-error">
          <p>{error}</p>
        </Notice>
      )}

      <p className="max-w-prose text-sm text-muted">{h.note}</p>

      <button type="submit" className="btn-ghost w-full sm:w-auto sm:self-start" disabled={pending} aria-busy={pending}>
        {pending ? h.saving : h.save}
      </button>
      <p role="status" className="-mt-2 text-sm text-muted">
        {status}
      </p>
    </form>
  );
}

/** Upcoming days off (Shop calendar days), each removable, plus a native date input to add one. */
export function DaysOff({ shopId, barberId, locale, today, days }: { shopId: string; barberId: string; locale: Locale; today: string; days: string[] }) {
  const o = dictionaries[locale].settings.barberProfile.hours.daysOff;
  const router = useRouter();
  const [date, setDate] = useState("");
  const [error, setError] = useState<{ text: string; day?: string } | null>(null);
  const [status, setStatus] = useState("");
  const [pending, start] = useTransition();
  const [removing, setRemoving] = useState<string | null>(null);

  const errText = (code: string) => o.errors[code as keyof typeof o.errors] ?? o.errors.UNKNOWN;

  function add() {
    if (!date) return setError({ text: o.errors.DATE_REQUIRED });
    if (date < today) return setError({ text: o.errors.DAY_PAST });
    setError(null);
    setStatus("");
    start(async () => {
      const res = await addDayOffAction({ shopId, barberId, date });
      if (res.ok) {
        setStatus(o.added(formatDay(date, locale)));
        setDate("");
        router.refresh();
      } else setError({ text: errText(res.code), day: res.code === "DAY_HAS_BOOKINGS" ? date : undefined });
    });
  }

  function remove(day: string) {
    setError(null);
    setStatus("");
    setRemoving(day);
    start(async () => {
      const res = await removeDayOffAction({ shopId, barberId, date: day });
      setRemoving(null);
      if (res.ok) {
        setStatus(o.removed(formatDay(day, locale)));
        router.refresh();
      } else setError({ text: errText(res.code) });
    });
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <h3 className="text-base font-semibold">{o.title}</h3>
      {days.length === 0 ? (
        <p className="max-w-prose text-muted">{o.empty}</p>
      ) : (
        <ul aria-label={o.title} className="border-t border-line">
          {days.map((d) => (
            <li key={d} className="flex min-h-14 items-center gap-3 border-b border-line">
              <span className="min-w-0 flex-1">{formatDay(d, locale)}</span>
              <button
                type="button"
                aria-label={o.removeLabel(formatDay(d, locale))}
                aria-busy={removing === d}
                disabled={pending}
                onClick={() => remove(d)}
                className={ICON_BTN}
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        noValidate
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <label className="flex min-w-0 flex-col gap-1.5 sm:w-56">
          <span className="text-sm font-medium">{o.date}</span>
          <input
            type="date"
            className="field font-mono tabular-nums"
            min={today}
            value={date}
            aria-invalid={(error && !error.day) || undefined}
            aria-describedby={error ? "dayoff-error" : undefined}
            onChange={(e) => {
              setDate(e.target.value);
              if (error) setError(null);
            }}
          />
        </label>
        <button type="submit" className="btn-ghost w-full sm:w-auto" disabled={pending} aria-busy={pending && !removing}>
          {pending && !removing ? o.adding : o.add}
        </button>
      </form>

      {error && (
        <Notice role="alert" id="dayoff-error">
          <p>{error.text}</p>
          {error.day && (
            <Link
              href={`/app/day?date=${error.day}&barber=${barberId}`}
              className={`-ml-1 inline-flex min-h-11 items-center self-start rounded-md px-1 font-medium underline underline-offset-4 ${focusRing}`}
            >
              {o.openDay}
            </Link>
          )}
        </Notice>
      )}

      <p role="status" className="-mt-2 text-sm text-muted">
        {status}
      </p>
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
