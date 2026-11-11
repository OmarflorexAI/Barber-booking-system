import type { SectionProps } from "./types";
import { Container, SectionLabel, type } from "./ui";

/**
 * The problem, told as a page from the paper appointment book at the counter:
 * a dark ruled page with a red margin line, each thing said on the phone written
 * on it as an entry, with a plain explanation underneath.
 */
export function Problem({ t }: SectionProps) {
  return (
    <section aria-labelledby="problem-title" className="py-20 sm:py-28">
      <Container className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col gap-5 lg:col-span-5">
          <SectionLabel>{t.problemLabel}</SectionLabel>
          <h2 id="problem-title" className={`${type.h2} max-w-[14ch]`}>
            {t.problemTitle}
          </h2>
        </div>

        <div className="relative overflow-hidden rounded-[6px] border border-night-line bg-night-panel lg:col-span-7">
          {/* The book's head: two close rules, like the top of a printed ledger page. */}
          <div aria-hidden className="h-9 border-b-[3px] border-double border-night-line sm:h-11" />
          {/* The margin line every appointment book has. */}
          <div aria-hidden className="absolute inset-y-0 left-8 w-px bg-pole-red/60 sm:left-14" />

          <ul>
            {t.problem.map((p) => (
              <li key={p.quote} className="border-b border-night-line py-6 pr-5 pl-12 last:border-b-0 sm:py-8 sm:pr-10 sm:pl-[5.25rem]">
                <p className="text-pretty text-[1.4rem] font-semibold leading-[1.2] tracking-[-0.03em] text-night-ink sm:text-[1.75rem]">
                  {p.quote}
                </p>
                <p className={`${type.body} mt-3 max-w-[52ch]`}>{p.body}</p>
              </li>
            ))}
          </ul>
          <div aria-hidden className="h-10 border-t border-night-line sm:h-12" />
        </div>
      </Container>
    </section>
  );
}
