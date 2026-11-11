"use client";

import { useEffect } from "react";

/**
 * Adds `.in` to every `.bm-reveal` element on the page as it scrolls into view
 * (once each), which plays its fade-up. Renders nothing. Without IntersectionObserver
 * everything is shown at once. `locale` re-runs the scan after the language toggle,
 * which can swap in new nodes.
 */
export function RevealObserver({ locale }: { locale: string }) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".bm-reveal:not(.in)"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [locale]);
  return null;
}
