import type { SectionProps } from "./types";
import { Container, type } from "./ui";

/** Why it matters: the template's 1/3 + 2/3 block under the hero image, without avatars. */
export function Why({ t }: SectionProps) {
  return (
    <section aria-labelledby="why-title" className="py-[calc(24px+4vh)]">
      <Container>
        <div className="grid gap-8 md:grid-cols-3 md:gap-12" data-reveal>
          <h2 id="why-title" className={type.h2}>
            {t.whyTitle}
          </h2>
          <div className="md:col-span-2">
            <p className="text-lg font-medium leading-relaxed text-foreground">{t.whyLead}</p>
            {t.whyBody.map((p) => (
              <p key={p} className={`mt-4 max-w-[65ch] ${type.body}`}>
                {p}
              </p>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
