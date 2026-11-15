"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Turnstile as TurnstileWidget } from "@/components/turnstile";
import type { Locale } from "@/lib/i18n/dictionaries";
import type { LandingDictionary } from "@/lib/i18n/landing";
import { focusRing } from "./_landing/ui";
import { submitLeadAction } from "./actions";

/** Dark inset fields with a rim brighter at the top and a soft white focus ring (`.lead-*` in globals.css). */
const field = "lead-field";
const labelText = "text-sm font-medium text-foreground";

/** The form's strings in the visitor's language. Passed in by the server, so the browser never downloads both languages. */
export type LeadFormText = Pick<
  LandingDictionary,
  | "shopName" | "ownerName" | "phone" | "optional" | "barbers" | "barbersPick" | "barbersMore"
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
        className={`lead-notice px-5 py-7 text-center outline-none ${focusRing}`}
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
      // The FormData keeps what was typed until the token arrives.
      setQueued(form);
      setNearForm(true);
      return;
    }
    deliver(form, token);
  }

  const busy = pending || !!queued;
  const optional = <span className="text-[13px] font-normal text-muted-foreground"> ({t.optional})</span>;

  return (
    <form
      ref={formRef}
      // onSubmit, not action={…}: a form action makes React clear the fields, and a visitor
      // who gets an error back must keep what they typed.
      onSubmit={(e) => {
        e.preventDefault();
        submit(new FormData(e.currentTarget));
      }}
      onFocus={() => setNearForm(true)}
      className="flex flex-col gap-4"
    >
      {/* Two columns from 640px: who (shop, owner), then how to reach them and the shop's size. */}
      <div className="grid gap-4 sm:grid-cols-2">
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
        <label className="flex flex-col gap-1.5">
          <span className={labelText}>{t.barbers}{optional}</span>
          <span className="relative block">
            <select className={`${field} lead-select`} name="barberCount" defaultValue="">
              <option value="" hidden>{t.barbersPick}</option>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
              <option value="7">{t.barbersMore}</option>
            </select>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lead-chevron">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={labelText}>{t.message}{optional}</span>
        <textarea className={field} name="message" maxLength={1000} rows={2} placeholder={t.messageHint} />
      </label>

      {/* The bot check is dark and invisible unless Cloudflare needs the visitor to act. */}
      {Turnstile && <Turnstile onToken={onToken} lang={locale} />}

      {error && (
        <p ref={errorRef} role="alert" className="lead-notice flex items-start gap-3 px-4 py-3 text-[15px] leading-relaxed text-foreground">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-5 w-5 shrink-0">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.75v5M12 16.25v.01" />
          </svg>
          {error}
        </p>
      )}
      <button
        type="submit"
        className={`lead-send w-full sm:w-auto sm:min-w-52 sm:self-start ${focusRing}`}
        disabled={busy}
        aria-busy={busy}
      >
        <span aria-hidden="true" className="lead-send-glow" />
        <span aria-hidden="true" className="lead-send-shine" />
        {pending ? t.sending : queued ? t.verifying : t.send}
        {busy ? (
          <span aria-hidden="true" className="lead-dots">
            <span />
            <span />
            <span />
          </span>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="lead-send-arrow">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        )}
      </button>
    </form>
  );
}
