"use client";

import { useRouter } from "next/navigation";
import { addTransitionType, useTransition } from "react";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/dictionaries";

/**
 * Switches between English and Spanish and remembers the choice for a year. `compact` is the
 * 44px square for the collapsed sidebar rail: it shows the two-letter code of the language
 * you'd switch to, and its name is the full language name ("Español" / "English").
 */
export function LanguageToggle({ locale, label, compact = false, className = "" }: { locale: Locale; label: string; compact?: boolean; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next: Locale = locale === "en" ? "es" : "en";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        start(() => {
          // Lets a <ViewTransition update={{ "lang-switch": ... }}> cross-fade the new text in.
          addTransitionType("lang-switch");
          router.refresh();
        });
      }}
      aria-label={compact ? label : undefined}
      title={compact ? label : undefined}
      className={compact ? `press h-11 w-11 shrink-0 place-items-center rounded-full border border-line font-mono text-xs font-medium tracking-[0.04em] text-muted transition-colors hover:border-ink/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60 ${className || "inline-grid"}` : `inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-line px-4 text-sm font-medium text-muted transition-colors hover:border-ink/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60 ${className}`}
      lang={next}
    >
      {compact ? <span aria-hidden="true">{next.toUpperCase()}</span> : label}
    </button>
  );
}
