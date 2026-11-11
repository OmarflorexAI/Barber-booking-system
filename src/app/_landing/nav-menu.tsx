"use client";

import { useEffect, useId, useRef, useState } from "react";
import { focusRing } from "./ui";

/**
 * Section links for phones and tablets: a 44px button that drops a short list
 * under the bar. Closes on a link tap, Escape, or a tap outside, and gives focus
 * back to the button on Escape.
 */
export function NavMenu({ links, label, buttonLabel }: { links: { href: string; label: string }[]; label: string; buttonLabel: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div ref={root} className="lg:hidden">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={buttonLabel}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-11 w-11 items-center justify-center rounded-md text-night-muted transition-colors hover:text-night-ink aria-expanded:text-night-ink ${focusRing}`}
      >
        {/* Two short rules that fold into a cross when open. */}
        <span aria-hidden className="relative block h-3 w-[18px]">
          <span
            className={`absolute left-0 h-[1.5px] w-full rounded-full bg-current transition-transform motion-reduce:transition-none ${open ? "top-[5px] rotate-45" : "top-0.5"}`}
          />
          <span
            className={`absolute left-0 h-[1.5px] w-full rounded-full bg-current transition-transform motion-reduce:transition-none ${open ? "top-[5px] -rotate-45" : "top-[9px]"}`}
          />
        </span>
      </button>

      <nav
        id={id}
        aria-label={label}
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-night-line bg-night shadow-[0_24px_40px_-24px_rgba(0,0,0,.9)]"
      >
        <ul className="mx-auto grid w-full max-w-[1120px] px-4 py-2 sm:grid-cols-2 sm:px-6 sm:py-3">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onClick={() => setOpen(false)}
                className={`flex min-h-12 items-center rounded-sm font-mono text-[15px] text-night-ink/85 transition-colors hover:text-night-ink ${focusRing}`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
