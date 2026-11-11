import type { SectionProps } from "./types";
import { Container, SectionLabel, type } from "./ui";

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
      className="scroll-mt-20 border-y border-night-line bg-night-panel py-20 sm:py-28"
    >
      <Container className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
        <div>
          <SectionLabel color="white">{t.setupLabel}</SectionLabel>
          <h2 id="setup-title" className={`${type.h2} mt-5 text-night-ink`}>
            {t.setupTitle}
          </h2>
          <p className={`${type.lead} mt-5 max-w-[44ch]`}>{t.setupBody}</p>

          {/* The promise, as the text an Owner would actually get back. */}
          <div className="mt-12 max-w-[30rem]">
            <div className="relative rounded-2xl rounded-bl-[4px] bg-night-raised px-6 py-5 shadow-[0_24px_50px_-28px_rgba(0,0,0,.9)]">
              <p className="text-balance text-[1.35rem] font-medium leading-[1.3] tracking-[-0.02em] text-night-ink sm:text-2xl">
                {t.setupSupport}
              </p>
            </div>
          </div>
        </div>

        <ol className="relative flex flex-col lg:pt-2">
          {t.setup.map((step, i) => (
            <li key={step} className="relative flex gap-5 pb-9 last:pb-0">
              {/* The line that joins the steps of the visit. */}
              {i < t.setup.length - 1 && (
                <span aria-hidden className="absolute bottom-0 left-[17px] top-10 w-px bg-night-line" />
              )}
              <span
                aria-hidden
                className="flex h-[35px] w-[35px] shrink-0 items-center justify-center rounded-full border border-night-line bg-night font-mono text-[13px] text-night-ink"
              >
                {i + 1}
              </span>
              <p className={`${type.body} pt-1.5 text-night-ink/85`}>{step}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
