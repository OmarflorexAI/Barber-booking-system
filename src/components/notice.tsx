/**
 * The neutral notice (DESIGN.md → "States"): a --surface box, a --line hairline, 6px corners
 * and a line icon, in text-sm. Used for errors and for "what happens now" lines alike on the
 * Client pages (/b, /m, the time picker); never red.
 */
export function Notice({
  children,
  role,
  icon,
  id,
  tabIndex,
  ref,
}: {
  children: React.ReactNode;
  role?: "alert" | "status";
  icon?: React.ReactNode;
  id?: string;
  tabIndex?: number;
  ref?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={ref}
      id={id}
      role={role}
      tabIndex={tabIndex}
      className="flex items-start gap-3 rounded-md border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-ink outline-none"
    >
      <span className="shrink-0 text-muted">{icon ?? <InfoIcon />}</span>
      <div className="flex min-w-0 flex-col gap-1">{children}</div>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}
