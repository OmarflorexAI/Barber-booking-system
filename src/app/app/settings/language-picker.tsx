"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/dictionaries";

/** Each language is named in itself, so it reads right whichever language the app is in. */
const OPTIONS: { value: Locale; name: string }[] = [
  { value: "en", name: "English" },
  { value: "es", name: "Español" },
];

/**
 * The app's language on the Settings page: two options in one pill (a radio group). The choice
 * is the `lang` cookie for a year, on this device; the page then re-renders in the new
 * language. The lit option moves at once (optimistic) while the new text loads.
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

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const i = (OPTIONS.findIndex((o) => o.value === shown) + step + OPTIONS.length) % OPTIONS.length;
    choose(OPTIONS[i]!.value);
    e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]")[i]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-busy={pending || undefined}
      onKeyDown={onKey}
      className="inline-flex shrink-0 rounded-full p-0.5 shadow-[inset_0_0_0_1px_var(--line)]"
      data-testid="language-picker"
    >
      {OPTIONS.map((o) => {
        const checked = o.value === shown;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            lang={o.value}
            onClick={() => choose(o.value)}
            className={`inline-flex min-h-10 min-w-24 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
              checked ? "bg-raised text-ink shadow-[inset_0_0_0_1px_var(--line)]" : "text-muted hover:text-ink"
            }`}
          >
            {o.name}
          </button>
        );
      })}
    </div>
  );
}
