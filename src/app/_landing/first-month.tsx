import { LiveDot } from "./live-dot";
import type { SectionProps } from "./types";
import { Container, Pill, type } from "./ui";

/**
 * Your first month: the template's sticky-heading timeline, Day 1 to Day 30 top to
 * bottom. Day 1 carries the red dot, its ring pulsing while on screen (still under reduced motion).
 */
export function FirstMonth({ t }: SectionProps) {
  return (
    <section aria-labelledby="month-title" className="py-[calc(48px+8vh)]">
      <Container>
        <div className="grid grid-cols-1 gap-16 md:grid-cols-2 md:gap-24">
          <div className="md:sticky md:top-32 md:self-start" data-reveal>
            <Pill>{t.monthPill}</Pill>
            <h2 id="month-title" className={type.h2}>
              {t.monthTitle}
            </h2>
            <p className={`mt-4 ${type.body}`}>{t.monthBody}</p>
          </div>

          <div className="relative pl-8">
            <span aria-hidden className="absolute bottom-0 left-[5px] top-0 w-px" style={{ background: "linear-gradient(to bottom, var(--l-fg), var(--l-border))" }} />
            <ol>
              {t.month.map((entry, i) => {
                const first = i === 0;
                const last = i === t.month.length - 1;
                return (
                  <li key={entry.when} className={`relative ${last ? "" : "pb-16"}`} data-reveal>
                    <span aria-hidden className="absolute -left-8 top-[0.35rem]">
                      {first ? <LiveDot className="h-[11px] w-[11px]" /> : <span className="block h-[11px] w-[11px] rounded-full bg-muted-foreground" />}
                    </span>
                    <p className="flex flex-wrap items-center gap-x-3 text-sm font-medium text-muted-foreground">
                      <span>{entry.when}</span>
                      {first && <span className="text-foreground">{t.monthStart}</span>}
                    </p>
                    <h3 className="mt-3 text-base font-semibold text-foreground">{entry.title}</h3>
                    <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">{entry.body}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </Container>
    </section>
  );
}
