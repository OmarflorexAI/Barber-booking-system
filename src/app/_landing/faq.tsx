import type { SectionProps } from "./types";
import { Container, SectionLabel, type } from "./ui";

/** The questions Owners ask before they say yes, as native disclosures (keyboard and screen reader friendly). */
export function Faq({ t }: SectionProps) {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 py-20 sm:py-28">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionLabel color="blue">{t.faqLabel}</SectionLabel>
          <h2 id="faq-title" className={`${type.h2} mt-5`}>
            {t.faqTitle}
          </h2>
        </div>

        <div className="border-t border-night-line">
          {t.faq.map((item) => (
            <details key={item.q} className="group border-b border-night-line">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 rounded-sm py-5 text-lg font-semibold tracking-[-0.02em] text-night-ink outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-night-ink sm:text-xl [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden
                  className="relative h-3.5 w-3.5 shrink-0 text-night-muted transition-transform group-open:rotate-45 group-open:text-night-ink motion-reduce:transition-none"
                >
                  <span className="absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 bg-current" />
                  <span className="absolute left-1/2 top-0 h-full w-[1.5px] -translate-x-1/2 bg-current" />
                </span>
              </summary>
              <p className={`${type.body} max-w-[60ch] pb-6 pr-10`}>{item.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
