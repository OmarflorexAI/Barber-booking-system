import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import type { LandingDictionary } from "@/lib/i18n/landing";
import type { SectionProps } from "./types";
import { Container, type } from "./ui";

type Stage = LandingDictionary["howStage"];

const PHOTOS = [
  { src: "/landing/photos/how-clipper.webp", position: "50% 40%" },
  { src: "/landing/photos/how-trimmer.webp", position: "50% 50%" },
  { src: "/landing/photos/how-shop.webp", position: "50% 50%" },
];

/**
 * How it works: the template's three zigzag rows. Text first in the DOM (and on phones);
 * on wide screens the middle row puts its panel on the left. Each panel is a black box
 * with a dimmed photo behind a small dark card showing that step in the product.
 */
export function HowItWorks({ t }: SectionProps) {
  const s = t.howStage;
  const cards = [<BookingCard key="b" s={s} />, <AlertCard key="a" s={s} />, <ReminderCard key="r" s={s} />];

  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-20 py-[calc(48px+8vh)]">
      <Container>
        <div className="max-w-2xl" data-reveal>
          <h2 id="how-title" className={type.h2}>
            {t.howTitle}
          </h2>
          <p className={`mt-4 ${type.body}`}>{t.howBody}</p>
        </div>

        <div className="mt-14 space-y-20 md:mt-20 md:space-y-28">
          {t.how.map((step, i) => (
            <div key={step.title} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16" data-reveal>
              <div>
                <h3 className={type.h3}>{step.title}</h3>
                <p className={`mt-4 max-w-[48ch] ${type.body}`}>{step.body}</p>
              </div>
              <PhotoPanel photo={PHOTOS[i]} className={i % 2 === 1 ? "lg:order-first" : ""}>
                {cards[i]}
              </PhotoPanel>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/** The black box with the dimmed photo. `--photo-opacity` is the hook M3 animates on scroll. */
function PhotoPanel({ photo, className, children }: { photo: (typeof PHOTOS)[number]; className: string; children: ReactNode }) {
  return (
    <div
      data-fade-bg
      className={`relative isolate flex h-80 items-center justify-center overflow-hidden rounded-2xl bg-black p-6 md:h-96 ${className}`}
      style={{ "--photo-opacity": 0.45 } as CSSProperties}
    >
      <Image
        src={photo.src}
        alt=""
        fill
        sizes="(min-width: 1024px) 470px, (min-width: 640px) 90vw, 100vw"
        className="-z-10 object-cover opacity-(--photo-opacity)"
        style={{ objectPosition: photo.position }}
      />
      <div className="relative w-full max-w-[260px]">{children}</div>
    </div>
  );
}

/** The template's mini card: a small dark panel with hairline border. */
function MiniCard({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-background p-5">{children}</div>;
}

function BookingCard({ s }: { s: Stage }) {
  return (
    <MiniCard>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[12px] font-semibold text-foreground">{s.service}</p>
        <p className="font-mono text-[10px] text-muted-foreground">{s.serviceMeta}</p>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{s.barber}</p>
      <ul className="mt-4 grid grid-cols-3 gap-1.5">
        {s.times.map((time, i) => {
          const taken = s.taken.includes(i);
          const picked = i === s.picked;
          return (
            <li
              key={time}
              className={`rounded-md py-1.5 text-center font-mono text-[10px] tabular-nums ${
                picked
                  ? "bg-foreground font-semibold text-background"
                  : taken
                    ? "text-muted-foreground line-through"
                    : "border border-white/10 text-foreground/90"
              }`}
            >
              {time}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-[11px] font-medium text-foreground">
        <span aria-hidden className="grid h-4 w-4 place-items-center rounded-full bg-barber text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        {s.booked}
      </p>
    </MiniCard>
  );
}

function AlertCard({ s }: { s: Stage }) {
  return (
    <MiniCard>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] text-muted-foreground">{s.alertFrom}</p>
        <p className="text-[10px] text-muted-foreground">{s.alertWhen}</p>
      </div>
      <p className="mt-2 text-[12px] font-semibold text-foreground">{s.alertTitle}</p>
      <p className="mt-0.5 text-[11px] text-foreground/90">{s.alertBody}</p>
      <div className="mt-4 border-t border-white/10 pt-3">
        <p className="text-[11px] font-semibold text-foreground">{s.dayTitle}</p>
        <ul className="mt-2 space-y-1">
          {s.day.map((row) => (
            <li
              key={row.time}
              className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[11px] ${row.isNew ? "bg-raised text-foreground" : "text-muted-foreground"}`}
            >
              <span className="w-14 shrink-0 font-mono text-[10px] tabular-nums">{row.time}</span>
              <span className="min-w-0 flex-1">{row.who}</span>
              {row.isNew && (
                <span className="flex items-center gap-1.5 text-[10px] font-medium">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-barber" />
                  {s.newBadge}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </MiniCard>
  );
}

function ReminderCard({ s }: { s: Stage }) {
  return (
    <MiniCard>
      <p className="text-[11px] font-semibold text-foreground">{s.textFrom}</p>
      <p className="mt-3 rounded-xl rounded-tl-sm bg-raised px-3 py-2.5 text-[11px] leading-[1.5] text-foreground/90">{s.text}</p>
      <p className="mt-2 text-[10px] text-muted-foreground">{s.textSent}</p>
      <div className="mt-4 grid grid-cols-2 gap-1.5">
        {s.textActions.map((a) => (
          <span key={a} className="rounded-md border border-white/10 py-1.5 text-center text-[10px] font-medium text-foreground/90">
            {a}
          </span>
        ))}
      </div>
    </MiniCard>
  );
}
