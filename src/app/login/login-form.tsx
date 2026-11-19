"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, type ComponentType } from "react";
import type { Turnstile as TurnstileWidget } from "@/components/turnstile";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { continueWithGoogle, sendMagicLink, type AuthMode, type LoginState } from "./actions";

/*
 * The Log in / Sign up card (the user's component, restyled to DESIGN.md): a panel card with a
 * two-way switch, Google as the white pill, then an email field that sends a link. No
 * passwords. Red stays a live signal, so errors are neutral notices.
 */
const focusRing = "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-foreground";
const pill = `inline-flex min-h-12 w-full items-center justify-center gap-3 whitespace-nowrap rounded-full px-5 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

function Notice({ role, children }: { role: "status" | "alert"; children: React.ReactNode }) {
  return (
    <p role={role} className="lead-notice flex items-start gap-3 px-4 py-3 text-[15px] leading-relaxed text-foreground">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-5 w-5 shrink-0">
        {role === "status" ? (
          <>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3.5 6.5 8.5 6 8.5-6" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.75v5M12 16.25v.01" />
          </>
        )}
      </svg>
      <span>{children}</span>
    </p>
  );
}

/** Google's four-color "G" (brand guidelines: keep its colors, on a white button). */
function GoogleG() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-[18px] w-[18px] shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function GoogleButton({ label }: { label: string }) {
  const [pending, setPending] = useState(false);
  return (
    <form action={continueWithGoogle} onSubmit={() => setPending(true)}>
      <button className={`${pill} bg-white text-black hover:bg-white/85`} disabled={pending} aria-busy={pending}>
        <GoogleG />
        {label}
      </button>
    </form>
  );
}

export function LoginForm({ locale, initialMode, error }: { locale: Locale; initialMode: AuthMode; error?: string }) {
  const t = dictionaries[locale];
  const a = t.auth;
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, { status: "idle" });
  const [token, setToken] = useState<string | null>(null);
  // The bot check guards only sign-up by email; it loads when that tab is open.
  const [Turnstile, setTurnstile] = useState<ComponentType<React.ComponentProps<typeof TurnstileWidget>> | null>(null);
  useEffect(() => {
    if (mode !== "signup" || Turnstile) return;
    let live = true;
    import("@/components/turnstile").then((m) => live && setTurnstile(() => m.Turnstile));
    return () => {
      live = false;
    };
  }, [mode, Turnstile]);

  const other: AuthMode = mode === "login" ? "signup" : "login";
  // Set on the first switch only, so the page load itself doesn't animate.
  const [switched, setSwitched] = useState(false);
  const swap = switched ? "auth-swap" : "";
  const pick = (m: AuthMode) => {
    if (m === mode) return;
    setSwitched(true);
    setMode(m);
    // Keep the address honest (shareable, and the back button returns to the same tab).
    window.history.replaceState(null, "", m === "signup" ? "/login?mode=signup" : "/login");
  };

  return (
    // data-mode drives the sliding thumb; the content entering from the side of the tab picked
    // (--swap-from) comes from it too (globals.css → "Auth switch").
    <div data-mode={mode} className="lead-card relative rounded-2xl p-6 sm:p-8">
      <div role="group" aria-label={a.tabsLabel} className="relative grid grid-cols-2 rounded-full border border-white/10 bg-background p-1">
        <span aria-hidden="true" className="auth-thumb absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/2)] rounded-full bg-raised shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]" />
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => pick(m)}
            className={`relative min-h-10 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground aria-pressed:text-foreground ${focusRing}`}
          >
            {a.tabs[m]}
          </button>
        ))}
      </div>

      <div key={`head-${mode}`} className={`mt-8 flex flex-col gap-2 ${swap}`}>
        <h1 className="text-balance text-[1.875rem] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-4xl">{a.title[mode]}</h1>
        <p className="text-base leading-relaxed text-muted-foreground">{a.hint[mode]}</p>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {error && <Notice role="alert">{error === "google" ? a.googleError : a.linkError}</Notice>}

        <GoogleButton label={a.google} />

        <div className="flex items-center gap-4 text-[13px] text-muted-foreground" aria-hidden="true">
          <span className="h-px flex-1 bg-white/10" />
          {a.or}
          <span className="h-px flex-1 bg-white/10" />
        </div>

        {state.status === "sent" ? (
          <Notice role="status">{a.sent[mode]}</Notice>
        ) : (
          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="mode" value={mode} />
            <input type="hidden" name="turnstileToken" value={token ?? ""} />
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">{t.email}</span>
              <span className="relative block">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3.5 6.5 8.5 6 8.5-6" />
                </svg>
                <input className="lead-field w-full !pl-12" type="email" name="email" autoComplete="email" inputMode="email" placeholder="name@example.com" required />
              </span>
            </label>
            {mode === "signup" && Turnstile && <Turnstile onToken={setToken} lang={locale} />}
            {state.status === "error" && <Notice role="alert">{t.errors[state.message ?? "UNKNOWN"] ?? t.errors.UNKNOWN}</Notice>}
            <button className={`${pill} border border-white/15 bg-raised text-foreground hover:border-white/30 hover:bg-white/[0.1]`} disabled={pending} aria-busy={pending}>
              <span key={mode} className={`${swap} [--swap-i:2]`}>
                {a.send[mode]}
              </span>
            </button>
          </form>
        )}
      </div>

      <p key={`switch-${mode}`} className={`mt-8 text-center text-sm text-muted-foreground ${swap} [--swap-i:3]`}>
        {a.switchTo[other]}{" "}
        <button type="button" onClick={() => pick(other)} className={`rounded-sm font-medium text-foreground underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white ${focusRing}`}>
          {a.tabs[other]}
        </button>
      </p>
      {mode === "signup" && (
        <p className={`mt-4 text-center text-[13px] leading-relaxed text-muted-foreground ${swap} [--swap-i:4]`}>
          {a.terms}{" "}
          <Link href={locale === "es" ? "/es/terms" : "/terms"} className={`rounded-sm underline decoration-white/30 underline-offset-4 hover:text-foreground ${focusRing}`}>
            {a.termsLink}
          </Link>{" "}
          {a.and}{" "}
          <Link href={locale === "es" ? "/es/privacy" : "/privacy"} className={`rounded-sm underline decoration-white/30 underline-offset-4 hover:text-foreground ${focusRing}`}>
            {a.privacyLink}
          </Link>
          .
        </p>
      )}
    </div>
  );
}
