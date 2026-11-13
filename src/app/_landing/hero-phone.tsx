"use client";

import Link from "next/link";
import { ViewTransition, addTransitionType, startTransition, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import type { LandingDictionary } from "@/lib/i18n/landing";
import { LiveDot } from "./live-dot";

type Phone = LandingDictionary["heroPhone"];

/* The real booking page's light palette (achromatic, globals.css :root), so the demo looks like
   what clients get: ground #fafafa, white cards, hairline #dedede, ink #0f0f0f, muted #5d5d5d,
   raised #f0f0f0, black pills, and the light red (#cc2827) only on the booked check. */
const c = {
  paper: "bg-[#fafafa]",
  card: "rounded-[14px] border border-[#dedede] bg-white",
  ink: "text-[#0f0f0f]",
  muted: "text-[#5d5d5d]",
} as const;

/**
 * The hero phone, live: a pretend booking at the demo shop. Service, then barber,
 * then a time, then "You're booked". Each step is a view transition: the next screen
 * slides in from the right, Back slides the previous one in from the left.
 * Nothing is saved. With a mouse, the phone leans a little toward the pointer.
 */
export function HeroPhone({ p, lang }: { p: Phone; lang: string }) {
  const [step, setStep] = useState(0);
  const [service, setService] = useState(1);
  const [barber, setBarber] = useState<number | null>(1);
  const [time, setTime] = useState(10);
  const [booked, setBooked] = useState(0); // counts bookings, so the check mark replays each time
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const box = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const moved = useRef(false);

  // The tapped button leaves with the old screen, so after a step hand focus to the new
  // screen's title (screen readers hear where they are; Tab continues from there).
  useEffect(() => {
    if (!moved.current) return;
    screen.current?.querySelector<HTMLElement>("[data-screen-title]")?.focus({ preventScroll: true });
  }, [step]);

  /** Moves to another screen inside a transition, tagged with its direction. */
  function go(next: number) {
    startTransition(() => {
      // "Book again" (3 → 0) starts over, so it moves forward too.
      addTransitionType(next > step || (next === 0 && step === 3) ? "phone-forward" : "phone-back");
      setStep(next);
    });
    moved.current = true;
  }

  const barberName = barber === null ? p.barbers[1] : p.barbers[barber];
  const svc = p.services[service];

  function lean(e: PointerEvent) {
    if (e.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = box.current!.getBoundingClientRect();
    setTilt({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 });
  }

  const screens: ReactNode[] = [
    // 0. Services
    <Screen key="s" title={p.chooseService} p={p} lang={lang}>
      <ul className="flex flex-col gap-2">
        {p.services.map((s, i) => (
          <li key={s.name}>
            <Tap
              onClick={() => {
                setService(i);
                go(1);
              }}
              className="flex items-start justify-between gap-2 px-3 py-2.5"
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-medium leading-tight">{s.name}</span>
                <span className={`block text-[11px] ${c.muted}`}>{s.min} min</span>
                {s.special && <span className="mt-1 inline-block rounded-full bg-[#f0f0f0] px-1.5 py-px text-[9.5px] text-[#0f0f0f]">{s.special}</span>}
              </span>
              <span className="shrink-0 text-right">
                {s.was ? (
                  <span className={`block text-[10px] line-through ${c.muted}`}>${s.was}</span>
                ) : (
                  <span className={`block text-[10px] ${c.muted}`}>{p.from}</span>
                )}
                <span className="block text-[14px] font-semibold tabular-nums">${s.price}</span>
              </span>
            </Tap>
          </li>
        ))}
      </ul>
    </Screen>,

    // 1. Barbers
    <Screen key="b" title={p.chooseBarber} p={p} lang={lang} onBack={() => go(0)}>
      <ul className="flex flex-col gap-2">
        {[null, 0, 1, 2, 3].map((b) => (
          <li key={b ?? "any"}>
            <Tap
              onClick={() => {
                setBarber(b);
                go(2);
              }}
              className="flex items-center gap-2.5 px-3 py-2.5"
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-semibold ${
                  b === null ? "bg-[#0f0f0f] text-white" : "bg-[#f0f0f0] text-[#0f0f0f]"
                }`}
              >
                {b === null ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <circle cx="9" cy="8" r="3" />
                    <path d="M3 20a6 6 0 0 1 12 0M16 4.5a3 3 0 0 1 0 6M21 20a6 6 0 0 0-3.5-5.4" />
                  </svg>
                ) : (
                  p.barbers[b][0]
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium leading-tight">{b === null ? p.anyBarber : p.barbers[b]}</span>
                {b === null && <span className={`block text-[11px] ${c.muted}`}>{p.anyBarberHint}</span>}
              </span>
            </Tap>
          </li>
        ))}
      </ul>
    </Screen>,

    // 2. Times
    <Screen key="t" title={p.pickTime} p={p} lang={lang} onBack={() => go(1)}>
      <p className="mb-2 inline-block rounded-full bg-[#0f0f0f] px-2.5 py-1.5 text-[11px] text-white">{p.day}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {p.times.map((t, i) => {
          const taken = p.taken.includes(i);
          return (
            <button
              key={t}
              type="button"
              disabled={taken}
              onClick={() => {
                setTime(i);
                setBooked((n) => n + 1);
                go(3);
              }}
              className={`${c.card} min-h-11 px-1 text-[11px] tabular-nums transition-[background-color,border-color,transform] duration-150 hover:border-[#0f0f0f] active:scale-95 disabled:border-transparent disabled:bg-transparent disabled:text-[#a4a4a4] disabled:line-through focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0f0f0f]`}
            >
              {t}
            </button>
          );
        })}
      </div>
    </Screen>,

    // 3. Booked
    <Screen key="d" p={p} lang={lang}>
      <div className="flex h-full flex-col items-center pt-6 text-center">
        <span key={booked} className="landing-pop grid h-12 w-12 place-items-center rounded-full bg-[#cc2827] text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <p data-screen-title tabIndex={-1} className="mt-4 text-[17px] font-semibold tracking-[-0.01em] outline-none">
          {p.bookedTitle}
        </p>
        <div className={`${c.card} mt-4 w-full px-3 py-3 text-left`}>
          <p className="text-[13px] font-medium">{svc.name}</p>
          <p className={`text-[11px] ${c.muted}`}>
            {p.bookedWith} {barberName} · {p.dayShort} {p.bookedAt} {p.times[time]}
          </p>
          <p className="mt-1 text-[13px] font-semibold tabular-nums">${svc.price}</p>
        </div>
        <p className={`mt-3 text-[11px] leading-[1.45] ${c.muted}`}>{p.bookedNote}</p>
        <button
          type="button"
          onClick={() => go(0)}
          className="mt-auto mb-2 min-h-11 w-full rounded-full bg-[#0f0f0f] text-[13px] font-medium text-white transition-transform active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f0f0f]"
        >
          {p.again}
        </button>
      </div>
    </Screen>,
  ];

  return (
    <div
      ref={box}
      onPointerMove={lean}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      className="relative mx-auto w-full max-w-[288px]"
    >
      <div
        className="transition-transform duration-500 ease-out motion-reduce:transition-none"
        style={{
          transform: `perspective(1400px) rotateY(${tilt.x * 10}deg) rotateX(${-tilt.y * 8}deg)`,
        }}
      >
        <div className="rounded-[2.4rem] bg-black p-[7px] shadow-[0_0_0_1px_rgba(255,255,255,.14)]">
          <div
            role="group"
            aria-label={p.label}
            className={`relative h-[440px] overflow-hidden rounded-[2rem] ${c.paper} ${c.ink} sm:h-[500px]`}
          >
            <span aria-hidden className="absolute left-1/2 top-2 z-10 h-[15px] w-[64px] -translate-x-1/2 rounded-full bg-black" />
            <ViewTransition
              key={step}
              default="none"
              enter={{ "phone-forward": "phone-in-fwd", "phone-back": "phone-in-back", default: "none" }}
              exit={{ "phone-forward": "phone-out-fwd", "phone-back": "phone-out-back", default: "none" }}
              update={{ "lang-switch": "lang-swap", default: "none" }}
            >
              <div ref={screen} className="absolute inset-0 pt-7">
                {screens[step]}
              </div>
            </ViewTransition>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-6 flex w-max max-w-full items-center gap-2 rounded-full border border-white/15 bg-background/70 px-3.5 py-1.5 text-[13px] font-medium text-foreground">
        <LiveDot />
        {step === 3 ? (
          <Link href="/b/demo-shop" transitionTypes={["page"]} className="underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white">
            {p.label}
          </Link>
        ) : (
          p.hint
        )}
      </p>
    </div>
  );
}

/** One screen of the phone: the shop header, an optional Back, a title and its content. */
function Screen({ title, p, lang, onBack, children }: { title?: string; p: Phone; lang: string; onBack?: () => void; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto overscroll-contain px-3.5 pb-3 [scrollbar-width:none]">
      <div className="flex items-start justify-between gap-2 pt-2">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-tight tracking-[-0.02em]">{p.shop}</p>
          <p className={`truncate text-[10px] ${c.muted}`}>{p.address}</p>
        </div>
        <span className={`shrink-0 rounded-full border border-[#dedede] px-2 py-0.5 text-[10px] ${c.muted}`}>{lang}</span>
      </div>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className={`-my-1 mt-1 -ml-1 flex min-h-11 w-max min-w-11 items-center gap-0.5 rounded px-1 text-[11px] ${c.muted} transition-colors hover:text-[#0f0f0f] focus-visible:outline-2 focus-visible:outline-[#0f0f0f]`}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {p.back}
        </button>
      )}
      {title && (
        <p data-screen-title tabIndex={-1} className={`${onBack ? "mt-1.5" : "mt-4"} mb-2.5 text-[14px] font-medium outline-none`}>
          {title}
        </p>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}

/** A tappable white card, like the real page's service and barber rows. */
function Tap({ onClick, className, children }: { onClick: () => void; className: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ WebkitTapHighlightColor: "transparent" } as CSSProperties}
      className={`${c.card} w-full text-left transition-[border-color,transform,box-shadow] duration-150 hover:border-[#0f0f0f]/60 hover:shadow-[0_6px_16px_-10px_rgba(15,15,15,.5)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0f0f0f] ${className}`}
    >
      {children}
    </button>
  );
}
