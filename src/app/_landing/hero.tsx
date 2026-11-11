import Image from "next/image";
import type { CSSProperties } from "react";
import { Container, FORM_ID, GlowFrame, MiniCard, PrimaryLink, SecondaryLink, SectionLabel, type PillColor, type } from "./ui";
import type { SectionProps } from "./types";

/*
 * The cards drift up and down a few pixels, each on its own clock. They use the
 * `translate` property so the 3D tilt in `transform` stays put. Reduced motion
 * gets no animation (the class is motion-safe only).
 */
const driftCss = `@keyframes bm-drift{0%,100%{translate:0 0}50%{translate:0 -7px}}`;
const drift = "motion-safe:animate-[bm-drift_var(--d)_ease-in-out_infinite]";

type Float = {
  label: string;
  value: string;
  accent: PillColor;
  /** Position and depth inside the stage. */
  place: string;
  tilt: string;
  dur: string;
  delay: string;
};

export function Hero({ locale, t }: SectionProps) {
  const c = t.cards;
  const floats: Float[] = [
    {
      label: c.newBooking,
      value: c.newBookingValue,
      accent: "red",
      place: "left-[2%] top-[6%] sm:left-[5%] sm:top-[9%] lg:left-[12%] lg:top-[14%]",
      tilt: "rotateX(10deg) rotateY(14deg) translateZ(110px)",
      dur: "9s",
      delay: "0s",
    },
    {
      label: c.paid,
      value: c.paidValue,
      accent: "blue",
      place: "hidden sm:block sm:right-[9%] sm:top-[30%] lg:right-[18%]",
      tilt: "rotateX(8deg) rotateY(-16deg) translateZ(150px)",
      dur: "11s",
      delay: "-4s",
    },
    {
      label: c.reminder,
      value: c.reminderValue,
      accent: "white",
      place: "right-[2%] bottom-[3%] sm:bottom-auto sm:right-auto sm:left-[6%] sm:top-[62%] lg:left-[13%]",
      tilt: "rotateX(12deg) rotateY(18deg) translateZ(90px)",
      dur: "10s",
      delay: "-2s",
    },
    {
      label: c.week,
      value: c.weekValue,
      accent: "red",
      place: "hidden sm:block sm:right-[5%] sm:top-[68%] lg:right-[10%]",
      tilt: "rotateX(10deg) rotateY(-12deg) translateZ(125px)",
      dur: "12s",
      delay: "-7s",
    },
  ];
  const pills = ["bg-pole-red", "bg-night-ink", "bg-pole-blue", "pole"] as const;

  return (
    <section className="relative pt-14 pb-20 sm:pt-24 sm:pb-28">
      <style href="bm-hero-drift" precedence="default">
        {driftCss}
      </style>

      <Container>
        <div className="max-w-[760px]">
          <SectionLabel>{t.heroLabel}</SectionLabel>
          <h1 className={`mt-5 ${type.h1}`}>{t.heroTitle}</h1>
          <p className={`mt-6 max-w-[60ch] ${type.lead}`}>{t.heroBody}</p>
          <p className="mt-6 flex items-start gap-2.5 font-mono text-[13px] leading-5 text-night-ink/85">
            <span aria-hidden className="mt-[6px] h-[7px] w-3.5 shrink-0 rounded-full bg-pole-blue" />
            {t.heroTrust}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryLink href={`#${FORM_ID}`}>{t.heroCta}</PrimaryLink>
            <SecondaryLink href="/b/demo-shop">{t.heroDemo}</SecondaryLink>
          </div>
        </div>

        {/* The signature visual: the real booking page on a phone, with the shop's day floating around it. */}
        <GlowFrame glow="top" className="mt-14 sm:mt-20" stageClassName="overflow-hidden">
          <div className="relative h-[380px] [perspective:1100px] sm:h-[500px] lg:h-[560px]">
            {/* A faint pool of light under the phone. */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(40% 60% at 50% 70%, rgba(93,134,232,.10), transparent 70%), radial-gradient(30% 40% at 50% 20%, rgba(243,241,236,.06), transparent 70%)",
              }}
            />
            <div className="absolute inset-0 [transform-style:preserve-3d]">
              <div
                className="absolute left-1/2 top-[9%] w-[min(64%,230px)] sm:w-[250px] lg:w-[280px]"
                style={{ transform: "translateX(-50%) rotateX(14deg) rotateY(-9deg) rotateZ(1.5deg)", transformOrigin: "50% 50%" }}
              >
                <div className="rounded-[2.4rem] bg-[#050506] p-[7px] shadow-[0_0_0_1px_rgba(255,255,255,.09),0_50px_90px_-30px_rgba(0,0,0,.95),inset_0_0_0_1px_rgba(255,255,255,.05)] sm:p-2">
                  <div className="relative overflow-hidden rounded-[2rem] bg-[#f5f2ee] pt-7">
                    <span aria-hidden className="absolute left-1/2 top-2 h-[15px] w-[64px] -translate-x-1/2 rounded-full bg-[#050506]" />
                    <Image
                      src={`/landing/booking-services-${locale}.png`}
                      alt={t.heroShotAlt}
                      width={780}
                      height={1560}
                      sizes="(min-width: 1024px) 280px, (min-width: 640px) 250px, 230px"
                      fetchPriority="high"
                      loading="eager"
                      className="block h-auto w-full"
                    />
                    
                  </div>
                </div>
              </div>

              {floats.map((f) => (
                <div key={f.label} className={`absolute [transform-style:preserve-3d] ${f.place}`} aria-hidden>
                  <MiniCard
                    label={f.label}
                    value={f.value}
                    accent={f.accent}
                    className={`origin-left max-sm:scale-[0.82] ${drift}`}
                    style={{ transform: f.tilt, "--d": f.dur, animationDelay: f.delay } as CSSProperties}
                  />
                </div>
              ))}
            </div>
          </div>
        </GlowFrame>

        <ul className="mt-14 grid gap-x-8 gap-y-9 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4">
          {t.values.map((v, i) => {
            const pill = pills[i % pills.length];
            return (
              <li key={v.title}>
                <p className="flex items-center gap-2.5 text-[17px] font-semibold tracking-[-0.025em] text-night-ink">
                  <span
                    aria-hidden
                    className={`h-[7px] w-3.5 shrink-0 rounded-full ${pill === "pole" ? "" : pill}`}
                    style={
                      pill === "pole"
                        ? { background: "repeating-linear-gradient(135deg, var(--l-red) 0 3px, var(--l-ink) 3px 5px, var(--l-blue) 5px 8px, var(--l-ink) 8px 10px)" }
                        : undefined
                    }
                  />
                  {v.title}
                </p>
                <p className="mt-2 max-w-[34ch] pl-6 font-mono text-[14px] leading-[1.65] text-night-muted">{v.body}</p>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
