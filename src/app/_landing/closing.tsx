import type { SectionProps } from "./types";
import { Container, FORM_ID, PrimaryLink, SecondaryLink, SectionLabel, type } from "./ui";

/**
 * The last ask, after the questions are answered: one sentence, one button, and
 * a quiet way on to the styles gallery just below. No frame, no cards: the page
 * has had its loud moments already.
 */
export function Closing({ t }: SectionProps) {
  return (
    <section aria-labelledby="closing-title" className="py-20 sm:py-28">
      <Container>
        <SectionLabel color="red">{t.closingLabel}</SectionLabel>
        <h2 id="closing-title" className={`${type.h2} mt-5 max-w-[18ch]`}>
          {t.closingTitle}
        </h2>
        <p className={`${type.lead} mt-5 max-w-[48ch]`}>{t.closingBody}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <PrimaryLink href={`#${FORM_ID}`}>{t.heroCta}</PrimaryLink>
          <SecondaryLink href="#styles">{t.closingGallery}</SecondaryLink>
        </div>
      </Container>
    </section>
  );
}
