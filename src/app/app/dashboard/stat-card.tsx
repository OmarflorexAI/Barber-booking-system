import { CountUp, type CountFormat } from "@/components/motion/count-up";
import type { Dictionary, Locale } from "@/lib/i18n/dictionaries";
import { Sparkline } from "./sparkline";

/*
 * The Dashboard's number cards. Server components: only <CountUp> runs on the client, and
 * it renders the real value on the server, without JavaScript and under reduced motion.
 */

type D = Dictionary["dashboard"];

/** Card shell shared by the hero and the stat cards: tone step, hairline, soft depth (light only). */
export const statCard = "card-depth rounded-2xl border border-line bg-surface p-5 lg:p-6";

/** Gray ↑ / ↓ / — and "+N vs last week". The words carry the meaning; the arrow is decoration. */
export function Delta({ cur, prev, d, isThisWeek, format = String }: { cur: number; prev: number; d: D; isThisWeek: boolean; format?: (n: number) => string }) {
  const diff = cur - prev;
  const text =
    diff === 0
      ? isThisWeek
        ? d.sameAsLastWeek
        : d.sameAsWeekBefore
      : (isThisWeek ? d.vsLastWeek : d.vsWeekBefore)(`${diff > 0 ? "+" : "−"}${format(Math.abs(diff))}`);
  return (
    <p className="flex items-start gap-1.5 text-sm leading-snug text-muted">
      <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 shrink-0">
        {diff > 0 ? <path d="M8 13V3M4 7l4-4 4 4" /> : diff < 0 ? <path d="M8 3v10M4 9l4 4 4-4" /> : <path d="M3.5 8h9" />}
      </svg>
      <span>{text}</span>
    </p>
  );
}

/** One stat: label, counted number, a 7-day sparkline, and the gray change against the week before. */
export function StatCard({
  label,
  value,
  testId,
  locale,
  series,
  index,
  format = "number",
  className = "",
  ...delta
}: {
  label: string;
  value: number;
  testId: string;
  locale: Locale;
  /** One number per day so far this week (Monday first). */
  series: number[];
  /** Entrance stagger step. */
  index: number;
  format?: CountFormat;
  className?: string;
  prev: number;
  d: D;
  isThisWeek: boolean;
}) {
  const fmt = format === "duration" ? delta.d.duration : String;
  return (
    <section className={`${statCard} enter flex min-w-0 flex-col gap-3 ${className}`} style={{ "--i": index } as React.CSSProperties}>
      <h2 className="text-sm font-medium text-muted">{label}</h2>
      <CountUp
        value={value}
        locale={locale}
        format={format}
        data-testid={testId}
        className="self-start text-2xl leading-tight font-semibold tracking-[-0.02em] lg:text-3xl"
      />
      <Sparkline values={series} />
      <Delta cur={value} format={fmt} {...delta} />
    </section>
  );
}
