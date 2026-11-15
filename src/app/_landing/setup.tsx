import Image from "next/image";
import { QrIcon, ShopIcon, SupportIcon } from "./icons";
import type { SectionProps } from "./types";
import { WidePanel, type } from "./ui";

const CARD_ICONS = [ShopIcon, QrIcon];

/**
 * Set up in one visit: the template's Founders layout. A wide photo panel (a barber pole
 * on the street, darkened from the top) holding the heading and two panel-toned cards.
 */
export function Setup({ t }: SectionProps) {
  return (
    <section id="setup" aria-labelledby="setup-title" className="scroll-mt-20">
      <WidePanel
        id="setup-panel"
        className="px-4 py-[calc(48px+8vh)] sm:px-6"
        background={
          <>
            <Image src="/landing/photos/setup-street-pole.webp" alt="" fill sizes="100vw" className="object-cover object-center" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)" }} />
            {/* From 1024px the heading sits over the pole's white stripes: a soft scrim from the left keeps its body text at 4.5:1. */}
            <div className="absolute inset-0 hidden lg:block" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.6), transparent 50%)" }} />
          </>
        }
      >

        <div className="mx-auto max-w-5xl md:px-10 min-[1152px]:px-6">
          {/* Same grid as Pricing: the two cards are row subgrids, equal in height, icon, title and list aligned. */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-y-0 lg:grid-cols-3" data-reveal>
            <div className="md:col-span-2 md:mb-12 lg:col-span-1 lg:row-span-2 lg:mb-0 lg:self-center">
              <h2 id="setup-title" className={`${type.h2} text-white`}>
                {t.setupTitle}
              </h2>
              <p className="mt-4 leading-relaxed text-white">{t.setupBody}</p>
            </div>

            {t.setupCards.map((card, i) => {
              const Icon = CARD_ICONS[i];
              return (
                <div
                  key={card.title}
                  data-card="setup"
                  className={`flex flex-col rounded-2xl border border-white/14 border-t-white/24 bg-panel p-8 md:row-span-2 md:grid md:grid-rows-subgrid md:gap-0 md:p-10`}
                >
                  <div>
                    <Icon className="h-6 w-6 text-foreground" />
                    <h3 className="mt-6 text-lg font-semibold tracking-[-0.02em] text-foreground">{card.title}</h3>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {card.steps.map((n) => (
                      <li key={n} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                        <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground/60" />
                        {t.setup[n]}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <p className="mt-10 flex max-w-2xl items-start gap-3 rounded-2xl border border-white/14 border-t-white/24 bg-panel/90 p-5 text-[15px] leading-relaxed text-white md:mt-12" data-reveal>
            <SupportIcon className="mt-0.5 h-5 w-5 text-white" />
            {t.setupSupport}
          </p>
        </div>
      </WidePanel>
    </section>
  );
}
