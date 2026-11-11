"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { LandingDictionary } from "@/lib/i18n/landing";
import { type } from "./ui";

type Stage = LandingDictionary["howStage"];
const pop = (i: number) => ({ "--i": i }) as CSSProperties;

/**
 * How it works, pinned. On wide screens the three steps are tall; the one nearest the
 * middle of the screen is lit, the rail fills down to that point, and the sticky stage
 * on the right swaps to the matching scene, its rows popping in one after another.
 * Phones and tablets get the steps as plain text (no rail, no stage).
 */
export function HowStepper({ steps, stage }: { steps: { title: string; body: string }[]; stage: Stage }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-step]"));
    let queued = false;
    const update = () => {
      queued = false;
      const mid = window.innerHeight / 2;
      let best = 0;
      let bestD = Infinity;
      items.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      setActive(best);
      const r = el.getBoundingClientRect();
      el.style.setProperty("--hp", Math.max(0, Math.min(1, (mid - r.top) / r.height)).toFixed(4));
    };
    const queue = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    };
  }, []);

  return (
    <div className="mt-8 grid gap-16 lg:mt-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
      <div ref={wrap} className="relative lg:pl-9">
        {/* The rail: a hairline, and its fill growing to the middle of the screen. */}
        <span aria-hidden className="absolute inset-y-0 left-0 hidden w-px bg-night-line lg:block" />
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 hidden w-[2px] origin-top bg-[linear-gradient(180deg,rgba(229,72,61,.25),var(--l-red)_45%,var(--l-ink))] lg:block"
          style={{ transform: "scaleY(var(--hp, 0))" }}
        />
        <ol>
          {steps.map((step, i) => (
            <li
              key={step.title}
              data-step
              className={`flex flex-col justify-center py-6 transition-opacity duration-500 lg:min-h-[58vh] lg:py-0 ${
                i === active ? "lg:opacity-100" : "lg:opacity-[0.28]"
              }`}
            >
              <span className="font-mono text-[12px] text-night-muted">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 font-display text-[clamp(2rem,3.4vw,2.75rem)] font-[750] leading-[1]">{step.title}</h3>
              <p className={`${type.body} mt-3 max-w-[40ch] text-[17px]`}>{step.body}</p>
            </li>
          ))}
        </ol>
      </div>

      <div aria-hidden className="bm-card bm-card--still sticky top-[calc(50vh-220px)] hidden overflow-hidden lg:block">
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3 text-[12px] text-night-muted">
          <span className="flex gap-1.5">
            <i className="h-2.5 w-2.5 rounded-full bg-pole-red/70" />
            <i className="h-2.5 w-2.5 rounded-full bg-night-ink/60" />
            <i className="h-2.5 w-2.5 rounded-full bg-pole-blue/70" />
          </span>
          <span className="font-mono">{stage.titles[active]}</span>
          <span className="ml-auto flex gap-1">
            {stage.titles.map((t, i) => (
              <i
                key={t}
                className={`h-[3px] rounded-full transition-[width,background-color] duration-400 ${i === active ? "w-8 bg-night-ink" : "w-4 bg-night-line"}`}
              />
            ))}
          </span>
        </div>
        <div className="relative h-[380px]">
          <Scene on={active === 0}>
            <BookScene s={stage} />
          </Scene>
          <Scene on={active === 1}>
            <AlertScene s={stage} />
          </Scene>
          <Scene on={active === 2}>
            <TextScene s={stage} />
          </Scene>
        </div>
      </div>
    </div>
  );
}

function Scene({ on, children }: { on: boolean; children: ReactNode }) {
  return <div className={`bm-scene ${on ? "is-on" : ""}`}>{children}</div>;
}

