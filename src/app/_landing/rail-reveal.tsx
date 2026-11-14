"use client";

import { useEffect } from "react";

/**
 * Reveals the first-month timeline one step at a time as the visitor scrolls. It "arms" the
 * rail (globals.css hides the steps that haven't been reached yet) and marks each step
 * `is-in` the moment the drawing line's tip (held 60% down the screen) reaches the middle
 * of that step's bubble: the bubble pops, and once it has settled the step's lines rise.
 * Played once per step. Steps already scrolled past when the page opens show at once.
 *
 * Renders nothing. Without JS, without IntersectionObserver or under reduced motion the
 * rail is never armed, so every step simply shows (the Final State Rule in DESIGN.md).
 */
export function RailReveal({ railId }: { railId: string }) {
  useEffect(() => {
    const rail = document.getElementById(railId);
    if (!rail || !("IntersectionObserver" in window)) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Watch each bubble, not the whole step, so the reveal starts exactly when the line meets it.
    const dots = [...rail.querySelectorAll<HTMLElement>("[data-step] .month-dot")];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // Reached: inside the top 60% of the screen, or already above it.
          if (e.isIntersecting || e.boundingClientRect.top < (e.rootBounds?.top ?? 0)) {
            e.target.closest("[data-step]")?.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -40% 0px", threshold: 0.5 },
    );
    rail.setAttribute("data-armed", "");
    for (const d of dots) io.observe(d);
    return () => io.disconnect();
  }, [railId]);

  return null;
}
