import { landingDictionaries } from "@/lib/i18n/landing";
import { FeatureList } from "./features-list";
import type { SectionProps } from "./types";
import { Container, SectionLabel, type, type PillColor } from "./ui";

/**
 * What the Shop gets. Not a sequence, so no numbers: a list of rows on the left,
 * and on wide screens one framed visual on the right that follows the selected
 * row. On phones and tablets the rows are plain text with one shared visual.
 */
export function Features({ locale, t }: SectionProps) {
  const visuals = [
    <PaidVisual key="paid" t={t} />,
    <NoShowVisual key="noshow" t={t} locale={locale} />,
    <WalkInVisual key="walkin" t={t} locale={locale} />,
    <WeekVisual key="week" t={t} locale={locale} />,
    <LanguagesVisual key="lang" />,
  ];
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-20 py-20 sm:py-28">
      <Container>
        <SectionLabel color="blue">{t.featuresLabel}</SectionLabel>
        <h2 id="features-title" className={`${type.h2} mt-5 max-w-[16ch] text-night-ink`}>
          {t.featuresTitle}
        </h2>
        <FeatureList items={t.features} visuals={visuals} />
      </Container>
    </section>
  );
}

/* ---------- Visuals: CSS mockups with example data, decorative only ---------- */

type V = { t: SectionProps["t"] };
type VL = V & { locale: SectionProps["locale"] };

const intl = (locale: SectionProps["locale"]) => (locale === "es" ? "es-US" : "en-US");

/*
 * Sizes follow the stage's width (container query units), so the same visual
 * fills a 280px phone frame and a 520px desktop frame without looking empty.
 */
const txt = {
  small: "text-[clamp(10px,2.7cqw,13px)]",
  value: "text-[clamp(13px,3.9cqw,19px)]",
} as const;

const dot = { red: "bg-pole-red", blue: "bg-pole-blue", white: "bg-night-ink" } as const;
const bar = { red: "border-t-pole-red", blue: "border-t-pole-blue", white: "border-t-night-ink" } as const;

const lean = {
  left: "[transform:perspective(900px)_rotateY(8deg)_rotateZ(-1.5deg)]",
  right: "[transform:perspective(900px)_rotateY(-8deg)_rotateZ(1.5deg)]",
} as const;

/** The stage every visual sits on: a dark panel with a faint grid like a day planner page. */
function Stage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="@container absolute inset-0">
      <div
        className={`absolute inset-0 flex flex-col overflow-hidden bg-[linear-gradient(to_right,rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:28px_28px] p-[7cqw] font-mono ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

/** A larger cousin of MiniCard that scales with the stage. */
function Ticket({ label, value, accent, className = "" }: { label: string; value: string; accent: PillColor; className?: string }) {
  return (
    <div
      className={`w-max max-w-full rounded-[5px] border border-night-line border-t-2 ${bar[accent]} bg-night-panel px-[3.5cqw] py-[2.6cqw] shadow-[0_18px_40px_-16px_rgba(0,0,0,.9)] ${className}`}
    >
      <p className={`flex items-center gap-[1.4cqw] ${txt.small} text-night-muted`}>
        <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot[accent]}`} />
        {label}
      </p>
      <p className={`mt-[0.8cqw] ${txt.value} text-night-ink`}>{value}</p>
    </div>
  );
}

