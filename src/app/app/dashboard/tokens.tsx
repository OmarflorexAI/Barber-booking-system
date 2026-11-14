import type { Dictionary } from "@/lib/i18n/dictionaries";

const CAP = 48;

/**
 * The hero's "one chip per Booking": filled chips for Bookings, hollow dashed ones for the
 * No-shows among them, so the week reads at a glance before any number does. They pop in one
 * by one (`.token`, motion-safe). Decoration: the number above carries the meaning, so the
 * row is hidden from screen readers. Past `CAP` chips, the rest become "+N".
 */
export function BookingTokens({ bookings, noShows, d }: { bookings: number; noShows: number; d: Dictionary["dashboard"] }) {
  if (bookings === 0) return null;
  const shown = Math.min(bookings, CAP);
  const hollow = Math.min(noShows, shown);
  const filled = shown - hollow;

  return (
    <div aria-hidden="true" className="flex flex-col gap-2 sm:items-end">
      <div data-testid="booking-tokens" className="flex max-w-[19rem] flex-wrap gap-1.5 sm:justify-end">
        {Array.from({ length: shown }, (_, i) => (
          <span
            key={i}
            className={`token h-5 w-3 rounded-full sm:h-7 sm:w-4 ${i < filled ? "bg-data" : "border border-dashed border-muted"}`}
            style={{ "--t": i } as React.CSSProperties}
          />
        ))}
        {bookings > CAP && <span className="token font-mono text-xs leading-5 text-muted" style={{ "--t": CAP } as React.CSSProperties}>+{bookings - CAP}</span>}
      </div>
      {hollow > 0 && (
        <p className="flex items-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-2 rounded-full bg-data" />
            {d.bookings}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-2 rounded-full border border-dashed border-muted" />
            {d.noShows}
          </span>
        </p>
      )}
    </div>
  );
}
