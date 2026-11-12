import Link from "next/link";
import { HeroPhone } from "./hero-phone";
import type { SectionProps } from "./types";
import { Container, Pill, WidePanel, focusRing, type } from "./ui";

/**
 * The first view: who it's for, the promise, and the booking page itself on a phone
 * inside the template's wide gradient panel. Visitors can book a pretend cut right here.
 */
export function Hero({ t }: SectionProps) {
  return (
    <section id="top" aria-labelledby="hero-title" className="pt-[calc(32px+5vh)]">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Pill>{t.heroPill}</Pill>
            <h1 id="hero-title" className={type.h1}>
              {t.heroTitle}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">{t.heroBody}</p>
            <Link
              href="/b/demo-shop"
              transitionTypes={["page"]}
              className={`mt-5 inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-foreground underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white ${focusRing}`}
            >
              {t.heroDemo}
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M7 17 17 7M9 7h8v8" />
              </svg>
            </Link>
          </div>
        </div>
      </Container>

      <div className="mt-10 md:mt-14">
        <WidePanel
          id="hero-panel"
          className="flex items-center justify-center px-4 py-10 md:p-16"
          background={<div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(128,134,145,0.3), transparent)" }} />}
        >
          <HeroPhone p={t.heroPhone} lang={t.heroPhone.lang} />
        </WidePanel>
      </div>
    </section>
  );
}
