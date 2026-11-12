"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A small barber-red dot with a ring that pulses outward. The ring is a pseudo-element
 * animating only transform and opacity (compositor-only), and it runs only while the dot
 * is on screen. Under reduced motion the dot sits still (see .landing-live in globals.css).
 */
export function LiveDot({ className = "h-2 w-2" }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return <span ref={ref} aria-hidden className={`landing-live block shrink-0 rounded-full bg-barber ${on ? "is-on" : ""} ${className}`} />;
}
