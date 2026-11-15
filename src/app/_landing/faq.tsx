import type { SectionProps } from "./types";
import { Container, type } from "./ui";

/**
 * The questions Owners ask, as native disclosures in a bordered list. One stays open at
 * a time (name="faq"), the first starts open. The + turns into a × when open.
 */
export function Faq({ t }: SectionProps) {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 py-[calc(48px+8vh)]">
      <Container className="grid gap-10 md:grid-cols-3 md:gap-12">
        <h2 id="faq-title" className={`${type.h2} text-white`} data-reveal>
          {t.faqTitle}
        </h2>

        <div className="border-t border-border md:col-span-2" data-reveal>
          {t.faq.map((item, i) => (
            <details key={item.q} name="faq" open={i === 0} className="faq-item group border-b border-border">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 rounded-md py-5 text-base font-medium text-white outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-white sm:text-lg [&::-webkit-details-marker]:hidden">
                {item.q}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="h-5 w-5 shrink-0 text-white transition-transform duration-300 group-open:rotate-45 motion-reduce:transition-none"
                >
                  <path d="M12 4.5v15M4.5 12h15" />
                </svg>
              </summary>
              <p className="max-w-[60ch] pb-6 pr-10 text-base leading-relaxed text-white">{item.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
