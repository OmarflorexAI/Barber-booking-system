"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * ← / → flip the Dashboard one week back or forward (the stepper's links advertise it with
 * `aria-keyshortcuts`). Only when nothing else wants the arrows: not while typing, not inside
 * a dialog, and not when a focused control (the busy-hours map) already handled the key.
 */
export function WeekKeys({ prev, next }: { prev: string; next: string | null }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable], dialog, [role='group']")) return;
      const to = e.key === "ArrowLeft" ? prev : e.key === "ArrowRight" ? next : null;
      if (!to) return;
      e.preventDefault();
      router.push(to, { scroll: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, router]);
  return null;
}