/** Today's ledger: who paid online, who pays at the counter, and a refund that went back by itself. */
function PaidVisual({ t }: V) {
  const tone: PillColor[] = ["blue", "white", "red"];
  return (
    <Stage className="justify-center">
      <ul className={`rounded-[6px] border border-night-line bg-night-panel/95 px-[4cqw] shadow-[0_30px_60px_-30px_rgba(0,0,0,.95)] ${lean.left}`}>
        {t.demo.ledger.map((row, i) => (
          <li key={row.who} className="flex items-start justify-between gap-[3cqw] border-b border-night-line py-[3.6cqw] last:border-b-0">
            <div className="min-w-0">
              <p className={`${txt.value} truncate text-night-ink`}>{row.who}</p>
              <p className={`mt-[0.8cqw] flex items-center gap-[1.4cqw] ${txt.small} text-night-muted`}>
                <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot[tone[i % tone.length]]}`} />
                {row.status}
              </p>
            </div>
            <p
              className={`${txt.value} shrink-0 tabular-nums ${i === 2 ? "text-night-muted line-through decoration-pole-red/80" : "text-night-ink"}`}
            >
              {row.amount}
            </p>
          </li>
        ))}
      </ul>
    </Stage>
  );
}

/** Two missed bookings on one number, then the rule that kicks in by itself. */
function NoShowVisual({ t, locale }: VL) {
  const fmt = new Intl.DateTimeFormat(intl(locale), { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" });
  const misses = [Date.UTC(2026, 8, 12, 11), Date.UTC(2026, 9, 30, 16)].map((d) => fmt.format(new Date(d)));
  return (
    <Stage className="justify-center gap-[3cqw]">
      {misses.map((when) => (
        <div key={when} className="flex items-center justify-between gap-[3cqw] rounded-[5px] border border-dashed border-night-line px-[3.5cqw] py-[3cqw]">
          <span className={`${txt.value} text-night-muted`}>{when}</span>
          <span className={`shrink-0 rounded-full bg-pole-red/20 px-[2.4cqw] py-[0.8cqw] ${txt.small} text-night-ink`}>{t.demo.missed}</span>
        </div>
      ))}
      <Ticket label="(718) 555-0147" value={t.demo.noShowRule} accent="blue" className={`mt-[3cqw] origin-right self-end ${lean.right}`} />
    </Stage>
  );
}

/** A barber's day by the hour; the walk-in drops into the free slot. */
function WalkInVisual({ t, locale }: VL) {
  const fmt = new Intl.DateTimeFormat(intl(locale), { hour: "numeric", timeZone: "UTC" });
  const rows = [70, 48, 0, 82, 56];
  return (
    <Stage>
      <ul className="flex flex-1 flex-col">
        {rows.map((w, i) => (
          <li key={i} className="flex flex-1 items-center gap-[3cqw] border-t border-night-line/70 first:border-t-0">
            <span className={`w-[13cqw] shrink-0 whitespace-nowrap ${txt.small} text-night-muted`}>{fmt.format(new Date(Date.UTC(2026, 10, 12, 10 + i)))}</span>
            {w ? (
              <span className="h-[58%] rounded-[4px] border border-night-line bg-night-raised" style={{ width: `${w}%` }} />
            ) : (
              <Ticket label={t.demo.walkInNow} value={t.demo.walkInValue} accent="white" className={`origin-left ${lean.right}`} />
            )}
          </li>
        ))}
      </ul>
    </Stage>
  );
}

function WeekVisual({ t, locale }: VL) {
  // Illustrative bars, Monday to Sunday, labelled with the visitor's narrow weekday names.
  const heights = [42, 55, 48, 70, 88, 100, 30];
  const fmt = new Intl.DateTimeFormat(intl(locale), { weekday: "narrow", timeZone: "UTC" });
  const days = heights.map((_, i) => fmt.format(new Date(Date.UTC(2026, 10, 9 + i))));
  return (
    <Stage className="gap-[5cqw]">
      <Ticket label={t.cards.week} value={t.cards.weekValue} accent="blue" className={`origin-left ${lean.left}`} />
      <div className="flex min-h-0 flex-1 items-end gap-[3%]">
        {heights.map((h, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-[1.6cqw]">
            <span className={`w-full rounded-t-[3px] ${i === 5 ? "bg-pole-red/80" : "bg-night-ink/20"}`} style={{ height: `${h}%` }} />
            <span className={`${txt.small} leading-none text-night-muted`}>{days[i]}</span>
          </div>
        ))}
      </div>
    </Stage>
  );
}

/** The same reminder text, as each client gets it: one in English, one in Spanish. */
function LanguagesVisual() {
  const { en, es } = landingDictionaries;
  const bubbles = [
    { lang: "en", name: es.otherLang, text: en.demo.textMessage, wrap: "self-start", cls: "rounded-bl-[4px] bg-night-raised" },
    { lang: "es", name: en.otherLang, text: es.demo.textMessage, wrap: "items-end self-end", cls: "rounded-br-[4px] bg-pole-blue/25" },
  ];
  return (
    <Stage className="justify-center gap-[5cqw]">
      {bubbles.map((b) => (
        <div key={b.lang} lang={b.lang} className={`flex max-w-[82%] flex-col gap-[1.4cqw] ${b.wrap}`}>
          <span className={`${txt.small} text-night-muted`}>{b.name}</span>
          <p className={`rounded-[14px] px-[4cqw] py-[3cqw] ${txt.value} leading-[1.45] text-night-ink ${b.cls}`}>{b.text}</p>
        </div>
      ))}
    </Stage>
  );
}
