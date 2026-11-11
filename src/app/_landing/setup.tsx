import type { CSSProperties } from "react";
import type { SectionProps } from "./types";
import { Container, type } from "./ui";

/**
 * Done for you: a full-width band, quieter than the features above it. The visit
 * is a real sequence, so it is a numbered timeline. The support promise is the
 * reason to choose us, so it is the one loud thing here, drawn as a text message.
 */
export function Setup({ t }: SectionProps) {
  return (
    <section
      id="setup"
      aria-labelledby="setup-title"
      className="scroll-mt-24 border-y border-night-line bg-night-panel py-24 sm:py-32"
    >
      <Container className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
        <div>
          <h2 id="setup-title" className={`${type.h2} text-night-ink`}>
            {t.setupTitle}
          </h2>
          <p className={`${type.lead} mt-5 max-w-[44ch]`}>{t.setupBody}</p>

          {/* The promise, as the text an Owner would actually get back. */}
          <div className="mt-12 max-w-[30rem]">
            <div className="relative rounded-[26px] rounded-bl-[6px] bg-night-raised px-6 py-5 shadow-[0_24px_50px_-28px_rgba(0,0,0,.9)]">
              <p className="text-balance text-[1.35rem] font-medium leading-[1.3] tracking-[-0.02em] text-night-ink sm:text-2xl">
                {t.setupSupport}
              </p>
            </div>
          </div>
        </div>

        <ol className="grid gap-4 sm:grid-cols-2 lg:pt-2">
          {t.setup.map((step, i) => (
            <li key={step} className="bm-card bm-reveal bg-night p-6 hover:bg-[#0e1730]" style={{ "--i": i } as CSSProperties}>
              <span aria-hidden className="bm-icon font-display text-[22px] font-[800]">
                {i + 1}
              </span>
              <p className={`${type.body} mt-5 text-night-ink/85`}>{step}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
