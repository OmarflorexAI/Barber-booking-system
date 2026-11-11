import Image from "next/image";
import type { SectionProps } from "./types";
import { Container, GlowFrame, MiniCard, SectionLabel, type } from "./ui";

/**
 * How it works: the three steps of a booking, next to what each side sees. The
 * real time picker sits in a phone inside the glowing frame, with the barber's
 * alert and the client's reminder floating over it.
 */
export function HowItWorks({ locale, t }: SectionProps) {
  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-20 py-20 sm:py-28">
      <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <SectionLabel color="blue">{t.nav.how}</SectionLabel>
          <h2 id="how-title" className={`${type.h2} mt-5`}>
            {t.howTitle}
          </h2>

          <ol className="mt-10 sm:mt-12">
            {t.how.map((step, i) => (
              <li key={step.title} className="relative grid grid-cols-[2rem_1fr] gap-x-4 pb-9 last:pb-0 sm:gap-x-5">
                {/* The thread between steps; the last one has nothing to lead to. */}
                {i < t.how.length - 1 && <span aria-hidden className="absolute top-9 bottom-1 left-4 w-px bg-night-line" />}
                <span
                  aria-hidden
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-night-line bg-night-raised font-mono text-[13px] text-night-ink"
                >
                  {i + 1}
                </span>
                <div className="pt-0.5">
                  <h3 className={type.h3}>{step.title}</h3>
                  <p className={`${type.body} mt-2 max-w-[46ch]`}>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <GlowFrame glow="right" className="mx-auto w-full max-w-[520px]" stageClassName="flex justify-center px-6 py-8 sm:py-10">
          <div className="relative">
            <div className="w-[min(230px,58vw)] overflow-hidden rounded-[26px] border-[5px] border-[#1c1d21] bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,.95)]">
              <Image
                src={`/landing/booking-times-${locale}.png`}
                width={780}
                height={1560}
                alt={t.howShotAlt}
                sizes="230px"
                className="block h-auto w-full"
              />
            </div>
            <MiniCard
              label={t.cards.barberAlert}
              value={t.cards.barberAlertValue}
              accent="red"
              className="absolute top-[14%] -left-4 sm:-left-16"
              style={{ transform: "perspective(600px) rotateY(14deg) rotateZ(-2deg)" }}
            />
            <MiniCard
              label={t.cards.clientText}
              value={t.cards.clientTextValue}
              accent="blue"
              className="absolute bottom-[12%] -right-4 sm:-right-16"
              style={{ transform: "perspective(600px) rotateY(-14deg) rotateZ(2deg)" }}
            />
          </div>
        </GlowFrame>
      </Container>
    </section>
  );
}
