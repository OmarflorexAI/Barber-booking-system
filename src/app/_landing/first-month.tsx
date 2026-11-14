import type { CSSProperties } from "react";
import { LiveDot } from "./live-dot";
import type { SectionProps } from "./types";
import { Container, Pill, type } from "./ui";

/** Each card's resting tilt and sideways nudge, so the pile looks dealt by hand, not stamped. */
const DEAL = [
  { rotate: "-1deg", x: "-2%" },
  { rotate: "0.8deg", x: "2.5%" },
  { rotate: "-0.6deg", x: "-1%" },
  { rotate: "1deg", x: "2%" },
];

/**
 * Your first month: Day 1 to Day 30 as a pile of cards. Each card is sticky, 56px lower
 * than the one before, so as the visitor scrolls the next card slides up over the last
 * and the earlier "when" lines stay readable above it like tabs. Day 1 carries the red
 * dot, its ring pulsing while on screen (still under reduced motion).
 *
 * The slide-in is a CSS scroll timeline (globals.css → "First-month pile"). At rest, under
 * reduced motion or without support, the cards still stack; they just don't animate in.
 */
export function FirstMonth({ t }: SectionProps) {
  return (
    <section aria-labelledby="month-title" className="pt-[calc(48px+8vh)] pb-[calc(24px+4vh)]">
      <Container>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-20">
          <div className="md:sticky md:top-32 md:self-start" data-reveal>
            <Pill>{t.monthPill}</Pill>
            <h2 id="month-title" className={type.h2}>
              {t.monthTitle}
            </h2>
            <p className={`mt-4 ${type.body}`}>{t.monthBody}</p>
          </div>

          <ol className="month-pile">
            {t.month.map((entry, i) => {
              const first = i === 0;
              const deal = DEAL[i % DEAL.length]!;
              return (
                <li
                  key={entry.when}
                  className="month-card sticky mb-[18vh] last:mb-[14vh]"
                  style={{ "--i": i, "--tilt": deal.rotate, "--nudge": deal.x, zIndex: i + 1 } as CSSProperties}
                >
                  <div className="month-card-face rounded-2xl border border-border bg-panel p-6 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.8),0_4px_10px_-4px_rgb(0_0_0/0.6)] sm:p-7">
                    <p className="flex flex-wrap items-center gap-x-3 text-sm font-medium text-muted-foreground">
                      {first ? <LiveDot className="h-[9px] w-[9px]" /> : <span aria-hidden className="block h-[9px] w-[9px] rounded-full bg-muted-foreground" />}
                      <span>{entry.when}</span>
                      {first && <span className="text-foreground">{t.monthStart}</span>}
                    </p>
                    <h3 className="mt-6 text-xl leading-snug font-semibold tracking-[-0.015em] text-balance text-foreground">{entry.title}</h3>
                    <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">{entry.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </Container>
    </section>
  );
}
