import type { ReactNode } from "react";

/**
 * Shared building blocks for the landing page (the Cocoon template's system):
 * a max-w-5xl column, wide 1152px panels, white and outlined pill buttons,
 * one keyboard focus ring and one heading scale.
 */

/** The contact section, and the lead form's wrapper inside it (the e2e test finds the form by this id). */
export const CONTACT_ID = "contact";
export const FORM_ID = "free-month";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-5xl px-6 ${className}`}>{children}</div>;
}

/**
 * The one keyboard focus ring. `outline-solid` is spelled out because Tailwind v4's
 * `outline-none` (used on inputs) sets the outline style to none for the element.
 */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-foreground";

export const type = {
  h1: "text-balance text-4xl font-medium leading-[1.08] tracking-[-0.035em] sm:text-5xl lg:text-6xl",
  h2: "text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-4xl",
  h3: "text-balance text-2xl font-semibold leading-[1.15] tracking-[-0.025em] sm:text-3xl",
  body: "text-base leading-relaxed text-muted-foreground",
} as const;

/** The only two pill labels on the page (hero and first-month timeline). */
export function Pill({ children }: { children: ReactNode }) {
  return <p className="mb-6 inline-block rounded-full border border-white/30 px-3 py-1.5 text-[11px] font-medium min-[400px]:px-4 min-[400px]:text-xs min-[400px]:tracking-wide">{children}</p>;
}

const pillBase = `inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full px-5 text-sm font-medium transition-colors duration-200 ${focusRing}`;
/** White pill: the one primary action. */
export const whitePill = `${pillBase} bg-white text-black hover:bg-white/85`;
/** Outlined pill: a quieter action. */
export const outlinePill = `${pillBase} border border-white/30 text-white hover:bg-white/10`;

/**
 * A wide panel. Its content sits in a 1152px column; its background (photo, gradient)
 * is a full-width layer clipped to that column with rounded corners. On scroll the clip
 * opens to the full window (see `.landing-widen` in globals.css). Only the clip moves,
 * so the layout never shifts. Without scroll-driven animations it stays a rounded panel.
 */
export function WidePanel({
  id,
  background,
  children,
  className = "",
}: {
  id: string;
  background: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div id={id} className="relative isolate [--pad:1rem] sm:[--pad:1.5rem]">
      <div aria-hidden className="landing-widen absolute inset-0 isolate overflow-hidden">
        {background}
      </div>
      <div className="relative mx-auto w-full max-w-[1152px] px-(--pad)">
        <div className={className}>{children}</div>
      </div>
    </div>
  );
}

/** The authored check mark used in the pricing lists. */
export function Check({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`}>
      <path d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}
