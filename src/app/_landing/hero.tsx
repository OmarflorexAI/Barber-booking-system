import type { CSSProperties, ReactNode } from "react";
import AnimatedGradient, { type CustomConfig } from "@/components/ui/animated-gradient";
import { Container, FORM_ID, PrimaryLink, SecondaryLink, type } from "./ui";
import { HeroPhone } from "./hero-phone";
import type { SectionProps } from "./types";

/**
 * The barber pole, melted: pole blue, pole red and shaving-cream white in slow
 * diagonal stripes. A turning pole means the shop is open.
 */
export const POLE_GRADIENT: CustomConfig = {
  preset: "custom",
  color1: "#0b1a44",
  color2: "#e5483d",
  color3: "#f4eee3",
  shape: "Stripes",
  rotation: -30,
  proportion: 42,
  scale: 0.42,
  speed: 18,
  distortion: 3,
  swirl: 38,
  swirlIterations: 6,
  softness: 55,
  shapeSize: 38,
  offset: -200,
};

/** Shown before the shader's first frame, and instead of it without WebGL. */
export const POLE_FALLBACK = "linear-gradient(125deg, #0b1a44 0%, #1d2350 40%, #7a2a3a 70%, #e5483d 100%)";

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

export function Hero({ t }: SectionProps) {
  const words = t.heroTitle.split(" ");

  return (
    <section aria-labelledby="hero-title" className="relative px-2 pt-2 sm:px-3 sm:pt-3">
      {/* The panel pulls back like a mirror as the page scrolls (scroll-driven, CSS only). */}
      <div
        className="bm-recede relative isolate flex min-h-[calc(100svh-16px)] flex-col overflow-hidden rounded-[22px] sm:min-h-[calc(100svh-24px)] sm:rounded-[28px]"
        style={{ background: POLE_FALLBACK }}
      >
        <AnimatedGradient config={POLE_GRADIENT} noise={{ opacity: 0.35, scale: 1 }} />
        {/* Scrims keep the copy readable over the moving stripes: from the top on phones, from the left on wide screens. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,16,32,.9)_0%,rgba(10,16,32,.82)_45%,rgba(10,16,32,.35)_80%,rgba(10,16,32,.15)_100%)] lg:bg-[linear-gradient(100deg,rgba(10,16,32,.94)_0%,rgba(10,16,32,.82)_42%,rgba(10,16,32,.25)_70%,rgba(10,16,32,.05)_100%)]"
        />
        {/* And from the bottom, under the facts strip. */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(0deg,rgba(10,16,32,.85),rgba(10,16,32,0))]" />
        <div aria-hidden className="bm-shade absolute inset-0 bg-night opacity-0" />

        <Container className="bm-lift relative flex flex-1 flex-col pt-28 sm:pt-32 lg:pt-36">
          <div className="flex flex-1 flex-col justify-center lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:items-center lg:gap-12">
            <div>
              <h1 id="hero-title" className={type.h1}>
                {words.map((w, i) => (
                  <span key={i}>
                    <span className="bm-word">
                      <span style={{ "--i": i } as CSSProperties}>{w}</span>
                    </span>
                    {i < words.length - 1 && " "}
                  </span>
                ))}
              </h1>
              <p className={`bm-fade mt-7 max-w-[50ch] ${type.lead}`} style={delay(650)}>
                {t.heroBody}
              </p>
              <div className="bm-fade mt-9 flex flex-wrap gap-3" style={delay(800)}>
                <PrimaryLink href={`#${FORM_ID}`}>{t.heroCta}</PrimaryLink>
                <SecondaryLink href="/b/demo-shop">{t.heroDemo}</SecondaryLink>
              </div>
            </div>

            {/* The booking page on a phone, live: visitors can book a pretend cut right here. */}
            <div className="bm-fade" style={delay(450)}>
              <HeroPhone p={t.heroPhone} lang={t.heroPhone.lang} />
            </div>
          </div>

          {/* What every shop gets, lettered along the bottom of the window. */}
          <ul className="bm-fade mt-12 grid gap-x-8 gap-y-3 border-t border-white/15 py-6 sm:grid-cols-3 sm:py-7 lg:mt-14" style={delay(1000)}>
            {t.heroFacts.map((f, i) => (
              <li key={f} className="flex items-center gap-3 text-[14px] font-medium text-night-ink/85 sm:text-[15px]">
                <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/20 text-night-ink">
                  {FACT_ICONS[i % FACT_ICONS.length]}
                </span>
                {f}
              </li>
            ))}
          </ul>
        </Container>
      </div>
    </section>
  );
}

/* Small line icons for the three facts: two speech bubbles, a phone with no download, a shop. */
const icon = (paths: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-[14px] w-[14px]">
    {paths}
  </svg>
);
const FACT_ICONS = [
  icon(<path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2zm4 0h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />),
  icon(
    <>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M12 18h.01" />
    </>,
  ),
  icon(<path d="M3 21h18M5 21V10l7-6 7 6v11M10 21v-6h4v6" />),
];
