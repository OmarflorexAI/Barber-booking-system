/**
 * A 7-day sparkline for a stat card: Monday to Sunday on fixed x positions, so a week in
 * progress stops at today instead of dropping to zero for days that haven't happened.
 * Decoration only (aria-hidden): the number and the delta beside it carry the meaning.
 *
 * One data color: the line in `--data`, the area in `--data-soft` at low opacity, the last
 * point as a dot. The SVG stretches to the card (preserveAspectRatio="none") with
 * non-scaling strokes; the dot is an HTML span so it stays round. `.spark` grows it up from
 * its baseline (scale + opacity) after the card's entrance; reduced motion shows it at rest.
 */
export function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return <div aria-hidden="true" className="h-10" />;
  const max = Math.max(1, ...values);
  const x = (i: number) => (i / 6) * 100;
  const y = (v: number) => 36 - (v / max) * 30; // viewBox height 40: 4 above, 4 below
  const pts = values.map((v, i) => [x(i), y(v)] as const);
  const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(2)} ${py.toFixed(2)}`).join(" ");
  const area = `${line} L${pts.at(-1)![0].toFixed(2)} 40 L0 40 Z`;
  const [lx, ly] = pts.at(-1)!;

  return (
    <div aria-hidden="true" className="spark relative h-10 w-full">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" focusable="false" className="absolute inset-0 h-full w-full overflow-visible">
        <path d="M0 39.5 H100" className="stroke-line" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="2 3" fill="none" />
        {pts.length > 1 && (
          <>
            <path d={area} className="fill-data-soft" style={{ fillOpacity: "var(--spark-fill)" }} />
            <path d={line} className="stroke-data" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" fill="none" />
          </>
        )}
      </svg>
      <span
        className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-data ring-2 ring-surface"
        style={{ left: `${lx}%`, top: `${(ly / 40) * 100}%` }}
      />
    </div>
  );
}
