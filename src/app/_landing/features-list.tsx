"use client";

import { useState, type ReactNode } from "react";
import { GlowFrame, focusRing } from "./ui";

/**
 * The price board. Each feature is a line on the wall: its name in the signage
 * face, a dotted leader, and "Included" where a price would be. Pressing a line
 * (or, with a mouse, pointing at it) opens its detail and the framed visual
 * follows: beside the board on wide screens, under it on phones.
 */
export function FeatureList({ items, price, visuals }: { items: { title: string; body: string }[]; price: string; visuals: ReactNode[] }) {
  const [active, setActive] = useState(0);
  return (
    <div className="mt-14 grid gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start lg:gap-16">
      <ul className="border-t border-night-line">
        {items.map((item, i) => {
          const on = i === active;
          return (
            <li key={item.title} className="border-b border-night-line">
              <h3>
                <button
                  type="button"
                  aria-expanded={on}
                  aria-controls={`feature-${i}`}
                  onClick={() => setActive(i)}
                  onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
                  className={`group flex w-full cursor-pointer items-baseline gap-4 rounded-md py-5 text-left sm:py-6 ${focusRing}`}
                >
                  <span
                    className={`font-display text-[clamp(1.55rem,3.2vw,2.35rem)] font-[800] leading-[1] tracking-[0.005em] transition-colors duration-300 ${
                      on ? "text-night-ink" : "text-night-ink/45 group-hover:text-night-ink/75"
                    }`}
                  >
                    {item.title}
                  </span>
                  <span
                    aria-hidden
                    className={`min-w-6 flex-1 -translate-y-[0.3em] border-b-2 border-dotted transition-colors duration-300 ${on ? "border-night-ink/70" : "border-night-line"}`}
                  />
                  <span
                    className={`flex shrink-0 items-center gap-1.5 text-[13px] font-semibold transition-colors duration-300 sm:text-[14px] ${
                      on ? "text-night-ink" : "text-night-muted"
                    }`}
                  >
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`h-3.5 w-3.5 transition-colors duration-300 ${on ? "text-pole-red" : ""}`}
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    {price}
                  </span>
                </button>
              </h3>
              <div
                id={`feature-${i}`}
                aria-hidden={!on}
                className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none ${
                  on ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <p
                    className={`max-w-[52ch] pb-6 text-[16px] leading-[1.65] text-night-muted transition-[opacity,translate] duration-500 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-opacity ${
                      on ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
                    }`}
                  >
                    {item.body}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* One frame; the selected line's visual comes into focus as the last one blurs away. */}
      <div aria-hidden className="lg:sticky lg:top-28">
        <GlowFrame glow="right" stageClassName="aspect-[6/5]">
          {visuals.map((v, i) => (
            <div
              key={i}
              className={`absolute inset-0 transition-[opacity,filter,scale] duration-500 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-opacity ${
                i === active ? "scale-100 opacity-100 blur-0" : "pointer-events-none scale-[0.97] opacity-0 blur-md motion-reduce:scale-100 motion-reduce:blur-0"
              }`}
            >
              {v}
            </div>
          ))}
        </GlowFrame>
      </div>
    </div>
  );
}
