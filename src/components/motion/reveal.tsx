"use client";

import { useLayoutEffect, useRef, useState } from "react";

/*
 * One shared IntersectionObserver for every in-view trigger on the page (CountUp, Reveal),
 * instead of one observer per element.
 */
type Callback = (entry: IntersectionObserverEntry) => void;
const callbacks = new Map<Element, Callback>();
let observer: IntersectionObserver | null = null;

function shared() {
  observer ??= new IntersectionObserver((entries) => {
    for (const e of entries) callbacks.get(e.target)?.(e);
  });
  return observer;
}

/**
 * Calls `cb` with each intersection change of `el` (the first call says whether it is on
 * screen right now). Returns the unsubscribe.
 */
export function observeInView(el: Element, cb: Callback) {
  callbacks.set(el, cb);
  shared().observe(el);
  return () => {
    callbacks.delete(el);
    observer?.unobserve(el);
  };
}

export const prefersReducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Plays the `.enter` fade + rise when the block first scrolls into view. Content that is on
 * screen when the page loads, content seen with reduced motion, and content without
 * JavaScript simply shows; only blocks below the fold are held (opacity 0) until they arrive.
 * `index` staggers siblings (`--i`, 40ms per step).
 */
export function Reveal({
  children,
  index = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"shown" | "waiting" | "entering">("shown");

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let first = true;
    const stop = observeInView(el, (e) => {
      if (first) {
        first = false;
        if (e.isIntersecting) return stop();
        setState("waiting");
        return;
      }
      if (e.isIntersecting) {
        setState("entering");
        stop();
      }
    });
    return stop;
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={`${state === "entering" ? "enter" : ""} ${className}`}
      style={{ "--i": index, opacity: state === "waiting" ? 0 : undefined } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
