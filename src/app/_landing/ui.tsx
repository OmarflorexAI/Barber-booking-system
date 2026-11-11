import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/**
 * Shared building blocks for the landing page. Every section uses these so the
 * page reads as one system: a 1180px column, condensed signage headlines
 * (Big Shoulders), a calm sans for reading (Instrument Sans), pill buttons with a
 * tiny barber pole that turns on hover, and one kind of framed stage for product UI.
 */

export const FORM_ID = "free-month";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1180px] px-4 sm:px-6 ${className}`}>{children}</div>;
}

const pill = { red: "bg-pole-red", blue: "bg-pole-blue", white: "bg-night-ink" } as const;
export type PillColor = keyof typeof pill;

/** The type scale. h1 is only used by the hero. */
export const type = {
  h1: "font-display text-balance text-[clamp(3.1rem,7vw,6.5rem)] font-[800] leading-[0.88] tracking-[-0.005em]",
  h2: "font-display text-balance text-[clamp(2.6rem,6.2vw,4.75rem)] font-[750] leading-[0.92]",
  h3: "text-lg font-semibold tracking-[-0.015em] sm:text-xl",
  body: "text-[16px] leading-[1.6] text-night-muted",
  lead: "text-[17px] leading-[1.6] text-night-ink/85 sm:text-[19px]",
} as const;

/**
 * The one keyboard focus ring. `outline-solid` is spelled out because Tailwind v4's
 * `outline-none` (used on inputs) sets the outline style to none for the element.
 */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-night-ink";

/**
 * Restyles the shared language toggle (a light-theme pill) as plain text for
 * the dark page. Used by the nav and the footer so both look the same.
 */
export const toggleSkin =
  "[&_button]:inline-flex [&_button]:min-h-11 [&_button]:items-center [&_button]:rounded-full [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-3 [&_button]:font-medium [&_button]:text-night-muted [&_button]:transition-colors [&_button:hover]:text-night-ink [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-solid [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-night-ink [&_button:disabled]:opacity-60";

const btnBase = `group inline-flex min-h-12 items-center justify-center gap-3 rounded-full px-6 text-[15px] font-semibold tracking-[-0.01em] transition-[background-color,box-shadow,transform,border-color] duration-300 ease-out active:scale-[0.97] motion-reduce:transition-none ${focusRing}`;

/** The one primary action: cream pill, navy text, a small pole that turns on hover. */
export const primaryBtn = `${btnBase} bg-night-ink text-night shadow-[0_10px_30px_-12px_rgba(229,72,61,.0)] hover:-translate-y-px hover:bg-white hover:shadow-[0_14px_34px_-12px_rgba(229,72,61,.55)]`;
/** Second action: a clear glass pill. */
export const secondaryBtn = `${btnBase} border border-night-ink/25 bg-night-ink/[0.06] text-night-ink backdrop-blur-md hover:border-night-ink/50 hover:bg-night-ink/[0.12]`;

export function Pole({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`bm-pole ${className}`} />;
}

function ActionLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  return href.startsWith("#") ? (
    <a href={href} className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <ActionLink href={href} className={primaryBtn}>
      <Pole />
      {children}
    </ActionLink>
  );
}

export function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <ActionLink href={href} className={secondaryBtn}>
      {children}
    </ActionLink>
  );
}

/**
 * The stage for product UI: a dark panel lit faintly from one side in pole red
 * and blue, with a hairline pole stripe along its top edge. `glow` moves the light
 * so repeated frames don't look identical.
 */
export function GlowFrame({
  children,
  glow = "top",
  className = "",
  stageClassName = "",
}: {
  children: ReactNode;
  glow?: "top" | "left" | "right" | "bottom";
  className?: string;
  stageClassName?: string;
}) {
  const light = {
    top: "radial-gradient(70% 60% at 70% 0%, rgba(229,72,61,.35), transparent 70%), radial-gradient(60% 60% at 20% 0%, rgba(91,134,240,.35), transparent 70%)",
    left: "radial-gradient(60% 70% at 0% 30%, rgba(91,134,240,.38), transparent 70%), radial-gradient(50% 60% at 0% 90%, rgba(229,72,61,.3), transparent 72%)",
    right: "radial-gradient(60% 70% at 100% 30%, rgba(229,72,61,.34), transparent 70%), radial-gradient(50% 60% at 100% 90%, rgba(91,134,240,.36), transparent 72%)",
    bottom: "radial-gradient(70% 60% at 30% 100%, rgba(91,134,240,.36), transparent 70%), radial-gradient(60% 60% at 85% 100%, rgba(229,72,61,.32), transparent 70%)",
  }[glow];
  return (
    <div className={`relative isolate overflow-hidden rounded-[22px] border border-night-line bg-night-panel ${className}`}>
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px] opacity-80"
        style={{ background: "repeating-linear-gradient(-45deg, var(--l-red) 0 8px, var(--l-ink) 8px 16px, var(--l-blue) 16px 24px, var(--l-ink) 24px 32px)" }}
      />
      <div aria-hidden className="absolute inset-0 -z-10" style={{ background: light }} />
      <div aria-hidden className="grain absolute inset-0 -z-10 opacity-[0.35] mix-blend-overlay" />
      <div className={`relative m-[6%] overflow-hidden rounded-[14px] border border-night-line/70 bg-night shadow-[0_40px_80px_-30px_rgba(0,0,0,.9)] ${stageClassName}`}>{children}</div>
    </div>
  );
}

/** A small floating UI card (a booking, an alert), drawn in CSS so it stays sharp at any size. */
export function MiniCard({
  label,
  value,
  accent = "red",
  className = "",
  style,
}: {
  label: string;
  value: string;
  accent?: PillColor;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`w-max rounded-2xl border border-white/10 bg-night-panel/85 px-3.5 py-2.5 shadow-[0_18px_40px_-16px_rgba(0,0,0,.9)] backdrop-blur-md ${className}`}
    >
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-night-muted">
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${pill[accent]}`} />
        {label}
      </p>
      <p className="mt-0.5 text-[14px] font-semibold tabular-nums tracking-[-0.01em] text-night-ink">{value}</p>
    </div>
  );
}
