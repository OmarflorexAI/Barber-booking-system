"use client";

import { useActionState } from "react";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { sendMagicLink, type LoginState } from "./actions";

/* The landing's dark input and white pill (DESIGN.md "Inputs / Fields", "Buttons"). */
const field =
  "min-h-12 w-full rounded-md border border-border bg-background px-4 py-3 text-[16px] text-foreground outline-none transition-colors placeholder:text-muted-foreground hover:border-white/25 focus-visible:border-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-foreground";
const submit =
  "inline-flex min-h-12 w-full items-center justify-center whitespace-nowrap rounded-full bg-white px-5 text-sm font-medium text-black transition-colors duration-200 hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-foreground";
/* A neutral notice (raised fill, white/25 border): red stays a live signal. */
const notice = "flex items-start gap-3 rounded-md border border-white/25 bg-raised px-4 py-3 text-[15px] leading-relaxed text-foreground";

export function LoginForm({ locale }: { locale: Locale }) {
  const t = dictionaries[locale];
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <p role="status" className={notice}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-5 w-5 shrink-0">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3.5 6.5 8.5 6 8.5-6" />
        </svg>
        {t.linkSent}
      </p>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">{t.email}</span>
        <input className={field} type="email" name="email" autoComplete="email" required />
      </label>
      {state.status === "error" && (
        <p role="alert" className={notice}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-5 w-5 shrink-0">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.75v5M12 16.25v.01" />
          </svg>
          {t.errors[state.message ?? "UNKNOWN"] ?? t.errors.UNKNOWN}
        </p>
      )}
      <button className={submit} disabled={pending}>
        {t.sendLink}
      </button>
    </form>
  );
}
