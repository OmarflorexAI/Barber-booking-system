"use client";

import { useState, type ReactNode } from "react";
import { GlowFrame, focusRing, type } from "./ui";

/**
 * The feature rows and their visuals.
 * - Wide screens: hovering, focusing or clicking a row selects it and the one
 *   framed visual on the right follows.
 * - Phones and tablets: the rows are plain text (nothing to press), with one
 *   shared visual under them, so the section stays short.
 */
export function FeatureList({ items, visuals }: { items: { title: string; body: string }[]; visuals: ReactNode[] }) {
  const [active, setActive] = useState(0);
  return (
    <>
      {/* Phones and tablets. */}
      <div className="mt-10 lg:hidden">
        <ul className="grid gap-x-10 gap-y-8 md:grid-cols-2">
          {items.map((item) => (
            <li key={item.title} className="border-l-2 border-night-line pl-5">
              <h3 className={`${type.h3} text-night-ink`}>{item.title}</h3>
              <p className={`${type.body} mt-1.5 max-w-[52ch]`}>{item.body}</p>
            </li>
          ))}
        </ul>
        <div aria-hidden className="mt-12">
          <GlowFrame glow="bottom" className="max-w-[560px]" stageClassName="aspect-[4/3]">
            {visuals[0]}
          </GlowFrame>
        </div>
      </div>

      {/* Wide screens. */}
      <div className="mt-16 hidden gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:items-start">
        <ul className="flex flex-col gap-2">
          {items.map((item, i) => {
            const on = i === active;
            return (
              <li key={item.title}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                  className={`group relative w-full cursor-pointer rounded-[5px] py-5 pl-7 pr-5 text-left transition-colors ${focusRing} ${
                    on ? "bg-night-panel" : "bg-transparent hover:bg-night-panel/60"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`absolute bottom-5 left-4 top-5 w-[2px] rounded-full transition-colors ${on ? "bg-pole-red" : "bg-night-line"}`}
                  />
                  <span className={`${type.h3} block text-night-ink`}>{item.title}</span>
                  <span className={`${type.body} mt-1.5 block max-w-[52ch]`}>{item.body}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* One frame; the selected row's visual crossfades in. */}
        <div id="features-visual" aria-hidden className="sticky top-24">
          <GlowFrame glow="right" stageClassName="aspect-[6/5]">
            {visuals.map((v, i) => (
              <div
                key={i}
                className={`absolute inset-0 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
                  i === active ? "opacity-100" : "pointer-events-none opacity-0 motion-safe:translate-y-2"
                }`}
              >
                {v}
              </div>
            ))}
          </GlowFrame>
        </div>
      </div>
    </>
  );
}
