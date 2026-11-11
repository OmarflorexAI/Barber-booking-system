"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Turnstile } from "@/components/turnstile";
import type { Locale } from "@/lib/i18n/dictionaries";
import { landingDictionaries } from "@/lib/i18n/landing";
import { submitLeadAction } from "./actions";

/** Dark inputs for the landing page: charcoal well, warm white text, a clear blue focus ring. */
const field =
  "min-h-12 w-full rounded-md border border-night-line bg-night px-3.5 font-mono text-[15px] text-night-ink outline-none transition-colors placeholder:text-night-muted hover:border-night-muted/50 focus-visible:border-pole-blue focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-0 focus-visible:outline-pole-blue";
const labelText = "text-sm font-medium tracking-[-0.01em] text-night-ink";

/** "Get your free month": a Shop Owner leaves their details and we call them back. */
export function LeadForm({ locale }: { locale: Locale }) {
  const t = landingDictionaries[locale];
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const errorRef = useRef<HTMLParagraphElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const botCheckOn = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const botCheckDone = !botCheckOn || !!token;

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [error]);
  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  if (done) {
    return (
      <div
        ref={doneRef}
        tabIndex={-1}
        role="status"
        className="rounded-md border border-night-line bg-night px-5 py-7 outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-night-ink"
      >
        <p className="flex items-center gap-2.5 text-xl font-semibold tracking-[-0.03em] text-night-ink">
          <span aria-hidden className="h-[7px] w-3.5 rounded-full bg-pole-blue" />
          {t.thanksTitle}
        </p>
        <p className="mt-2 font-mono text-[15px] leading-[1.65] text-night-muted">{t.thanksBody}</p>
      </div>
    );
  }

  function submit(form: FormData) {
    setError(null);
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
        turnstileToken: token ?? undefined,
      });
      if (r.ok) setDone(true);
      else setError(t.errors[r.code] ?? t.errors.UNKNOWN);
    });
  }

  const optional = <span className="font-mono text-[13px] font-normal text-night-muted"> ({t.optional})</span>;

  return (
    <form action={submit} className="flex flex-col gap-5">
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
          <select className={field} name="barberCount" defaultValue="">
            <option value="">{t.barbersPick}</option>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
            <option value="7">{t.barbersMore}</option>
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={labelText}>{t.message}{optional}</span>
        <textarea className={`${field} min-h-24 resize-y py-3 leading-[1.5]`} name="message" maxLength={1000} rows={3} placeholder={t.messageHint} />
      </label>

      {/* The bot check draws a light widget; Turnstile keeps a 65px slot for it so the form doesn't jump. */}
      <Turnstile onToken={setToken} lang={locale} />

      {error && (
        <p ref={errorRef} role="alert" className="rounded-md border border-pole-red/40 border-l-2 border-l-pole-red bg-pole-red/10 px-4 py-3 font-mono text-sm leading-[1.6] text-night-ink">
          {error}
        </p>
      )}
      <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-night-ink px-6 font-mono text-[15px] text-night transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-night-ink disabled:cursor-not-allowed disabled:bg-night-raised disabled:text-night-muted" disabled={pending || !botCheckDone}>
        {pending ? t.sending : botCheckDone ? t.send : t.verifying}
      </button>
    </form>
  );
}
