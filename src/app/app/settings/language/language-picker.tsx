"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { LOCALE_COOKIE, LOCALE_NAMES, LOCALES, type Locale } from "@/lib/i18n/dictionaries";

/**
 * The language list on Settings → Language: one 56px row per language the app speaks, each
 * named in itself (so it reads right whatever the app is in), a check on the chosen one. A radio
 * group: Tab lands on the chosen row, arrows move the choice. The choice is the `lang` cookie
 * for a year, on this device; the page then re-renders in the new language. The check moves at
 * once (optimistic) while the new text loads.
 */
export function LanguagePicker({ locale, labelledBy }: { locale: Locale; labelledBy: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(locale);

  const choose = (next: Locale) => {
    if (next === shown) return;
    start(() => {
      setShown(next);
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    });
  };

  const onKey = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const i = (LOCALES.indexOf(shown) + step + LOCALES.length) % LOCALES.length;
    choose(LOCALES[i]!);
    e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]")[i]?.focus();
  };

  return (
    <ul role="radiogroup" aria-labelledby={labelledBy} aria-busy={pending || undefined} onKeyDown={onKey} className="border-t border-line">
      {LOCALES.map((code) => {
        const checked = code === shown;
        return (
          <li key={code} role="none" className="border-b border-line">
            <button
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              lang={code}
              onClick={() => choose(code)}
              className="-mx-2 flex min-h-14 w-[calc(100%+1rem)] items-center justify-between gap-4 rounded-md px-2 py-3 text-left transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <span className={checked ? "font-semibold" : "font-medium"}>{LOCALE_NAMES[code]}</span>
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-5 w-5 shrink-0 ${checked ? "text-ink" : "invisible"}`}
              >
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
