/**
 * How a Booking is paid, as one bordered gray pill on both Client pages: "Pay at the shop",
 * or "Paid online" / "Refunded" with a small card icon. Never red (DESIGN.md → Live Signal Rule).
 */
export function PayTag({ label, card = false }: { label: string; card?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium whitespace-nowrap text-muted">
      {card && (
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
          <path d="M2.5 10h19M6.5 14.5h3" />
        </svg>
      )}
      {label}
    </span>
  );
}
