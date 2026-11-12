import Image from "next/image";
import type { SectionProps } from "./types";
import { CONTACT_ID, Check, WidePanel, outlinePill, type, whitePill } from "./ui";

/**
 * Pricing: the template's two cards on a photo (red barber chairs, darkened from the top).
 * The only price on the page is "free"; after that it's one monthly price, agreed in person.
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

        <div className="mx-auto max-w-5xl md:px-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3" data-reveal>
            <div>
              <h2 id="pricing-title" className={`${type.h2} text-white`}>
                {t.offerTitle}
              </h2>
              <p className="mt-4 leading-relaxed text-white/80">{t.offerBody}</p>
            </div>

            {t.plans.map((plan, i) => (
              <div key={plan.name} className={i === 1 ? "md:pb-12" : ""}>
                <div
                  className="h-full overflow-hidden rounded-2xl border border-border bg-black"
                  style={{ backgroundImage: "radial-gradient(80% 50% at 50% 0%, rgb(26,26,26) 0%, transparent 70%)" }}
                >
                  <div className="border-b border-white/10 p-8 md:p-10">
                    <h3 className="text-balance text-4xl font-semibold tracking-[-0.03em] text-foreground">{plan.price}</h3>
                    <p className="mt-3 text-sm text-muted-foreground">{plan.name}</p>
                  </div>
                  <div className="px-8 py-8 md:px-10">
                    <ul className="flex flex-col gap-3">
                      {plan.items.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-sm leading-snug text-muted-foreground">
                          <Check className="mt-px h-4 w-4 text-white" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <a href={`#${CONTACT_ID}`} className={`${i === 0 ? whitePill : outlinePill} mt-8`}>
                      {t.navCta}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </WidePanel>
    </section>
  );
}
