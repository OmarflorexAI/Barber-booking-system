import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared building blocks for the landing page. Every section uses these so the
 * page reads as one system: a 1120px column, mono labels with a small colored
 * pill, Geist headlines with tight tracking, and one kind of glowing frame.
 */

export const FORM_ID = "free-month";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1120px] px-4 sm:px-6 ${className}`}>{children}</div>;
}

const pill = { red: "bg-pole-red", blue: "bg-pole-blue", white: "bg-night-ink" } as const;
export type PillColor = keyof typeof pill;

/** The small label above a section heading: a colored pill and a few words in mono. */
export function SectionLabel({ children, color = "red" }: { children: ReactNode; color?: PillColor }) {
  return (
    <p className="flex items-center gap-2.5 font-mono text-[13px] text-night-ink/90">
      <span aria-hidden className={`h-[7px] w-3.5 rounded-full ${pill[color]}`} />
      {children}
    </p>
  );
}

/** Section heading sizes. h1 is only used by the hero. */
export const type = {
  h1: "text-balance text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-[4.25rem]",
  h2: "text-balance text-[2rem] font-semibold leading-[1.05] tracking-[-0.04em] sm:text-5xl",
  h3: "text-lg font-semibold tracking-[-0.02em] sm:text-xl",
  /** Body copy is mono, like the reference: calm, technical, readable. */
  body: "font-mono text-[15px] leading-[1.65] text-night-muted",
  lead: "font-mono text-base leading-[1.65] text-night-ink/85 sm:text-[17px]",
} as const;

/**
 * The one keyboard focus ring. `outline-solid` is spelled out because Tailwind v4's
 * `outline-none` (used on inputs) sets the outline style to none for the element.
 */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-night-ink";

/**
 * Restyles the shared language toggle (a light-theme pill) as plain mono text for
 * the dark page. Used by the nav and the footer so both look the same.
 */
export const toggleSkin =
  "[&_button]:inline-flex [&_button]:min-h-11 [&_button]:items-center [&_button]:rounded-md [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-2 [&_button]:font-mono [&_button]:text-night-muted [&_button]:transition-colors [&_button:hover]:text-night-ink [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-solid [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-night-ink [&_button:disabled]:opacity-60";

const btnBase =
  "inline-flex min-h-11 items-center justify-center rounded-md px-4 font-mono text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-night-ink";

/** The one primary action style: warm white on charcoal. */
export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  const cls = `${btnBase} bg-night-ink text-night hover:bg-white`;
  return href.startsWith("#") ? <a href={href} className={cls}>{children}</a> : <Link href={href} className={cls}>{children}</Link>;
}

export function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  const cls = `${btnBase} bg-night-raised text-night-ink hover:bg-night-line`;
  return href.startsWith("#") ? <a href={href} className={cls}>{children}</a> : <Link href={href} className={cls}>{children}</Link>;
}

/**
 * The signature visual: a grainy frame lit by the barber pole's red, white and
 * blue, with a dark stage inside for product UI. `glow` moves the light around so
 * repeated frames don't look identical.
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
    top: "radial-gradient(60% 55% at 62% 0%, rgba(229,83,75,.75), transparent 70%), radial-gradient(45% 50% at 38% 4%, rgba(255,255,255,.85), transparent 70%), radial-gradient(55% 55% at 85% 12%, rgba(93,134,232,.8), transparent 72%)",
    left: "radial-gradient(55% 60% at 0% 40%, rgba(255,255,255,.8), transparent 70%), radial-gradient(50% 55% at 4% 75%, rgba(229,83,75,.75), transparent 72%), radial-gradient(45% 50% at 10% 10%, rgba(93,134,232,.75), transparent 72%)",
    right: "radial-gradient(55% 60% at 100% 45%, rgba(255,255,255,.8), transparent 70%), radial-gradient(50% 55% at 96% 85%, rgba(93,134,232,.8), transparent 72%), radial-gradient(45% 50% at 92% 8%, rgba(229,83,75,.75), transparent 72%)",
    bottom: "radial-gradient(60% 55% at 40% 100%, rgba(93,134,232,.8), transparent 70%), radial-gradient(45% 50% at 62% 98%, rgba(255,255,255,.85), transparent 70%), radial-gradient(55% 55% at 15% 92%, rgba(229,83,75,.75), transparent 72%)",
  }[glow];
  return (
    <div className={`relative isolate overflow-hidden rounded-sm bg-[#0b0c0d] ${className}`}>
      <div aria-hidden className="absolute inset-0 -z-10" style={{ background: light }} />
      <div aria-hidden className="grain absolute inset-0 -z-10 opacity-[0.55] mix-blend-overlay" />
      <div className={`relative m-[7%] rounded-sm bg-[#0d0e10] shadow-[0_40px_80px_-30px_rgba(0,0,0,.9)] ${stageClassName}`}>{children}</div>
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
  style?: React.CSSProperties;
}) {
  const bar = { red: "border-t-pole-red", blue: "border-t-pole-blue", white: "border-t-night-ink" }[accent];
  return (
    <div style={style} className={`w-max rounded-[5px] border border-night-line border-t-2 ${bar} bg-night-panel/95 px-3 py-2 font-mono shadow-[0_18px_40px_-16px_rgba(0,0,0,.9)] ${className}`}>
      <p className="flex items-center gap-1.5 text-[10px] text-night-muted">
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${pill[accent]}`} />
        {label}
      </p>
      <p className="mt-0.5 text-[13px] text-night-ink">{value}</p>
    </div>
  );
}
