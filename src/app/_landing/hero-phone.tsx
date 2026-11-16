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
  card: "rounded-[18px] border border-black/[.06] border-t-black/[.035] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_1px_1px_rgba(0,0,0,.03),0_2px_6px_-1px_rgba(0,0,0,.05),0_12px_28px_-12px_rgba(0,0,0,.12)]",
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
  const [booked, setBooked] = useState(0); // counts bookings, so the check mark replays each time
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
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
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
  const free = p.times.map((t, i) => ({ t, i })).filter(({ i }) => !p.taken.includes(i));
  const isAm = (t: string) => /a\.?\s?m\.?$/i.test(t);
  const groups = [free.filter(({ t }) => isAm(t)), free.filter(({ t }) => !isAm(t))];

  const screens: ReactNode[] = [
    // 0. Services: one card of ruled rows, like the real page.
    <Screen key="s" title={p.chooseService} p={p} at={0}>
      <ul className={`${c.card} ${c.rows} overflow-hidden [--sep:12px]`}>
        {p.services.map((s, i) => (
          <li key={s.name}>
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
        {[null, 0, 1, 2, 3].map((b) => (
          <li key={b ?? "any"}>
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
    //    day an ink tile, a dot under days with free times), then the free times by part of day.
    <Screen key="t" title={p.pickTime} p={p} at={2} onBack={() => go(1)} dock={<Dock name={svc.name} sub={barberName} price={svc.price} />}>
      <p className="sr-only">{p.day}</p>
      <div className={`${c.card} px-2.5 pt-2 pb-2.5`}>
        <div aria-hidden className="grid grid-cols-6 gap-1">
          {p.week.map((w, d) => (
            <span key={d} className="flex flex-col items-center gap-0.5">
              <span className={`text-[8.5px] font-medium ${c.muted}`}>{w}</span>
              <span
                className={`relative grid h-[30px] w-[30px] place-items-center rounded-[9px] text-[12px] font-medium ${c.mono} ${
                  d === 0 ? `${c.primary} font-semibold` : "text-[#0f0f0f]"
                }`}
              >
                {dayNumber(p.day) + d}
                <span className={`absolute bottom-[3px] h-[3px] w-[3px] rounded-full ${d === 0 ? "bg-white" : d === 3 ? "bg-transparent" : "bg-[#0f0f0f]"}`} />
              </span>
            </span>
          ))}
        </div>
        <div className="mt-2 border-t border-[#ececef] pt-1.5">
          {groups.map((group, g) => (
            <div key={g} className={g ? "mt-1.5" : ""}>
              <p aria-hidden className={`mb-1 flex items-center gap-2 text-[9.5px] font-medium ${c.muted}`}>
                {group[0]?.t.match(/[ap]\.?\s?m\.?$/i)?.[0]}
                <span className="h-px flex-1 bg-[#ececef]" />
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {group.map(({ t, i }) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTime(i);
                      setBooked((n) => n + 1);
                      go(3);
                    }}
                    className={`min-h-[32px] rounded-[10px] ${c.fill} px-1 text-[11px] font-medium ${c.mono} transition-[background-color,box-shadow,translate,scale] duration-150 hover:-translate-y-px hover:bg-white hover:shadow-[0_0_0_1px_rgba(0,0,0,.06),0_6px_14px_-6px_rgba(0,0,0,.2)] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0f0f0f]`}
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

    // 3. Booked: the red check, and the Booking as a ticket with a tear line.
    <Screen key="d" p={p} at={3}>
      <div className="flex h-full flex-col items-center pt-2 text-center">
        <span key={booked} className="landing-pop grid h-11 w-11 place-items-center rounded-full bg-[#cc2827] text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <p data-screen-title tabIndex={-1} className="mt-3 text-[18px] font-semibold tracking-[-0.025em] outline-none">
          {p.bookedTitle}
        </p>
        <div className={`${c.card} mt-3 w-full text-left`}>
          <div className="px-3 pt-2.5 pb-2">
            <p className={`text-[10px] font-medium ${c.muted}`}>{p.day}</p>
            <p className={`text-[20px] leading-6 font-semibold tracking-[-0.02em] ${c.mono}`}>{p.times[time]}</p>
          </div>
          <div aria-hidden className="relative mx-3 border-t border-dashed border-[#dcdce0]">
            <span className="absolute -top-[7px] -left-[20px] h-3.5 w-3.5 rounded-full bg-[#f2f2f4] shadow-[inset_0_0_0_1px_rgba(0,0,0,.06)]" />
            <span className="absolute -top-[7px] -right-[20px] h-3.5 w-3.5 rounded-full bg-[#f2f2f4] shadow-[inset_0_0_0_1px_rgba(0,0,0,.06)]" />
          </div>
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
        <p className={`mt-2.5 text-[10.5px] leading-[1.45] text-pretty ${c.muted}`}>{p.bookedNote}</p>
        <button
          type="button"
          onClick={() => go(0)}
          className={`mt-auto mb-2 min-h-11 w-full rounded-full ${c.primary} text-[13px] font-medium transition-transform active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f0f0f]`}
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
              <span aria-hidden className="pointer-events-none absolute bottom-[7px] left-1/2 z-10 h-[4px] w-[96px] -translate-x-1/2 rounded-full bg-[#0f0f0f]/85" />
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
    <div className="flex h-full flex-col overflow-y-hidden px-3.5 pb-3 [scrollbar-width:none]">
      <div className="flex items-center gap-2.5 pt-2.5">
        <span aria-hidden className={`${c.card} grid h-8 w-8 shrink-0 place-items-center rounded-full! text-[10.5px] font-semibold tracking-[-0.02em]`}>
          {monogram(p.shop)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] leading-tight font-semibold tracking-[-0.025em]">{p.shop}</p>
          <p className={`truncate text-[10px] ${c.muted}`}>{p.address}</p>
        </div>
      </div>
      <div className="mt-2 flex min-h-8 items-center gap-2">
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
        <p data-screen-title tabIndex={-1} className="mt-1.5 mb-2.5 text-[17px] leading-tight font-semibold tracking-[-0.025em] outline-none">
          {title}
        </p>
      )}
      <div className="flex-1">{children}</div>
      {dock}
    </div>
  );
}

/** The glass dock: the chosen Service (and Barber) and its price, pinned under the content. */
function Dock({ name, sub, price }: { name: string; sub?: string; price: number }) {
  return (
    <div className="mt-2 flex items-center gap-2 rounded-[1.25rem] border border-black/[.06] border-t-black/[.035] bg-white/90 p-1.5 pr-3 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_1px_2px_rgba(0,0,0,.04),0_8px_20px_-6px_rgba(0,0,0,.1),0_24px_48px_-20px_rgba(0,0,0,.18)] backdrop-blur-md">
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
