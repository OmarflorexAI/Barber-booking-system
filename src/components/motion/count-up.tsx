"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { observeInView, prefersReducedMotion } from "./reveal";

export type CountFormat = "number" | "duration";

/**
 * How a value reads. "number" uses Intl in the page's language; "duration" takes minutes
 * and matches the dictionaries' `dashboard.duration` (EN "3h 45m", ES "3 h 45 min").
 */
export function formatCount(value: number, locale: "en" | "es", format: CountFormat, fractionDigits: number) {
  if (format === "duration") {
    const min = Math.round(value);
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (locale === "es") return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`;
    return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  return new Intl.NumberFormat(locale === "es" ? "es-US" : "en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const noop = () => () => {};

/**
 * A number that counts up to its value: from 0 the first time it is seen, then from the
 * previous value whenever `value` changes. About 600ms, ease-out, JetBrains Mono tabular.
 *
 * - The server (and no-JS, and reduced motion) render the final value as plain text.
 * - A count-up never replaces a number someone already saw: if the page was server-rendered
 *   with the number on screen, it stays; below the fold it counts when scrolled to.
 * - The box reserves the final value's width (min-width in `ch`, exact for the mono font),
 *   so nothing around it moves while it counts.
 * - No live region: the DOM text is the real value once the count ends.
 */
export function CountUp({
  value,
  locale = "en",
  format = "number",
  fractionDigits = 0,
  duration = 600,
  className = "",
  ...rest
}: {
  value: number;
  locale?: "en" | "es";
  format?: CountFormat;
  fractionDigits?: number;
  duration?: number;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLSpanElement>, "children">) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  // true on a client-side mount (nothing painted yet), false while hydrating server HTML.
  const clientMount = useSyncExternalStore(noop, () => true, () => false);
  const mountedAs = useRef(clientMount);
  const seen = useRef(false);

  const finalText = formatCount(value, locale, format, fractionDigits);

  useLayoutEffect(() => {
    const el = ref.current;
    const set = (n: number) => {
      shownRef.current = n;
      setShown(n);
    };
    if (!el || prefersReducedMotion()) {
      set(value);
      return;
    }

    let frame = 0;
    const run = (from: number) => {
      if (from === value) return set(value);
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        set(t === 1 ? value : from + (value - from) * easeOut(t));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    // Seen before: count from what is on screen now to the new value.
    if (seen.current) {
      run(shownRef.current);
      return () => cancelAnimationFrame(frame);
    }

    // First time: a client mount starts at 0 before paint and counts once visible.
    if (mountedAs.current) set(0);
    let first = true;
    const stop = observeInView(el, (e) => {
      const wasFirst = first;
      first = false;
      if (!e.isIntersecting) {
        // Off screen: hold at 0 (invisible either way) until it scrolls into view.
        if (wasFirst) set(0);
        return;
      }
      seen.current = true;
      stop();
      // Server-rendered and already on screen: the number was read; leave it.
      if (wasFirst && !mountedAs.current) return set(value);
      run(0);
    });
    return () => {
      stop();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  const text = shown === value ? finalText : formatCount(shown, locale, format, fractionDigits);

  return (
    <span
      ref={ref}
      {...rest}
      className={`inline-block font-mono tabular-nums ${className}`}
      style={{ minWidth: `${finalText.length}ch`, ...rest.style }}
    >
      {text}
    </span>
  );
}
