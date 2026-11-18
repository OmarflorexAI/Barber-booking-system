"use client";

import { useActionState, useEffect, useState, type ComponentType } from "react";
import type { Turnstile as TurnstileWidget } from "@/components/turnstile";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { createMyShop, type SetupField, type SetupState } from "./actions";

const focusRing = "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-foreground";
const labelText = "text-sm font-medium text-foreground";
const help = "text-[13px] leading-relaxed text-muted-foreground";

/** One screen: the Shop's name, the Owner's name, phone, address and a haircut price. */
export function SetupForm({ locale, defaultName, email }: { locale: Locale; defaultName: string; email: string }) {
  const t = dictionaries[locale].setup;
  const [state, action, pending] = useActionState<SetupState, FormData>(createMyShop, { status: "idle" });
  const [token, setToken] = useState<string | null>(null);
  const [Turnstile, setTurnstile] = useState<ComponentType<React.ComponentProps<typeof TurnstileWidget>> | null>(null);
  useEffect(() => {
    let live = true;
    import("@/components/turnstile").then((m) => live && setTurnstile(() => m.Turnstile));
    return () => {
      live = false;
    };
  }, []);

  const typed = (f: SetupField) => state.values?.[f];
  const wrong = (f: SetupField) => (state.status === "error" && state.field === f ? true : undefined);
  const optional = <span className="text-[13px] font-normal text-muted-foreground"> ({locale === "es" ? "opcional" : "optional"})</span>;

  return (
    <div className="lead-card relative rounded-2xl p-6 sm:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-balance text-[1.875rem] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-4xl">{t.title}</h1>
        <p className="text-base leading-relaxed text-muted-foreground">{t.hint}</p>
        <p className={help}>{t.signedInAs(email)}</p>
      </div>

      <form action={action} className="mt-8 flex flex-col gap-5">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="turnstileToken" value={token ?? ""} />
        <label className="flex flex-col gap-1.5">
          <span className={labelText}>{t.shopName}</span>
          <input className="lead-field" name="shopName" required maxLength={80} autoComplete="organization" placeholder={t.shopNamePlaceholder} defaultValue={typed("shopName")} aria-invalid={wrong("shopName")} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelText}>{t.ownerName}</span>
          <input className="lead-field" name="ownerName" required maxLength={60} autoComplete="name" defaultValue={typed("ownerName") ?? defaultName} aria-invalid={wrong("ownerName")} aria-describedby="owner-help" />
          <span id="owner-help" className={help}>{t.ownerNameHelp}</span>
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={labelText}>{t.phone}</span>
            <input className="lead-field" name="phone" type="tel" inputMode="tel" required maxLength={25} autoComplete="tel" placeholder="(718) 555-0123" defaultValue={typed("phone")} aria-invalid={wrong("phone")} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelText}>{t.price}</span>
            <span className="relative block">
              <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-mono text-[16px] text-muted-foreground">$</span>
              <input className="lead-field w-full !pl-8 font-mono" name="price" inputMode="decimal" required maxLength={8} placeholder="25" defaultValue={typed("price")} aria-invalid={wrong("price")} aria-describedby="price-help" />
            </span>
          </label>
        </div>
        <p id="price-help" className={`-mt-2 ${help}`}>{t.priceHelp}</p>
        <label className="flex flex-col gap-1.5">
          <span className={labelText}>
            {t.address}
            {optional}
          </span>
          <input className="lead-field" name="address" maxLength={200} autoComplete="street-address" placeholder="1234 Grand Concourse, Bronx, NY" defaultValue={typed("address")} />
        </label>

        {Turnstile && <Turnstile onToken={setToken} lang={locale} />}
        {state.status === "error" && (
          <p role="alert" className="lead-notice flex items-start gap-3 px-4 py-3 text-[15px] leading-relaxed text-foreground">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-5 w-5 shrink-0">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.75v5M12 16.25v.01" />
            </svg>
            {t.errors[state.code ?? "UNKNOWN"] ?? t.errors.UNKNOWN}
          </p>
        )}
        <button
          className={`inline-flex min-h-12 w-full items-center justify-center whitespace-nowrap rounded-full bg-white px-5 text-sm font-medium text-black transition-colors duration-200 hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
          disabled={pending}
          aria-busy={pending}
        >
          {t.submit}
        </button>
      </form>
    </div>
  );
}
