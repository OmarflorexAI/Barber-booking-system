"use client";

import { type RefObject, useEffect } from "react";

/** Always expanded this close to the top of the page. */
const TOP = 24;
/** Pixels of travel in one direction before the bar changes state, so small jitters do nothing. */
const HYSTERESIS = 8;

/**
 * Sets `data-compact` on the element while the visitor scrolls down, and clears it when they
 * scroll back up or reach the top. Writes the attribute straight to the DOM (no React state,
 * no re-render); the look and the motion live in globals.css. One passive listener, one rAF.
 */
export function useCompactOnScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let anchor = window.scrollY; // where the current run of travel started
    let compact = false;
    let frame = 0;

    const set = (next: boolean) => {
      if (next === compact) return;
      compact = next;
      el.toggleAttribute("data-compact", next);
    };

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      if (y < TOP) {
        set(false);
        anchor = y;
        return;
      }
      const delta = y - anchor;
      if (delta > HYSTERESIS) {
        set(true);
        anchor = y;
      } else if (delta < -HYSTERESIS) {
        set(false);
        anchor = y;
      } else if ((compact && delta > 0) || (!compact && delta < 0)) {
        // Still moving the way we already went: keep the anchor at the furthest point.
        anchor = y;
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    // A reload or a #hash link can land mid-page: start compact there.
    if (window.scrollY >= TOP) set(true);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref]);
}
