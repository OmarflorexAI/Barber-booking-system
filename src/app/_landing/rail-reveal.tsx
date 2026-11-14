"use client";

import { useEffect } from "react";

/**
 * Reveals the first-month timeline one step at a time as the visitor scrolls. It "arms" the
 * rail (globals.css hides the steps that haven't been reached yet) and marks each step
 * `is-in` once its top crosses 60% of the screen, which plays that step's bubble pop and
 * its lines rising, once. Steps already scrolled past when the page opens show at once.
 *
 * Renders nothing. Without JS, without IntersectionObserver or under reduced motion the
 * rail is never armed, so every step simply shows (the Final State Rule in DESIGN.md).
 */
export function RailReveal({ railId }: { railId: string }) {
  useEffect(() => {
    const rail = document.getElementById(railId);
    if (!rail || !("IntersectionObserver" in window)) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const steps = [...rail.querySelectorAll<HTMLElement>("[data-step]")];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // Reached: inside the top 60% of the screen, or already above it.
          if (e.isIntersecting || e.boundingClientRect.top < (e.rootBounds?.top ?? 0)) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -40% 0px" },
    );
    rail.setAttribute("data-armed", "");
    for (const s of steps) io.observe(s);
    return () => io.disconnect();
  }, [railId]);

  return null;
}
