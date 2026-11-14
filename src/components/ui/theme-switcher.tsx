"use client";

import { useSyncExternalStore } from "react";
import { THEME_COOKIE } from "@/components/theme-toggle";

/*
 * System / Light / Dark, a three-way pill with a thumb that springs to the choice.
 * Adapted from a shadcn-style switcher (next-themes + motion) to this app's own theme
 * system, with no new dependencies: the choice lives in the `theme` cookie, which the root
 * layout's inline script puts on <html data-theme> before paint; "System" deletes the
 * cookie and the attribute, so the phone's setting wins again.
 *
 * Both the thumb's place and the lit icon are drawn by CSS from <html data-theme>
 * (globals.css → "Theme switcher"), so the first paint is right before React hydrates.
 * The thumb moves with translate only; reduced motion makes it jump. `rail` lets the
 * desktop sidebar stack it vertically when the sidebar is collapsed to its 72px rail.
 */

type Choice = "system" | "light" | "dark";
const CHANGE_EVENT = "bm-theme-change";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readChoice(): Choice {
  const t = document.documentElement.getAttribute("data-theme");
  return t === "light" || t === "dark" ? t : "system";
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

function apply(choice: Choice) {
  const root = document.documentElement;
  freezeTransitions();
  if (choice === "system") {
    root.removeAttribute("data-theme");
    document.cookie = `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax`;
  } else {
    root.setAttribute("data-theme", choice);
    document.cookie = `${THEME_COOKIE}=${choice}; path=/; max-age=31536000; samesite=lax`;
  }
  // Browser bar color follows the ground on screen (same values as layout.tsx viewport.themeColor).
  const dark = choice === "dark" || (choice === "system" && matchMedia(DARK_QUERY).matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", dark ? "#010101" : "#fafafa"));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * Theme changes must land in one frame. Many controls carry `transition-colors`; without this
 * they'd each fade from the old palette at their own speed while the rest snaps (a patchwork
 * of half-switched colors). `.theme-swap` turns transitions off (globals.css) until two frames
 * later, after the new colors have painted. The switcher's thumb is exempt, so it still slides.
 */
export function freezeTransitions() {
  const root = document.documentElement;
  root.classList.add("theme-swap");
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-swap")));
}

export function ThemeSwitcher({
  labels,
  rail = false,
  className = "",
}: {
  /** Group name and the three options, in the page's language. */
  labels: { group: string; system: string; light: string; dark: string };
  rail?: boolean;
  className?: string;
}) {
  // null until hydrated: CSS lights the right option meanwhile, so nothing flashes.
  const choice = useSyncExternalStore(subscribe, readChoice, () => null);
  const options: { value: Choice; icon: React.ReactNode }[] = [
    { value: "system", icon: <MonitorIcon /> },
    { value: "light", icon: <SunIcon /> },
    { value: "dark", icon: <MoonStarIcon /> },
  ];

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const i = (options.findIndex((o) => o.value === readChoice()) + step + 3) % 3;
    apply(options[i]!.value);
    e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]")[i]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={labels.group} onKeyDown={onKey} className={`theme-switch ${rail ? "theme-switch-rail" : ""} ${className}`}>
      <span aria-hidden="true" className="theme-switch-thumb" />
      {options.map((o) => {
        const checked = choice === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            data-opt={o.value}
            aria-checked={choice === null ? undefined : checked}
            aria-label={labels[o.value]}
            title={labels[o.value]}
            // Roving focus: Tab lands on the chosen option, arrows move between them.
            tabIndex={choice === null ? (o.value === "system" ? 0 : -1) : checked ? 0 : -1}
            onClick={() => apply(o.value)}
            className="theme-switch-opt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {o.icon}
          </button>
        );
      })}
    </div>
  );
}

/* Lucide's monitor, sun and moon-star (ISC), inlined so the bundle doesn't need the package. */
const svg = { "aria-hidden": true, focusable: false, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function MonitorIcon() {
  return (
    <svg {...svg}>
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg {...svg} className="theme-switch-sun">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonStarIcon() {
  return (
    <svg {...svg} className="theme-switch-moon">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9" />
      <path d="M20 3v4M22 5h-4" />
    </svg>
  );
}
