/**
 * The Barber Master mark (logo A, "open scissors", approved 2026-11-11): two finger
 * rings and tapered blades crossing at a red pivot. Rings and blades use currentColor;
 * the pivot is barber red with a knockout ring in the background color so it reads
 * as sitting on top of the blades. Source of truth: public/brand/mark.svg.
 */
export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false" className={className}>
      <circle cx="9.3" cy="23.4" r="4.5" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="22.7" cy="23.4" r="4.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M12.1 19.8 L26.2 3.2 L14.1 20.9 Z" fill="currentColor" />
      <path d="M19.9 19.8 L5.8 3.2 L17.9 20.9 Z" fill="currentColor" />
      <circle cx="16" cy="15.9" r="1.35" strokeWidth="0.6" style={{ fill: "var(--l-red, #d0312d)", stroke: "var(--l-bg, #0a0a0a)" }} />
    </svg>
  );
}

/** The mark plus the name in Geist semibold. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="h-7 w-7 shrink-0" />
      <span className="whitespace-nowrap text-[17px] font-semibold leading-none tracking-[-0.02em]">Barber Master</span>
    </span>
  );
}
