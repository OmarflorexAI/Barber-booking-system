"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";

/** The cookie the theme choice lives in (read before paint by the root layout's inline script). */
export const THEME_COOKIE = "theme";
type Theme = "light" | "dark";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const CHANGE_EVENT = "bm-theme-change";

function savedTheme(): Theme | null {
  const m = document.cookie.match(/(?:^|; )theme=(light|dark)(?:;|$)/);
  return m ? (m[1] as Theme) : null;
}

/** The theme on screen: the saved choice, else the phone's setting. */
function currentTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const mq = matchMedia(DARK_QUERY);
  mq.addEventListener("change", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    mq.removeEventListener("change", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/**
 * Re-applies the saved theme after React's dev-only remount clears <html data-theme>
 * (the inline script already set it before paint; this is a no-op in production).
 */
export function ThemeSync() {
  useLayoutEffect(() => {
    const t = savedTheme();
    if (t && document.documentElement.getAttribute("data-theme") !== t) {
      document.documentElement.setAttribute("data-theme", t);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }
  }, []);
  return null;
}

/**
 * The sun/moon switch next to the language toggle. Light by default, following the phone
 * until the person picks; the pick is saved for a year and applied at once. It's a toggle
 * button named "Dark mode" (pressed = dark). The icon is drawn by CSS from the theme on
 * <html>, so the first paint is right before React knows the theme.
 */
export function ThemeToggle({ label }: { label: string }) {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => null);

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={theme === null ? undefined : theme === "dark"}
      title={label}
      onClick={() => {
        const next: Theme = currentTheme() === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        // Browser bar color follows the chosen ground (same values as layout.tsx viewport.themeColor).
        document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", next === "dark" ? "#010101" : "#fafafa"));
        window.dispatchEvent(new Event(CHANGE_EVENT));
      }}
      className="theme-toggle inline-grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line text-muted transition-colors hover:border-ink/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {/* Moon: shown in light (tap for dark). */}
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="theme-icon-moon h-5 w-5">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
      {/* Sun: shown in dark (tap for light). */}
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="theme-icon-sun h-5 w-5">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
      </svg>
    </button>
  );
}
