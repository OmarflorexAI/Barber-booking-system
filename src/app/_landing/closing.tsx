import AnimatedGradient from "@/components/ui/animated-gradient";
import { POLE_FALLBACK, POLE_GRADIENT } from "./hero";
import type { SectionProps } from "./types";
import { Container, FORM_ID, PrimaryLink, type } from "./ui";

/**
 * The last ask, after the questions are answered: the turning pole from the hero
 * comes back as a bookend, with one sentence and one button.
 */
export function Closing({ t }: SectionProps) {
  return (
    <section aria-labelledby="closing-title" className="px-2 pb-2 sm:px-3 sm:pb-3">
      <div className="relative isolate overflow-hidden rounded-[22px] sm:rounded-[28px]" style={{ background: POLE_FALLBACK }}>
        <AnimatedGradient config={{ ...POLE_GRADIENT, rotation: 30, speed: 12, offset: 400 }} noise={{ opacity: 0.35 }} />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(90%_80%_at_50%_50%,rgba(10,16,32,.86)_0%,rgba(10,16,32,.7)_55%,rgba(10,16,32,.25)_100%)]" />
        <Container className="relative flex flex-col items-center py-28 text-center sm:py-40">
          <h2 id="closing-title" className={`${type.h2} max-w-[16ch]`}>
            {t.closingTitle}
          </h2>
          <p className={`${type.lead} mt-6 max-w-[46ch]`}>{t.closingBody}</p>
          <div className="mt-10">
            <PrimaryLink href={`#${FORM_ID}`}>{t.heroCta}</PrimaryLink>
          </div>
        </Container>
      </div>
    </section>
  );
}
