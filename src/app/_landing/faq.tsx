import type { SectionProps } from "./types";
import { Container, type } from "./ui";

/**
 * The questions Owners ask before they say yes, as native disclosures (keyboard and
 * screen reader friendly). One stays open at a time (name="faq"); the answer unfolds
 * to its height and its text sharpens out of a blur, while the + turns into a ×
 * inside a circle that fills with cream. Motion lives in globals.css (.bm-faq).
 */
export function Faq({ t }: SectionProps) {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-24 py-24 sm:py-32">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 id="faq-title" className={type.h2}>
            {t.faqTitle}
          </h2>
        </div>

        <div className="border-t border-night-line">
          {t.faq.map((item, i) => (
            <details key={item.q} name="faq" open={i === 0} className="bm-faq group border-b border-night-line">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 rounded-sm py-6 text-lg font-semibold tracking-[-0.015em] text-night-ink/85 outline-none transition-colors duration-200 hover:text-night-ink group-open:text-night-ink focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-night-ink sm:text-xl [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden
                  className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-night-line text-night-muted transition-[background-color,border-color,color,rotate] duration-300 ease-[cubic-bezier(.16,1,.3,1)] group-hover:border-night-ink/40 group-hover:text-night-ink group-open:rotate-45 group-open:border-night-ink! group-open:bg-night-ink group-open:text-night! motion-reduce:transition-colors"
                >
                  <span className="absolute h-[1.5px] w-3.5 rounded-full bg-current" />
                  <span className="absolute h-3.5 w-[1.5px] rounded-full bg-current" />
                </span>
              </summary>
              <p className={`bm-faq-a ${type.body} max-w-[60ch] pb-7 pr-12`}>{item.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
