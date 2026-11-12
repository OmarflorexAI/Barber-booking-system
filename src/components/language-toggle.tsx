"use client";

import { useRouter } from "next/navigation";
import { addTransitionType, useTransition } from "react";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/dictionaries";

/** Switches between English and Spanish and remembers the choice for a year. */
export function LanguageToggle({ locale, label }: { locale: Locale; label: string }) {
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
      className="rounded-full border border-line px-3 py-1 text-sm text-muted hover:text-ink"
      lang={next}
    >
      {label}
    </button>
  );
}
