import { HowStepper } from "./how-stepper";
import type { SectionProps } from "./types";
import { Container, type } from "./ui";

/**
 * How it works: the three steps of a booking, pinned. On wide screens a sticky
 * window beside the steps shows what each side sees as you scroll through them.
 */
export function HowItWorks({ t }: SectionProps) {
  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-24 py-24 sm:py-32">
      <Container>
        <div className="bm-reveal max-w-[640px]">
          <h2 id="how-title" className={type.h2}>
            {t.howTitle}
          </h2>
          <p className={`${type.lead} mt-5 max-w-[48ch]`}>{t.howBody}</p>
        </div>
        <HowStepper steps={t.how} stage={t.howStage} />
      </Container>
    </section>
  );
}
