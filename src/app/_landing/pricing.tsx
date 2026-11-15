import Image from "next/image";
import type { SectionProps } from "./types";
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button";
import { CONTACT_ID, Check, WidePanel, type } from "./ui";

/**
 * Pricing: the template's two cards on a photo (red barber chairs, darkened from the top).
 * Prices: the first month is free, then $50 a month (Pro). The Free plan isn't advertised.
 */
export function Pricing({ t }: SectionProps) {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-20">
      <WidePanel
        id="pricing-panel"
        className="px-4 py-[calc(48px+8vh)] sm:px-6"
        background={
          <>
            <Image src="/landing/photos/pricing-red-chairs.webp" alt="" fill sizes="100vw" className="object-cover object-center" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)" }} />
          </>
        }
      >

        <div className="mx-auto max-w-5xl md:px-10 min-[1152px]:px-6">
          {/*
            Phones: heading, then the cards stacked. From 768px the two cards sit side by side
            under the heading; from 1024px the heading takes the first third. The cards are row
            subgrids, so both are the same height and their price, list and button line up.
          */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-y-0 lg:grid-cols-3" data-reveal>
            <div className="md:col-span-2 md:mb-12 lg:col-span-1 lg:row-span-3 lg:mb-0">
              <h2 id="pricing-title" className={`${type.h2} text-white`}>
                {t.offerTitle}
              </h2>
              <p className="mt-4 leading-relaxed text-white">{t.offerBody}</p>
            </div>

            {t.plans.map((plan, i) => (
              <div
                key={plan.name}
                data-card="pricing"
                className={`flex flex-col overflow-hidden rounded-2xl border border-white/14 border-t-white/24 bg-panel md:row-span-3 md:grid md:grid-rows-subgrid md:gap-0`}
              >
                <div className="border-b border-white/14 p-8 md:p-10">
                  <h3 className="text-balance text-4xl font-semibold tracking-[-0.03em] text-foreground">{plan.price}</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{plan.name}</p>
                </div>
                <ul className="flex flex-col gap-3 px-8 pt-8 md:px-10">
                  {plan.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm leading-snug text-muted-foreground">
                      <Check className="mt-px h-4 w-4 text-white" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="px-8 pb-8 pt-8 md:px-10 md:pb-10">
                  {/* Both liquid metal; the second card's ring stays dim until hover, so the first leads. */}
                  <LiquidMetalButton href={`#${CONTACT_ID}`} tone={i === 0 ? "metal" : "quiet"} className="w-full">
                    {t.navCta}
                  </LiquidMetalButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      </WidePanel>
    </section>
  );
}
