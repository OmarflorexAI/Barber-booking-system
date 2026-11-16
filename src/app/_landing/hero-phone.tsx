"use client";

import Link from "next/link";
import { ViewTransition, addTransitionType, startTransition, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import type { LandingDictionary } from "@/lib/i18n/landing";
import { LiveDot } from "./live-dot";

type Phone = LandingDictionary["heroPhone"];

/* The real booking page's light look (globals.css, "Client pages (premium)": the iOS grouped
   cards), so the demo looks like what clients get: a soft grey ground (#f2f2f4), white cards
   with 18px corners, a hairline rim and a layered shadow, separators inset from the left,
   filled grey times and avatars (#f0f0f3), ink #0f0f0f, muted #6b6b70, numbers in the page
   face with tabular figures, the lit ink button, and the light red (#cc2827) only on the
   booked check. */
const c = {
  paper: "bg-[#f2f2f4]",
  // Ambient + key light: a hairline contact, a soft near shadow, a long low one; a faint top highlight.
  card: "rounded-[18px] border border-black/[.06] border-t-black/[.03] bg-white shadow-[inset_0_1px_0_#fff,0_1px_1px_rgba(0,0,0,.04),0_3px_8px_-2px_rgba(0,0,0,.06),0_14px_30px_-12px_rgba(0,0,0,.16)]",
  // iOS separators: a hairline under every row but the last, starting at the text (--sep).
  rows: "[&>li:not(:last-child)]:relative [&>li:not(:last-child)]:after:absolute [&>li:not(:last-child)]:after:right-0 [&>li:not(:last-child)]:after:bottom-0 [&>li:not(:last-child)]:after:left-(--sep) [&>li:not(:last-child)]:after:h-px [&>li:not(:last-child)]:after:bg-[#e6e6ea] [&>li:not(:last-child)]:after:content-['']",
  row: "flex w-full items-center gap-2.5 px-3 text-left transition-colors duration-150 hover:bg-[#f6f6f8] active:bg-[#f0f0f3] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0f0f0f]",
  fill: "bg-[#f0f0f3]",
  ink: "text-[#0f0f0f]",
  muted: "text-[#6b6b70]",
  mono: "tabular-nums",
  // The page's primary button: ink lit from above, an inner highlight and a soft drop.
  primary:
    "bg-[#0f0f0f] bg-linear-to-b from-white/[.16] to-transparent to-55% text-white shadow-[inset_0_1px_0_rgba(255,255,255,.28),inset_0_-1px_0_rgba(0,0,0,.25),0_1px_2px_rgba(0,0,0,.18),0_10px_22px_-10px_rgba(0,0,0,.45)]",
} as const;

/** Which of the day's times are taken, per day of the strip (index into p.times). Day 0
 *  uses the dictionary's own list; day 3 (Sunday, no dot) is full. Each day fits three rows. */
const TAKEN_LATER: number[][] = [
  [0, 1, 4, 5, 6, 7],
  [0, 1, 2, 4, 5, 6, 7, 8, 10],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  [0, 3, 5, 6, 9],
  [1, 2, 4, 7, 8, 10],
];

/** An item that rises in when its screen appears; `i` sets its place in the stagger. */
function rise(i: number): CSSProperties {
  return { "--i": i } as CSSProperties;
}

/**
 * The hero phone, live: a pretend booking at the demo shop. Service, then barber,
 * then a time, then "You're booked". Each step is a view transition: the next screen
 * slides in from the right, Back slides the previous one in from the left.
 * Nothing is saved. With a mouse, the phone leans a little toward the pointer.
 */
export function HeroPhone({ p }: { p: Phone }) {
  const [step, setStep] = useState(0);
  const [service, setService] = useState(1);
  const [barber, setBarber] = useState<number | null>(1);
  const [time, setTime] = useState(10);
  const [day, setDay] = useState(0); // index into the day strip
  const [picked, setPicked] = useState<number | null>(null); // the time chip raised just before "booked"
  const [booked, setBooked] = useState(0); // counts bookings, so the check mark replays each time
  const pending = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  const device = useRef<HTMLDivElement>(null);
  const aim = useRef({ x: 0, y: 0 });
  const frame = useRef(0);
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

  // The lean: at most 5deg sideways and 4deg up/down, written straight to the style once
  // per frame (no re-render); the CSS transition eases it. Mouse only, never under reduced motion.
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      clearTimeout(pending.current);
    },
    [],
  );
  function paint() {
    frame.current = 0;
    const { x, y } = aim.current;
    // Resting straight drops the 3D layer so the screen stays pin-sharp.
    if (device.current) device.current.style.transform = x === 0 && y === 0 ? "none" : `perspective(1400px) rotateY(${x * 10}deg) rotateX(${-y * 8}deg)`;
  }
  function aimAt(x: number, y: number) {
    aim.current = { x, y };
    if (!frame.current) frame.current = requestAnimationFrame(paint);
  }
  function lean(e: PointerEvent) {
    if (e.pointerType !== "mouse" || !matchMedia("(pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = box.current!.getBoundingClientRect();
    aimAt((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
  }

  // Like the real picker, taken times are not shown; the free ones split by part of the day.
  const takenOn = (d: number) => (d === 0 ? p.taken : TAKEN_LATER[d - 1] ?? []);
  const freeOn = (d: number) => p.times.map((t, i) => ({ t, i })).filter(({ i }) => !takenOn(d).includes(i));
  const isAm = (t: string) => /a\.?\s?m\.?$/i.test(t);
  const free = freeOn(day);
  const groups = [free.filter(({ t }) => isAm(t)), free.filter(({ t }) => !isAm(t))].filter((g) => g.length > 0);

  /** A new day: the ink tile springs over and the chosen time is dropped. */
  function pickDay(d: number) {
    if (pending.current) return;
    setDay(d);
    setPicked(null);
  }
  /** A time: the chip lifts for a beat, then the booked screen. */
  function pickTime(i: number) {
    if (pending.current) return;
    setPicked(i);
    pending.current = window.setTimeout(() => {
      pending.current = 0;
      setTime(i);
      setBooked((n) => n + 1);
      go(3);
    }, 200);
  }

  const screens: ReactNode[] = [
    // 0. Services: one card of ruled rows, like the real page.
    <Screen key="s" title={p.chooseService} p={p} at={0}>
      <ul className={`${c.card} ${c.rows} overflow-hidden [--sep:12px]`}>
        {p.services.map((s, i) => (
          <li key={s.name} className="hp-rise" style={rise(4 + i)}>
            <Tap
              onClick={() => {
                setService(i);
                go(1);
              }}
              className="min-h-[46px] justify-between py-2"
            >
              <span className="min-w-0">
                <span className="block text-[12.5px] leading-tight font-medium">{s.name}</span>
                <span className={`mt-0.5 flex items-center gap-1.5 text-[10.5px] ${c.muted}`}>
                  <span className={c.mono}>{s.min} min</span>
                  {s.special && <span className={`rounded-full ${c.fill} px-1.5 text-[9.5px] font-medium text-[#0f0f0f]`}>{s.special}</span>}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-right">
                <span>
                  {s.was ? (
                    <span className={`block text-[9.5px] line-through ${c.muted} ${c.mono}`}>${s.was}</span>
                  ) : (
                    <span className={`block text-[9.5px] ${c.muted}`}>{p.from}</span>
                  )}
                  <span className={`block text-[13px] font-semibold ${c.mono}`}>${s.price}</span>
                </span>
                <Chevron />
              </span>
            </Tap>
          </li>
        ))}
      </ul>
    </Screen>,

    // 1. Barbers: "Any available" first, then initials discs.
    <Screen key="b" title={p.chooseBarber} p={p} at={1} onBack={() => go(0)} dock={<Dock name={svc.name} price={svc.price} />}>
      <ul className={`${c.card} ${c.rows} overflow-hidden [--sep:52px]`}>
        {[null, 0, 1, 2, 3].map((b, i) => (
          <li key={b ?? "any"} className="hp-rise" style={rise(4 + i)}>
            <Tap
              onClick={() => {
                setBarber(b);
                go(2);
              }}
              className="min-h-[46px] py-1.5"
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-semibold ${
                  b === null ? "bg-[#0f0f0f] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.2),0_4px_10px_-4px_rgba(0,0,0,.4)]" : `${c.fill} text-[#0f0f0f]`
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
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] leading-tight font-medium">{b === null ? p.anyBarber : p.barbers[b]}</span>
                {b === null && <span className={`block text-[10.5px] ${c.muted}`}>{p.anyBarberHint}</span>}
              </span>
              <Chevron />
            </Tap>
          </li>
        ))}
      </ul>
    </Screen>,

    // 2. Times: one card like the real time card, the week as rounded squares (the chosen
    //    day an ink tile that springs from day to day, a dot under days with free times),
    //    then that day's free times by part of day.
    <Screen key="t" title={p.pickTime} p={p} at={2} onBack={() => go(1)} dock={<Dock name={svc.name} sub={barberName} price={svc.price} />}>
      <p className="sr-only" aria-live="polite">
        {dayLabel(p, day)}
      </p>
      <div className={`${c.card} px-2.5 pt-2 pb-2.5`}>
        <div className="relative grid grid-cols-6 gap-1">
          {/* The ink tile: one element under the numbers, moved with a transform. */}
          <span aria-hidden className="hp-day-ink pointer-events-none absolute bottom-0 left-0 flex h-[30px] w-[calc((100%-20px)/6)] justify-center" style={{ "--d": day } as CSSProperties}>
            <span className={`h-[30px] w-[30px] rounded-[9px] ${c.primary} hp-raised`} />
          </span>
          {p.week.map((w, d) => {
            const on = d === day;
            const open = freeOn(d).length > 0;
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                aria-label={dayLabel(p, d)}
                onClick={() => pickDay(d)}
                style={{ WebkitTapHighlightColor: "transparent" } as CSSProperties}
                className="group relative flex flex-col items-center gap-0.5 rounded-[10px] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0f0f0f]"
              >
                <span className={`text-[8.5px] font-medium ${on ? "text-[#0f0f0f]" : c.muted}`}>{w}</span>
                <span
                  className={`relative grid h-[30px] w-[30px] place-items-center rounded-[9px] text-[12px] font-semibold ${c.mono} transition-colors duration-200 ${
                    on ? "text-white" : "text-[#0f0f0f] group-hover:bg-[#f0f0f3]"
                  }`}
                >
                  {dayNumber(p.day) + d}
                  <span className={`absolute bottom-[3px] h-[3px] w-[3px] rounded-full transition-colors duration-200 ${!open ? "bg-transparent" : on ? "bg-white" : "bg-[#0f0f0f]"}`} />
                </span>
              </button>
            );
          })}
        </div>
        <div key={day} className="mt-2 min-h-[124px] border-t border-[#ececef] pt-1.5">
          {groups.length === 0 && (
            <p className={`hp-rise pt-9 text-center text-[11px] font-medium ${c.muted}`} style={rise(0)}>
              {p.noTimes}
            </p>
          )}
          {groups.map((group, g) => (
            <div key={g} className={g ? "mt-1.5" : ""}>
              <p aria-hidden className={`hp-rise mb-1 flex items-center gap-2 text-[9.5px] font-medium ${c.muted}`} style={rise(g * 3)}>
                {group[0].t.match(/[ap]\.?\s?m\.?$/i)?.[0]}
                <span className="h-px flex-1 bg-[#ececef]" />
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {group.map(({ t, i }, k) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={picked === i}
                    onClick={() => pickTime(i)}
                    style={rise(g * 3 + 1 + k)}
                    className={`hp-rise min-h-[32px] rounded-[10px] px-1 text-[11px] font-medium ${c.mono} transition-[background-color,color,box-shadow,translate,scale] duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0f0f0f] ${
                      picked === i
                        ? `${c.primary} hp-raised -translate-y-px`
                        : `${c.fill} hover:-translate-y-px hover:bg-white hover:shadow-[0_0_0_1px_rgba(0,0,0,.06),0_6px_14px_-6px_rgba(0,0,0,.2)]`
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Screen>,

    // 3. Booked: the red check, and the Booking as a ticket with a tear line and two notches
    //    cut out of the card (a mask), its shadow following the cut.
    <Screen key="d" p={p} at={3}>
      <div className="flex h-full flex-col items-center pt-2 text-center">
        <span key={booked} className="landing-pop grid h-11 w-11 place-items-center rounded-full bg-[#cc2827] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.25),0_2px_4px_rgba(204,40,39,.25),0_10px_20px_-8px_rgba(204,40,39,.45)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <p data-screen-title tabIndex={-1} className="hp-rise mt-3 text-[18px] font-semibold tracking-[-0.025em] outline-none" style={rise(1)}>
          {p.bookedTitle}
        </p>
        <div className="hp-rise hp-ticket-shadow mt-3 w-full" style={rise(2)}>
          <div className="hp-ticket text-left">
            <div className="flex h-[60px] flex-col justify-center px-3">
              <p className={`text-[10px] font-medium ${c.muted}`}>{dayLabel(p, day)}</p>
              <p className={`text-[20px] leading-6 font-semibold tracking-[-0.02em] ${c.mono}`}>{p.times[time]}</p>
            </div>
            <div aria-hidden className="mx-3 border-t border-dashed border-[#dcdce0]" />
            <div className="flex items-center justify-between gap-2 px-3 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-medium">{svc.name}</span>
                <span className={`block text-[10.5px] ${c.muted}`}>
                  {p.bookedWith} {barberName}
                </span>
              </span>
              <span className={`text-[13px] font-semibold ${c.mono}`}>${svc.price}</span>
            </div>
          </div>
        </div>
        <p className={`hp-rise mt-2.5 text-[10.5px] leading-[1.45] text-pretty ${c.muted}`} style={rise(3)}>
          {p.bookedNote}
        </p>
        <div className="hp-rise mt-auto w-full" style={rise(4)}>
          <button
            type="button"
            onClick={() => {
              setPicked(null);
              go(0);
            }}
            className="hp-btn min-h-12 w-full rounded-full text-[13px] font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f0f0f]"
          >
            <span aria-hidden className="hp-btn-sheen" />
            <span className="relative">{p.again}</span>
          </button>
        </div>
      </div>
    </Screen>,
  ];

  return (
    <div
      ref={box}
      onPointerMove={lean}
      onPointerLeave={() => aimAt(0, 0)}
      className="relative mx-auto w-full max-w-[288px]"
    >
      <div ref={device} className="hero-phone-tilt">
        {/* The device: a graphite rim lit from the top left, side buttons, a black bezel. */}
        <div className="hero-phone-frame">
          <div className="hero-phone-bezel">
            <div
              role="group"
              aria-label={p.label}
              className={`relative h-[476px] overflow-hidden rounded-[2.15rem] ${c.paper} ${c.ink} sm:h-[500px]`}
            >
              <StatusBar />
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
              <span aria-hidden className="pointer-events-none absolute bottom-[8px] left-1/2 z-10 h-[4px] w-[96px] -translate-x-1/2 rounded-full bg-[#0f0f0f]/85" />
            </div>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-6 flex w-max max-w-full items-center gap-2 rounded-full border border-white/15 bg-background/70 px-3.5 py-1.5 text-[13px] font-medium text-foreground">
        <LiveDot />
        {step === 3 ? (
          <Link href="/b/demo-shop?from=site" transitionTypes={["page"]} className="underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white">
            {p.label}
          </Link>
        ) : (
          p.hint
        )}
      </p>
    </div>
  );
}

/** The phone's status bar: clock, the camera island, signal, wifi and battery. Decoration only. */
function StatusBar() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-[31px] items-center justify-between pl-6 pr-5 text-[#0f0f0f]">
      <span className="text-[11px] font-semibold tabular-nums tracking-[-0.01em]">9:41</span>
      <span className="absolute left-1/2 top-2 h-[15px] w-[64px] -translate-x-1/2 rounded-full bg-black" />
      <span className="flex items-center gap-[5px]">
        <svg viewBox="0 0 17 11" className="h-[9px] w-auto" fill="currentColor">
          <rect x="0" y="7" width="3" height="4" rx="0.8" />
          <rect x="4.6" y="5" width="3" height="6" rx="0.8" />
          <rect x="9.2" y="2.5" width="3" height="8.5" rx="0.8" />
          <rect x="13.8" y="0" width="3" height="11" rx="0.8" />
        </svg>
        <svg viewBox="0 0 15 11" className="h-[9px] w-auto" fill="currentColor">
          <path d="M7.5 2.3c2.1 0 4 .8 5.5 2.1l1.1-1.1A9.4 9.4 0 0 0 7.5.7 9.4 9.4 0 0 0 .9 3.3L2 4.4a7.8 7.8 0 0 1 5.5-2.1Z" />
          <path d="M7.5 5.4c1.2 0 2.3.4 3.2 1.2l1.1-1.1a6.3 6.3 0 0 0-8.6 0l1.1 1.1c.9-.8 2-1.2 3.2-1.2Z" />
          <path d="M7.5 8.4c.4 0 .8.2 1.1.4L7.5 10 6.4 8.8c.3-.3.7-.4 1.1-.4Z" />
        </svg>
        <svg viewBox="0 0 25 12" className="h-[10px] w-auto" fill="none">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3.2" stroke="currentColor" strokeOpacity="0.4" />
          <rect x="2" y="2" width="15" height="8" rx="1.8" fill="currentColor" />
          <path d="M23 4v4c.8-.3 1.3-1.1 1.3-2S23.8 4.3 23 4Z" fill="currentColor" fillOpacity="0.45" />
        </svg>
      </span>
    </div>
  );
}

/** "Thu, Nov 12" or "jue, 12 nov" → 12, for the day strip's numbers. */
function dayNumber(day: string) {
  return Number(day.match(/\d+/)?.[0] ?? 1);
}

/** The strip's day `d` as the page writes it: "Thu, Nov 12" → "Fri, Nov 13", "jue, 12 nov" → "vie, 13 nov". */
function dayLabel(p: Phone, d: number) {
  if (d === 0) return p.day;
  return p.day.replace(p.dayShort, p.week[d]).replace(/\d+/, String(dayNumber(p.day) + d));
}

/** "Fresh Cuts Barbershop" → "FC", the Shop's monogram when it has no logo. */
function monogram(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/**
 * One screen of the phone, in the real page's order: the Shop's monogram and name, then
 * Back and the step segments, a title, the content, and (from the barber step) the glass
 * dock with what is chosen so far.
 */
function Screen({ title, p, at, onBack, dock, children }: { title?: string; p: Phone; at: number; onBack?: () => void; dock?: ReactNode; children: ReactNode }) {
  // The screen never scrolls on its own (every screen fits), so a wheel or swipe over the
  // phone always moves the page.
  return (
    // pb-[22px]: the dock and the last button end 10px above the home bar, clear of the corners.
    <div className="flex h-full flex-col overflow-y-hidden px-3.5 pb-[22px] [scrollbar-width:none]">
      <div className="hp-rise flex items-center gap-2.5 pt-2.5" style={rise(0)}>
        <span aria-hidden className={`${c.card} grid h-8 w-8 shrink-0 place-items-center rounded-full! text-[10.5px] font-semibold tracking-[-0.02em]`}>
          {monogram(p.shop)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] leading-tight font-semibold tracking-[-0.025em]">{p.shop}</p>
          <p className={`truncate text-[10px] ${c.muted}`}>{p.address}</p>
        </div>
      </div>
      <div className="hp-rise mt-2 flex min-h-8 items-center gap-2" style={rise(1)}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className={`-ml-1 flex min-h-8 min-w-11 items-center gap-0.5 rounded px-1 text-[11px] ${c.ink} focus-visible:outline-2 focus-visible:outline-[#0f0f0f]`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            {p.back}
          </button>
        )}
        <span aria-hidden className="flex flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${i <= at ? "bg-[#0f0f0f]" : "bg-[#dedee2]"}`} />
          ))}
        </span>
      </div>
      {title && (
        <p data-screen-title tabIndex={-1} style={rise(2)} className="hp-rise mt-1.5 mb-2.5 text-[17px] leading-tight font-semibold tracking-[-0.025em] outline-none">
          {title}
        </p>
      )}
      <div className="hp-rise flex-1" style={rise(3)}>
        {children}
      </div>
      {dock}
    </div>
  );
}

/** The glass dock: the chosen Service (and Barber) and its price, pinned under the content. */
function Dock({ name, sub, price }: { name: string; sub?: string; price: number }) {
  return (
    <div
      style={rise(9)}
      className="hp-rise mt-2 flex shrink-0 items-center gap-2 rounded-[1.25rem] border border-black/[.06] border-t-black/[.03] bg-white/90 p-1.5 pr-3 shadow-[inset_0_1px_0_#fff,0_1px_2px_rgba(0,0,0,.05),0_6px_16px_-6px_rgba(0,0,0,.12),0_18px_36px_-18px_rgba(0,0,0,.22)] backdrop-blur-md"
    >
      <span aria-hidden className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${c.fill} text-[10.5px] font-semibold`}>
        {(sub ?? name)[0]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11.5px] leading-tight font-medium">{name}</span>
        {sub && <span className={`block truncate text-[10px] leading-tight ${c.muted}`}>{sub}</span>}
      </span>
      <span className={`text-[12.5px] font-semibold ${c.mono}`}>${price}</span>
    </div>
  );
}

function Chevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0 text-[#b4b4ba]">
      <path d="M7.5 4.5 13 10l-5.5 5.5" />
    </svg>
  );
}

/** A tappable row inside a card, like the real page's Service and Barber rows. */
function Tap({ onClick, className, children }: { onClick: () => void; className: string; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{ WebkitTapHighlightColor: "transparent" } as CSSProperties} className={`${c.row} ${className}`}>
      {children}
    </button>
  );
}
