import type { Metadata } from "next";
import { Suspense } from "react";
import { RowsSkeleton } from "../../_shell/skeleton";
import { BackToSettings } from "../_back";
import { ownerContext } from "../_owner";
import { LanguagePicker } from "./language-picker";

export const metadata: Metadata = { title: "Language" };

/**
 * Language (Owner only): the languages the app speaks, as a list; picking one switches the
 * app at once and is saved on this device (the `lang` cookie). Clients choose their own
 * language on the booking page, so this changes only what the Owner sees.
 */
export default function LanguagePage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Suspense fallback={<RowsSkeleton rows={2} />}>
        <Language />
      </Suspense>
    </div>
  );
}

async function Language() {
  const ctx = await ownerContext();
  if (!ctx) return null;
  const { t, locale } = ctx;
  const s = t.settings.language;
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <BackToSettings label={t.settings.back} />
        <h1 id="language-title" className="text-2xl font-semibold tracking-[-0.015em]">
          {s.title}
        </h1>
        <p className="max-w-prose leading-relaxed text-muted">{s.intro}</p>
      </div>
      <LanguagePicker locale={locale} labelledBy="language-title" />
    </div>
  );
}
