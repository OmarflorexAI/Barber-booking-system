import type { CSSProperties } from "react";
import { LeadForm } from "../lead-form";
import type { SectionProps } from "./types";
import { Container, FORM_ID, type } from "./ui";

const marks = ["bg-pole-red", "bg-night-ink", "bg-pole-blue"] as const;

/**
 * Where the page converts: the free month, its three plain promises, and the form.
 * Calm on purpose. The only flourish is the barber-pole stripe along the form card's top edge.
 */
export function Offer({ locale, t }: SectionProps) {
  return (
    <section id={FORM_ID} aria-labelledby="offer-title" className="scroll-mt-24 py-24 sm:py-32">
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start lg:pt-8">
          <h2 id="offer-title" className={type.h2}>
            {t.offerTitle}
          </h2>
          <ul className="mt-10 grid gap-3">
            {t.offer.map((point, i) => (
              <li key={point} className="bm-card bm-reveal flex gap-4 px-5 py-5" style={{ "--i": i } as CSSProperties}>
                <span aria-hidden className={`mt-[0.6em] h-[7px] w-3.5 shrink-0 rounded-full ${marks[i % marks.length]}`} />
                <span className={`${type.lead} max-w-[44ch]`}>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative overflow-hidden rounded-[28px] border border-night-line bg-night-panel shadow-[0_40px_90px_-50px_rgba(0,0,0,.95)]">
          <div
            aria-hidden
            className="h-1.5"
            style={{
              background:
                "repeating-linear-gradient(-45deg, var(--l-red) 0 10px, var(--l-ink) 10px 20px, var(--l-blue) 20px 30px, var(--l-ink) 30px 40px)",
            }}
          />
          <div className="p-5 sm:p-9">
            <h3 className="font-display text-[2.4rem] font-[800] leading-none sm:text-[2.9rem]">{t.formTitle}</h3>
            <p className={`${type.body} mt-2 max-w-[48ch]`}>{t.formBody}</p>
            <div className="mt-8">
              <LeadForm locale={locale} />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
