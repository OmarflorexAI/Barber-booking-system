"use client";

import { useState, useTransition } from "react";
import type { BookingEngine } from "@/server/booking-engine";
import { SlotPicker, type Slot } from "@/components/slot-picker";
import { Turnstile } from "@/components/turnstile";
import { LanguageToggle } from "@/components/language-toggle";
import {
  dictionaries,
  formatCutoff,
  formatDateTime,
  formatMoney,
  formatShortDate,
  type Locale,
} from "@/lib/i18n/dictionaries";
import { createBookingAction } from "./actions";

type Catalog = NonNullable<Awaited<ReturnType<BookingEngine["getShopCatalog"]>>>;
type Step = "service" | "barber" | "time" | "details" | "done";

export function BookingFlow({ catalog, locale }: { catalog: Catalog; locale: Locale }) {
  const t = dictionaries[locale];
  const { shop, services, barbers } = catalog;

  const [step, setStep] = useState<Step>("service");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | "any" | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [payment, setPayment] = useState<"in_person" | "online">("in_person");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [result, setResult] = useState<{ manageToken: string; barberId: string; startsAt: string; priceCents: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const service = services.find((s) => s.id === serviceId) ?? null;
  const offering = barbers.filter((b) => serviceId && b.services[serviceId]);
  const chosenBarber = barbers.find((b) => b.id === (result?.barberId ?? barberId)) ?? null;
  const serviceName = (s: { nameEn: string; nameEs: string }) => (locale === "es" ? s.nameEs : s.nameEn);
  const price = chosenBarber && serviceId ? chosenBarber.services[serviceId] : null;

  function submit() {
    if (!serviceId || !barberId || !slot) return;
    setError(null);
    startTransition(async () => {
      const r = await createBookingAction({
        shopId: shop.id,
        serviceId,
        barberId,
        startsAt: slot.startsAt,
        name,
        phone,
        paymentMethod: payment,
        turnstileToken: turnstileToken ?? undefined,
      });
      if (r.ok) {
        setResult(r);
        setStep("done");
        return;
      }
      setError(t.errors[r.code] ?? t.errors.UNKNOWN);
      if (r.code === "SLOT_TAKEN" || r.code === "OUTSIDE_WINDOW") {
        setSlot(null);
        setRefreshKey((k) => k + 1);
        setStep("time");
      }
    });
  }

  const back = (to: Step) => (
    <button type="button" onClick={() => { setError(null); setStep(to); }} className="self-start text-sm text-muted underline-offset-4 hover:underline">
      ← {t.back}
    </button>
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-4 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{shop.name}</h1>
          {shop.address && <p className="text-sm text-muted">{shop.address}</p>}
        </div>
        <LanguageToggle locale={locale} label={t.otherLang} />
      </header>

      {error && step !== "done" && (
        <p role="alert" className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">
          {error}
        </p>
      )}

      {step === "service" && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">{t.stepService}</h2>
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setServiceId(s.id);
                setBarberId(null);
                setSlot(null);
                setStep("barber");
              }}
              className="card flex items-center justify-between gap-4 p-4 text-left hover:border-ink/40"
            >
              <span>
                <span className="block font-medium">{serviceName(s)}</span>
                <span className="text-sm text-muted">
                  {s.durationMin} {t.min}
                </span>
                {s.specialEndsAt && (
                  <span className="mt-1 block w-fit rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                    {t.special} {t.specialUntil} {formatShortDate(s.specialEndsAt, shop.timezone, locale)}
                  </span>
                )}
              </span>
              <span className="text-right">
                {s.pricesVary && <span className="block text-xs text-muted">{t.from}</span>}
                {s.specialEndsAt && <span className="block text-xs text-muted line-through">{formatMoney(s.regularPriceCents)}</span>}
                <span className="font-semibold">{formatMoney(s.fromPriceCents)}</span>
              </span>
            </button>
          ))}
        </section>
      )}

      {step === "barber" && service && (
        <section className="flex flex-col gap-3">
          {back("service")}
          <h2 className="text-lg font-medium">{t.stepBarber}</h2>
          <button
            type="button"
            onClick={() => {
              setBarberId("any");
              setSlot(null);
              setStep("time");
            }}
            className="card flex flex-col p-4 text-left hover:border-ink/40"
          >
            <span className="font-medium">{t.anyBarber}</span>
            <span className="text-sm text-muted">{t.anyBarberHint}</span>
          </button>
          {offering.map((b) => {
            const p = b.services[service.id];
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setBarberId(b.id);
                  setSlot(null);
                  setStep("time");
                }}
                className="card flex flex-col gap-3 p-4 text-left hover:border-ink/40"
              >
                <span className="flex items-center gap-3">
                  {b.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- photos come from any host the Owner uses
                    <img src={b.photoUrl} alt="" className="size-14 rounded-full object-cover" />
                  ) : (
                    <span className="grid size-14 place-items-center rounded-full bg-paper text-lg font-semibold">
                      {b.displayName.slice(0, 1)}
                    </span>
                  )}
                  <span className="flex-1">
                    <span className="block font-medium">{b.displayName}</span>
                    {b.specialties.length > 0 && (
                      <span className="text-sm text-muted">{b.specialties.join(" · ")}</span>
                    )}
                  </span>
                  <span className="font-semibold">{formatMoney(p.priceCents)}</span>
                </span>
                {b.bio && <span className="text-sm text-muted">{b.bio}</span>}
                {b.gallery.length > 0 && (
                  <span className="-mx-4 flex gap-2 overflow-x-auto px-4">
                    {b.gallery.slice(0, 6).map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element -- gallery photos from the Barber's own host
                      <img key={url} src={url} alt="" loading="lazy" className="size-24 shrink-0 rounded-lg object-cover" />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </section>
      )}

      {step === "time" && service && barberId && (
        <section className="flex flex-col gap-3">
          {back("barber")}
          <h2 className="text-lg font-medium">{t.stepTime}</h2>
          <SlotPicker
            shopId={shop.id}
            serviceId={service.id}
            barberId={barberId}
            timezone={shop.timezone}
            locale={locale}
            selected={slot?.startsAt ?? null}
            refreshKey={refreshKey}
            onPick={(s) => {
              setSlot(s);
              setError(null);
              setStep("details");
            }}
          />
        </section>
      )}

      {step === "details" && service && barberId && slot && (
        <section className="flex flex-col gap-4">
          {back("time")}
          <h2 className="text-lg font-medium">{t.stepDetails}</h2>

          <div className="card p-4 text-sm">
            <p className="font-medium">
              {serviceName(service)} · {barberId === "any" ? t.anyBarber : barbers.find((b) => b.id === barberId)?.displayName}
            </p>
            <p className="text-muted">{formatDateTime(slot.startsAt, shop.timezone, locale)}</p>
            {price && (
              <p className="mt-1">
                {t.total}: <span className="font-semibold">{formatMoney(price.priceCents)}</span>
              </p>
            )}
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">{t.name}</span>
              <input className="field" name="name" autoComplete="name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">{t.phone}</span>
              <input
                className="field"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <span className="text-xs text-muted">{t.phoneHint}</span>
            </label>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">{t.payment}</legend>
              <label className="card flex min-h-12 items-center gap-3 px-4">
                <input type="radio" name="payment" checked={payment === "in_person"} onChange={() => setPayment("in_person")} />
                {t.payInPerson}
              </label>
              {shop.onlinePayments && (
                <label className="card flex min-h-12 items-center gap-3 px-4">
                  <input type="radio" name="payment" checked={payment === "online"} onChange={() => setPayment("online")} />
                  {t.payOnline}
                </label>
              )}
              <p className="text-xs text-muted">{t.tipsInPerson}</p>
            </fieldset>

            <p className="text-xs text-muted">{t.refundRule(formatCutoff(shop.cancelCutoffMinutes, locale))}</p>
            <p className="text-xs text-muted">{t.smsConsent}</p>

            <Turnstile onToken={setTurnstileToken} lang={locale} />

            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? t.booking : t.confirm}
            </button>
          </form>
        </section>
      )}

      {step === "done" && result && service && (
        <Confirmation
          locale={locale}
          title={t.booked}
          lines={[
            `${serviceName(service)} ${t.bookedWith} ${chosenBarber?.displayName ?? ""}`,
            formatDateTime(result.startsAt, shop.timezone, locale),
            formatMoney(result.priceCents),
          ]}
          manageToken={result.manageToken}
          onAgain={() => {
            setResult(null);
            setSlot(null);
            setStep("service");
          }}
        />
      )}
    </main>
  );
}

function Confirmation(props: { locale: Locale; title: string; lines: string[]; manageToken: string; onAgain: () => void }) {
  const t = dictionaries[props.locale];
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? `/m/${props.manageToken}` : `${window.location.origin}/m/${props.manageToken}`;

  return (
    <section className="flex flex-col gap-4" aria-live="polite">
      <div className="rounded-2xl bg-ok-soft p-5">
        <h2 className="text-xl font-semibold text-ok">{props.title}</h2>
        {props.lines.map((l) => (
          <p key={l} className="mt-1">
            {l}
          </p>
        ))}
      </div>
      <div className="card flex flex-col gap-3 p-4">
        <p className="text-sm">{t.saveLink}</p>
        <a href={url} className="break-all text-sm font-medium text-accent underline">
          {url}
        </a>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            navigator.clipboard?.writeText(url).then(() => setCopied(true));
          }}
        >
          {copied ? t.copied : t.copy}
        </button>
        <p className="text-xs text-muted">{t.smsPending}</p>
      </div>
      <button type="button" className="text-sm text-muted underline" onClick={props.onAgain}>
        {t.bookAnother}
      </button>
    </section>
  );
}