function Check({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={`h-3.5 w-3.5 shrink-0 ${className}`}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const row = "rounded-xl border border-white/[0.08] px-3.5 py-3";

/** Step 1: the client picks a service, a barber and a free time. */
function BookScene({ s }: { s: Stage }) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className={`bm-pop flex items-center justify-between ${row}`} style={pop(0)}>
        <span>
          <span className="block text-[15px] font-semibold">{s.service}</span>
          <span className="block text-[12px] text-night-muted">{s.serviceMeta}</span>
        </span>
        <span className="flex items-center gap-2 text-[13px] text-night-ink/85">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-pole-blue/25 font-display text-[14px] font-[800]">D</span>
          {s.barber}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {s.times.map((t, i) => {
          const taken = s.taken.includes(i);
          const picked = i === s.picked;
          return (
            <span
              key={t}
              style={pop(i + 1)}
              className={`bm-pop rounded-lg border px-2 py-2.5 text-center text-[13px] tabular-nums ${
                picked
                  ? "border-night-ink bg-night-ink font-semibold text-night"
                  : taken
                    ? "border-white/[0.05] text-night-muted/50 line-through"
                    : "border-white/[0.1] text-night-ink/85"
              }`}
            >
              {t}
            </span>
          );
        })}
      </div>
      <div className="bm-pop mt-auto flex items-center gap-3 rounded-xl bg-[linear-gradient(90deg,rgba(229,72,61,.28),rgba(229,72,61,.06))] px-3.5 py-3 text-[14px] font-semibold" style={pop(8)}>
        <span className="grid h-6 w-6 place-items-center rounded-full bg-pole-red text-night">
          <Check />
        </span>
        {s.booked}
      </div>
    </div>
  );
}

/** Step 2: the alert lands on the barber's phone, and the booking is already in their day. */
function AlertScene({ s }: { s: Stage }) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="bm-pop rounded-2xl bg-night-raised/90 p-4 shadow-[0_24px_50px_-24px_rgba(0,0,0,.9)] ring-1 ring-white/10" style={pop(0)}>
        <p className="flex items-center gap-2 text-[12px] text-night-muted">
          <span className="bm-pole !h-4 !w-1.5" />
          {s.alertFrom}
          <span className="ml-auto">{s.alertWhen}</span>
        </p>
        <p className="mt-2 text-[15px] font-semibold">{s.alertTitle}</p>
        <p className="text-[14px] text-night-ink/85">{s.alertBody}</p>
      </div>
      <p className="bm-pop font-mono text-[12px] text-night-muted" style={pop(1)}>
        {s.dayTitle}
      </p>
      <ul className="grid gap-2">
        {s.day.map((d, i) => (
          <li
            key={d.time}
            style={pop(i + 2)}
            className={`bm-pop flex items-center gap-3 ${row} ${d.isNew ? "border-white/15 bg-[linear-gradient(90deg,rgba(91,134,240,.28),rgba(91,134,240,.05))]" : ""}`}
          >
            <span className="w-[4.5rem] shrink-0 font-mono text-[12px] text-night-muted">{d.time}</span>
            <span className="text-[14px] font-medium">{d.who}</span>
            {d.isNew && <span className="ml-auto rounded-full bg-pole-blue px-2 py-0.5 text-[11px] font-semibold text-night">{s.newBadge}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Step 3: the reminder text, two hours before, with its change and cancel link. */
function TextScene({ s }: { s: Stage }) {
  return (
    <div className="flex h-full flex-col">
      <p className="bm-pop text-center text-[12px] text-night-muted" style={pop(0)}>
        {s.textFrom}
      </p>
      <div className="bm-pop mt-4 max-w-[85%] self-start rounded-[20px] rounded-bl-[6px] bg-night-raised px-4 py-3 text-[15px] leading-[1.45]" style={pop(1)}>
        {s.text}
      </div>
      <p className="bm-pop mt-2 flex items-center gap-1.5 text-[12px] text-night-muted" style={pop(2)}>
        <Check className="text-pole-blue" />
        {s.textSent}
      </p>
      <div className="mt-auto grid grid-cols-2 gap-2">
        {s.textActions.map((a, i) => (
          <span
            key={a}
            style={pop(i + 3)}
            className={`bm-pop rounded-xl border px-3 py-3 text-center text-[14px] font-semibold ${i === 0 ? "border-night-ink/30 text-night-ink" : "border-pole-red/40 text-pole-red"}`}
          >
            {a}
          </span>
        ))}
      </div>
    </div>
  );
}
