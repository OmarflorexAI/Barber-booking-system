"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Turnstile as TurnstileWidget } from "@/components/turnstile";
import type { Locale } from "@/lib/i18n/dictionaries";
import type { LandingDictionary } from "@/lib/i18n/landing";
import { focusRing, whitePill } from "./_landing/ui";
import { submitLeadAction } from "./actions";

/** Dark inputs for the landing page (the template's): hairline border on the page ground, a white focus ring. */
const field =
  "min-h-12 w-full rounded-md border border-border bg-background px-4 py-3 text-[16px] text-foreground outline-none transition-colors placeholder:text-muted-foreground hover:border-white/25 focus-visible:border-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-foreground";
const labelText = "text-sm font-medium text-foreground";

/** The form's strings in the visitor's language. Passed in by the server, so the browser never downloads both languages. */
export type LeadFormText = Pick<
  LandingDictionary,
  | "shopName" | "ownerName" | "phone" | "neighborhood" | "optional" | "barbers" | "barbersPick" | "barbersMore"
  | "message" | "messageHint" | "send" | "sending" | "verifying" | "thanksTitle" | "thanksBody" | "errors"
>;

/** "Get your free month": a Shop Owner leaves their details and we call them back. */
export function LeadForm({ locale, t }: { locale: Locale; t: LeadFormText }) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  // The bot check's script is heavy; load it only once the form comes near the screen or a field gets focus.
  const [nearForm, setNearForm] = useState(false);
  // The bot check's own code is fetched only then too (a plain import(): next/dynamic would preload it with the page).
  const [Turnstile, setTurnstile] = useState<typeof TurnstileWidget | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const botCheckOn = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const botCheckDone = !botCheckOn || !!token;
  // Send stays a live button: pressed before the bot check has finished, the form waits
  // for it here and sends on its own as soon as the token arrives.
  const [queued, setQueued] = useState<FormData | null>(null);

  const deliver = (form: FormData, turnstileToken: string | null) => {
    const text = (k: string) => String(form.get(k) ?? "");
    const barbers = Number(text("barberCount"));
    start(async () => {
      const r = await submitLeadAction({
        shopName: text("shopName"),
        ownerName: text("ownerName"),
        phone: text("phone"),
        neighborhood: text("neighborhood") || undefined,
        barberCount: barbers > 0 ? barbers : undefined,
        message: text("message") || undefined,
        locale,
        turnstileToken: turnstileToken ?? undefined,
      });
      if (r.ok) setDone(true);
      else setError(t.errors[r.code] ?? t.errors.UNKNOWN);
    });
  };

  // A token arriving for a form that's waiting sends it right away.
  const onToken = (fresh: string | null) => {
    setToken(fresh);
    if (fresh && queued) {
      setQueued(null);
      deliver(queued, fresh);
    }
  };
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [error]);
  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);
  useEffect(() => {
    if (!nearForm || Turnstile) return;
    let live = true;
    import("@/components/turnstile").then((m) => live && setTurnstile(() => m.Turnstile));
    return () => {
      live = false;
    };
  }, [nearForm, Turnstile]);
  useEffect(() => {
    const el = formRef.current;
    if (!el || nearForm) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNearForm(true), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [nearForm, done]);

  if (done) {
    return (
      <div
        ref={doneRef}
        tabIndex={-1}
        role="status"
        className={`rounded-md border border-border bg-background px-5 py-7 text-center outline-none ${focusRing}`}
      >
        <p className="flex items-center justify-center gap-2.5 text-2xl font-semibold tracking-[-0.02em] text-foreground">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 shrink-0">
            <path d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          {t.thanksTitle}
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">{t.thanksBody}</p>
      </div>
    );
  }

  function submit(form: FormData) {
    setError(null);
    if (!botCheckDone) {
      // React clears the fields after the action; the FormData keeps what was typed.
      setQueued(form);
      setNearForm(true);
      return;
    }
    deliver(form, token);
  }

  const optional = <span className="text-[13px] font-normal text-muted-foreground"> ({t.optional})</span>;

  return (
    <form ref={formRef} action={submit} onFocus={() => setNearForm(true)} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className={labelText}>{t.shopName}</span>
        <input className={field} name="shopName" required maxLength={80} autoComplete="organization" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelText}>{t.ownerName}</span>
        <input className={field} name="ownerName" required maxLength={80} autoComplete="name" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelText}>{t.phone}</span>
        <input className={field} name="phone" type="tel" inputMode="tel" required maxLength={25} autoComplete="tel" placeholder="(718) 555-0123" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={labelText}>{t.neighborhood}{optional}</span>
          <input className={field} name="neighborhood" maxLength={80} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelText}>{t.barbers}{optional}</span>
          <span className="relative">
            <select className={`${field} appearance-none pr-11`} name="barberCount" defaultValue="">
              <option value="">{t.barbersPick}</option>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
              <option value="7">{t.barbersMore}</option>
            </select>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={labelText}>{t.message}{optional}</span>
        <textarea className={`${field} min-h-24 resize-y py-3 leading-[1.5]`} name="message" maxLength={1000} rows={3} placeholder={t.messageHint} />
      </label>

      {/* The bot check is dark and invisible unless Cloudflare needs the visitor to act. */}
      {Turnstile && <Turnstile onToken={onToken} lang={locale} />}

      {error && (
        <p ref={errorRef} role="alert" className="flex items-start gap-3 rounded-md border border-white/25 bg-raised px-4 py-3 text-[15px] leading-relaxed text-foreground">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-5 w-5 shrink-0">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.75v5M12 16.25v.01" />
          </svg>
          {error}
        </p>
      )}
      <button
        type="submit"
        className={`${whitePill} min-h-12 w-full px-6 disabled:cursor-wait disabled:opacity-80 sm:w-auto sm:self-start`}
        disabled={pending || !!queued}
        aria-busy={pending || !!queued}
      >
        {pending ? t.sending : queued ? t.verifying : t.send}
      </button>
    </form>
  );
}
