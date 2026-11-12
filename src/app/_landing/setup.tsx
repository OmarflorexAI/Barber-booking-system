import Image from "next/image";
import { QrIcon, ShopIcon, SupportIcon } from "./icons";
import type { SectionProps } from "./types";
import { WidePanel, type } from "./ui";

const CARD_ICONS = [ShopIcon, QrIcon];

/**
 * Set up in one visit: the template's Founders layout. A wide photo panel (a barber pole
 * on the street, darkened from the top) holding the heading and two offset black cards.
 */
export function Setup({ t }: SectionProps) {
  return (
    <section id="setup" aria-labelledby="setup-title" className="scroll-mt-20">
      <WidePanel id="setup-panel" className="px-4 py-[calc(48px+8vh)] sm:px-6">
        <Image src="/landing/photos/setup-street-pole.webp" alt="" fill sizes="(min-width: 1152px) 1152px, 100vw" className="-z-20 object-cover object-center" />
        <div aria-hidden className="absolute inset-0 -z-10" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)" }} />

        <div className="mx-auto max-w-5xl md:px-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3" data-reveal>
            <div className="flex items-center">
              <div>
                <h2 id="setup-title" className={`${type.h2} text-white`}>
                  {t.setupTitle}
                </h2>
                <p className="mt-4 leading-relaxed text-white/80">{t.setupBody}</p>
              </div>
            </div>

            {t.setupCards.map((card, i) => {
              const Icon = CARD_ICONS[i];
              return (
                <div key={card.title} className={i === 0 ? "md:pt-12" : "md:pb-12"}>
                  <div className="rounded-2xl bg-black p-8 md:p-10">
                    <Icon className="h-6 w-6 text-foreground" />
                    <h3 className="mt-6 text-lg font-semibold tracking-[-0.02em] text-foreground">{card.title}</h3>
                    <ul className="mt-4 space-y-3">
                      {card.steps.map((n) => (
                        <li key={n} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                          <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground/60" />
                          {t.setup[n]}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-10 flex max-w-2xl items-start gap-3 rounded-2xl bg-black/70 p-5 text-[15px] leading-relaxed text-white md:mt-12" data-reveal>
            <SupportIcon className="mt-0.5 h-5 w-5 text-white" />
            {t.setupSupport}
          </p>
        </div>
      </WidePanel>
    </section>
  );
}
