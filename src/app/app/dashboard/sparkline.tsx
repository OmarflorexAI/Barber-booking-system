/**
 * A 7-day sparkline for a stat card: Monday to Sunday on fixed x positions, so a week in
 * progress stops at today instead of dropping to zero for days that haven't happened.
 * Decoration only (aria-hidden): the number and the delta beside it carry the meaning.
 *
 * One data color: a smooth line in `--data` (monotone, so it never dips below zero or
 * overshoots a peak), the area under it in `--data-soft` fading to nothing toward the baseline
 * (a CSS mask, so no SVG ids), the last point as a dot with a soft halo. The SVGs stretch to
 * the card (preserveAspectRatio="none") with non-scaling strokes; the dot is an HTML span so
 * it stays round. `.spark` grows it up from its baseline (scale + opacity) after the card's
 * entrance; reduced motion shows it at rest.
 */
export function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return <div aria-hidden="true" className="h-10" />;
  const max = Math.max(1, ...values);
  const x = (i: number) => (i / 6) * 100;
  const y = (v: number) => 36 - (v / max) * 30; // viewBox height 40: 4 above, 4 below
  const pts = values.map((v, i) => [x(i), y(v)] as const);
  const line = smoothPath(pts);
  const area = `${line} L${pts.at(-1)![0].toFixed(2)} 40 L0 40 Z`;
  const [lx, ly] = pts.at(-1)!;

  return (
    <div aria-hidden="true" className="spark relative h-10 w-full">
      {pts.length > 1 && (
        <svg
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          focusable="false"
          className="absolute inset-0 h-full w-full [mask-image:linear-gradient(to_bottom,#000_10%,transparent)]"
        >
          <path d={area} className="fill-data-soft" style={{ fillOpacity: "calc(var(--spark-fill) * 2)" }} />
        </svg>
      )}
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" focusable="false" className="absolute inset-0 h-full w-full overflow-visible">
        <path d="M0 39.5 H100" className="stroke-line" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="2 3" fill="none" />
        {pts.length > 1 && (
          <path d={line} className="stroke-data" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" fill="none" />
        )}
      </svg>
      <span
        className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-data shadow-[0_0_0_2px_var(--surface),0_0_0_6px_color-mix(in_oklch,var(--data)_22%,transparent)]"
        style={{ left: `${lx}%`, top: `${(ly / 40) * 100}%` }}
      />
    </div>
  );
}

/**
 * A monotone cubic through the points (Fritsch–Carlson): smooth, but every segment stays
 * between its two values, so a flat run stays flat and nothing swings past a peak or under zero.
 */
function smoothPath(pts: readonly (readonly [number, number])[]) {
  const n = pts.length;
  const f = (v: number) => v.toFixed(2);
  if (n < 3) return pts.map(([px, py], i) => `${i ? "L" : "M"}${f(px)} ${f(py)}`).join(" ");
  const dx = pts.slice(1).map(([px], i) => px - pts[i]![0]);
  const slope = pts.slice(1).map(([, py], i) => (py - pts[i]![1]) / dx[i]!);
  const m = pts.map((_, i) => {
    if (i === 0) return slope[0]!;
    if (i === n - 1) return slope[n - 2]!;
    const a = slope[i - 1]!;
    const b = slope[i]!;
    return a * b <= 0 ? 0 : (3 * (dx[i - 1]! + dx[i]!)) / ((2 * dx[i]! + dx[i - 1]!) / a + (dx[i]! + 2 * dx[i - 1]!) / b);
  });
  let d = `M${f(pts[0]![0])} ${f(pts[0]![1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i]!;
    const [x1, y1] = pts[i + 1]!;
    const h = dx[i]! / 3;
    d += ` C${f(x0 + h)} ${f(y0 + m[i]! * h)} ${f(x1 - h)} ${f(y1 - m[i + 1]! * h)} ${f(x1)} ${f(y1)}`;
  }
  return d;
}
