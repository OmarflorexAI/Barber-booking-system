"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { BookingEngine } from "@/server/booking-engine";
import { SlotPicker, type Slot } from "@/components/slot-picker";
import { Turnstile } from "@/components/turnstile";
import { ClientShell, PhoneIcon } from "@/components/client-shell";
import { Notice } from "@/components/notice";
import { PayTag } from "@/components/pay-tag";
import { formatPhone } from "@/lib/phone";
import {
  dictionaries,
  formatCutoff,
  formatMoney,
  formatShortDate,
  formatTime,
  type Dictionary,
  type Locale,
} from "@/lib/i18n/dictionaries";
import { createBookingAction } from "./actions";

type Catalog = NonNullable<Awaited<ReturnType<BookingEngine["getShopCatalog"]>>>;
type Barber = Catalog["barbers"][number];
type Step = "service" | "barber" | "time" | "details" | "done";
const STEPS: Step[] = ["service", "barber", "time", "details", "done"];

const intl = (l: Locale) => (l === "es" ? "es-US" : "en-US");
function formatLongDay(iso: string, tz: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(intl(locale), { timeZone: tz, weekday: "long", month: "long", day: "numeric" });
}
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

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
  // A Turnstile token works once: after any answer that keeps the Client here, a fresh widget issues a new one.
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [result, setResult] = useState<{ manageToken: string; barberId: string; startsAt: string; priceCents: number } | null>(null);
  const [profile, setProfile] = useState<Barber | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const errorRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstStep = useRef(true);
  // Bot check is on when a site key is configured; until it issues a token the server would reject the booking.
  const botCheckOn = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const botCheckDone = !botCheckOn || !!turnstileToken;

  // A new step starts at the top, with focus on its heading for screen readers.
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  // An error must be seen where the Client is looking, even on a small, scrolled screen.
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [error]);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const offering = barbers.filter((b) => serviceId && b.services[serviceId]);
  const chosenBarber = barbers.find((b) => b.id === (result?.barberId ?? barberId)) ?? null;
  const serviceName = (s: { nameEn: string; nameEs: string }) => (locale === "es" ? s.nameEs : s.nameEn);
  const price = chosenBarber && serviceId ? chosenBarber.services[serviceId] : null;
  const takingBookings = services.length > 0 && barbers.length > 0;

  function go(to: Step) {
    setError(null);
    setStep(to);
  }

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
        locale,
        turnstileToken: turnstileToken ?? undefined,
      });
      if (r.ok && r.checkoutUrl) {
        window.location.assign(r.checkoutUrl);
        return;
      }
      if (r.ok && payment === "online") {
        // Checkout couldn't start: the manage page has "Pay now" for the rest of the hold.
        router.push(`/m/${r.manageToken}`);
        return;
      }
      if (r.ok) {
        setResult(r);
        setStep("done");
        return;
      }
      setTurnstileToken(null);
      setTurnstileKey((k) => k + 1);
      setError(t.errors[r.code] ?? t.errors.UNKNOWN);
      if (r.code === "PAY_ONLINE_REQUIRED") setPayment("online");
      if (r.code === "SLOT_TAKEN" || r.code === "OUTSIDE_WINDOW") {
        setSlot(null);
        setRefreshKey((k) => k + 1);
        setStep("time");
      }
    });
  }

  const notice = error && (
    <Notice ref={errorRef} role="alert">
      <p>{error}</p>
    </Notice>
  );

  const stepNo = STEPS.indexOf(step) + 1;
  const backTo: Partial<Record<Step, Step>> = { barber: "service", time: "barber", details: "time" };
  const stepTitle: Record<Step, string> = {
    service: t.stepService,
    barber: t.stepBarber,
    time: t.stepTime,
    details: t.stepDetails,
    done: t.booked,
  };

  return (
    <ClientShell locale={locale} t={t} shop={shop} shopNameAs="h1">
      {!takingBookings ? (
        <EmptyNotice text={t.errors.SHOP_UNAVAILABLE} phone={shop.phone} t={t} />
      ) : (
        <>
          <div className="flex min-h-11 items-center gap-2 border-t border-line pt-2">
            {backTo[step] && (
              <button
                type="button"
                onClick={() => go(backTo[step]!)}
                className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full pr-3 pl-2 text-sm font-medium text-ink hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
                {t.back}
              </button>
            )}
            <p className="ml-auto text-sm text-muted" aria-live="polite">
              {t.stepOf(stepNo, STEPS.length, t.stepNames[step])}
            </p>
          </div>

          <div
            key={step}
            className="flex flex-1 flex-col gap-5 pt-3 pb-8 transition-[opacity,translate] duration-200 ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:transition-none"
          >
            {step !== "done" && (
              <h2 ref={headingRef} tabIndex={-1} className="text-2xl leading-tight font-semibold tracking-[-0.02em] outline-none">
                {stepTitle[step]}
              </h2>
            )}

            {step === "service" && (
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {services.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setServiceId(s.id);
                        setBarberId(null);
                        setSlot(null);
                        go("barber");
                      }}
                      className={rowClass}
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="block font-semibold">{serviceName(s)}</span>
                        <span className="block font-mono text-sm text-muted tabular-nums">
                          {s.durationMin} {t.min}
                        </span>
                        {s.specialEndsAt && (
                          <span className="block text-sm text-muted">
                            {t.special} {t.specialUntil} {formatShortDate(s.specialEndsAt, shop.timezone, locale)}
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 flex-col items-end">
                        {s.pricesVary && <span className="block text-xs text-muted">{t.from}</span>}
                        <span className="block font-mono font-medium tabular-nums">{formatMoney(s.fromPriceCents)}</span>
                        {s.specialEndsAt && (
                          <span className="block font-mono text-sm text-muted tabular-nums line-through">{formatMoney(s.regularPriceCents)}</span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {step === "barber" && service && (
              <>
                {offering.length === 0 ? (
                  <div className="flex flex-col items-start gap-3">
                    <p className="text-muted">{t.noBarbersForService}</p>
                    <button type="button" className="btn-ghost" onClick={() => go("service")}>
                      {t.pickAnotherService}
                    </button>
                  </div>
                ) : (
                  <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setBarberId("any");
                          setSlot(null);
                          go("time");
                        }}
                        className={rowClass}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="grid size-12 shrink-0 place-items-center rounded-full border border-line bg-raised text-muted">
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                              <circle cx="9" cy="8" r="3.5" />
                              <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
                              <path d="M15.5 4.6a3.5 3.5 0 0 1 0 6.8M18 14.4c2.1.7 3.5 2.8 3.5 5.6" />
                            </svg>
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <span className="block font-semibold">{t.anyBarber}</span>
                            <span className="block text-sm text-muted">{t.anyBarberHint}</span>
                          </span>
                        </span>
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-muted">
                          <path d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </li>
                    {offering.map((b) => {
                      const p = b.services[service.id];
                      const hasProfile = !!(b.photoUrl || b.bio || b.gallery.length > 0);
                      return (
                        <li key={b.id} className="flex items-stretch">
                          <button
                            type="button"
                            onClick={() => {
                              setBarberId(b.id);
                              setSlot(null);
                              go("time");
                            }}
                            className={`${rowClass} min-w-0 flex-1 ${hasProfile ? "pr-2" : ""}`}
                          >
                            <span className="flex min-w-0 items-center gap-3">
                              <Avatar barber={b} size="size-12" />
                              <span className="flex min-w-0 flex-col">
                                <span className="block truncate font-semibold">{b.displayName}</span>
                                {b.specialties.length > 0 && (
                                  <span className="block truncate text-sm text-muted">{b.specialties.join(" · ")}</span>
                                )}
                              </span>
                            </span>
                            <span className="flex shrink-0 flex-col items-end">
                              <span className="block font-mono font-medium tabular-nums">{formatMoney(p.priceCents)}</span>
                              {p.specialEndsAt && (
                                <span className="block font-mono text-sm text-muted tabular-nums line-through">{formatMoney(p.regularPriceCents)}</span>
                              )}
                            </span>
                          </button>
                          {hasProfile && (
                            <span className="flex shrink-0 items-center pr-3">
                              <button
                                type="button"
                                onClick={() => setProfile(b)}
                                className="inline-flex min-h-11 items-center rounded-full border border-line px-3 text-sm font-medium whitespace-nowrap hover:border-ink/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                              >
                                {b.gallery.length > 0 ? t.seeWork : t.aboutBarber}
                              </button>
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                <BarberSheet
                  barber={profile}
                  t={t}
                  priceCents={profile ? profile.services[service.id]?.priceCents ?? null : null}
                  onClose={() => setProfile(null)}
                  onChoose={(b) => {
                    setProfile(null);
                    setBarberId(b.id);
                    setSlot(null);
                    go("time");
                  }}
                />
              </>
            )}

            {step === "time" && service && barberId && (
              <>
                {notice}
                <p className="-mt-3 text-sm text-muted">
                  {serviceName(service)} · {barberId === "any" ? t.anyBarber : chosenBarber?.displayName} · {t.nyTime}
                </p>
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
                    go("details");
                  }}
                />
              </>
            )}

            {step === "details" && service && barberId && slot && (
              <form
                className="flex flex-1 flex-col gap-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <dl className="divide-y divide-line rounded-2xl border border-line bg-surface text-sm">
                  <SummaryRow label={t.service} value={serviceName(service)} />
                  <SummaryRow label={t.barber} value={barberId === "any" ? t.anyBarber : (chosenBarber?.displayName ?? "")} />
                  <SummaryRow
                    label={t.when}
                    value={
                      <>
                        {formatLongDay(slot.startsAt, shop.timezone, locale)} ·{" "}
                        <span className="font-mono tabular-nums">{formatTime(slot.startsAt, shop.timezone, locale)}</span>
                      </>
                    }
                  />
                  {price && <SummaryRow label={t.total} value={<span className="font-mono font-medium tabular-nums">{formatMoney(price.priceCents)}</span>} />}
                </dl>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">{t.name}</span>
                  <input className="field" name="name" autoComplete="name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">{t.phone}</span>
                  <input
                    className="field font-mono tabular-nums"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <span className="text-sm text-muted">{t.phoneHint}</span>
                </label>

                {shop.onlinePayments ? (
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 text-sm font-medium">{t.payment}</legend>
                    <PayOption checked={payment === "in_person"} onChange={() => setPayment("in_person")} title={t.payInPerson} hint={t.payInPersonHint} icon="shop" />
                    <PayOption checked={payment === "online"} onChange={() => setPayment("online")} title={t.payOnline} hint={t.payOnlineHint} icon="card" />
                  </fieldset>
                ) : (
                  <p className="text-sm">
                    <span className="font-medium">{t.payment}:</span> {t.payInPerson}
                  </p>
                )}

                <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted">
                  <p>{t.refundRule(formatCutoff(shop.cancelCutoffMinutes, locale))}</p>
                  <p>{t.tipsInPerson}</p>
                  <p>{t.smsConsent}</p>
                </div>

                <Turnstile key={turnstileKey} onToken={setTurnstileToken} lang={locale} />

                <div className="sticky bottom-0 -mx-4 mt-auto flex flex-col gap-3 border-t border-line bg-paper px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  {notice}
                  <button type="submit" className="btn-primary w-full" disabled={pending || !botCheckDone}>
                    {pending ? t.booking : !botCheckDone ? t.verifying : payment === "online" ? t.continueToPay : t.confirm}
                  </button>
                </div>
              </form>
            )}

            {step === "done" && result && service && (
              <Confirmation
                t={t}
                headingRef={headingRef}
                shop={shop}
                rows={[
                  [t.service, serviceName(service)],
                  [t.barber, chosenBarber?.displayName ?? ""],
                  [
                    t.when,
                    <>
                      {formatLongDay(result.startsAt, shop.timezone, locale)} ·{" "}
                      <span className="font-mono tabular-nums">{formatTime(result.startsAt, shop.timezone, locale)}</span>
                    </>,
                  ],
                  [
                    t.total,
                    <span key="p" className="flex flex-wrap items-center justify-end gap-2">
                      <span className="font-mono font-medium tabular-nums">{formatMoney(result.priceCents)}</span>
                      <PayTag label={t.manage.payAtShop} />
                    </span>,
                  ],
                ]}
                manageToken={result.manageToken}
                onAgain={() => {
                  setResult(null);
                  setSlot(null);
                  go("service");
                }}
              />
            )}
          </div>
        </>
      )}

    </ClientShell>
  );
}

const rowClass =
  "flex min-h-16 w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink";

function Avatar({ barber, size }: { barber: Barber; size: string }) {
  if (barber.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- photos come from any host the Owner uses
      <img src={barber.photoUrl} alt="" width={96} height={96} loading="lazy" className={`${size} shrink-0 rounded-full border border-line object-cover`} />
    );
  }
  return (
    <span aria-hidden="true" className={`${size} grid shrink-0 place-items-center rounded-full border border-line bg-raised font-semibold text-ink`}>
      {initials(barber.displayName)}
    </span>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right font-medium">{value}</dd>
    </div>
  );
}

function PayOption(props: { checked: boolean; onChange: () => void; title: string; hint: string; icon: "shop" | "card" }) {
  return (
    <label
      className={`flex min-h-16 cursor-pointer items-start gap-3 rounded-2xl border bg-surface px-4 py-3.5 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink ${
        props.checked ? "border-ink" : "border-line hover:border-ink/40"
      }`}
    >
      <input type="radio" name="payment" checked={props.checked} onChange={props.onChange} className="sr-only" />
      <span aria-hidden="true" className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] ${props.checked ? "border-ink" : "border-muted"}`}>
        {props.checked && <span className="size-2.5 rounded-full bg-ink" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold">{props.title}</span>
        <span className="text-sm text-muted">{props.hint}</span>
      </span>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-6 w-6 shrink-0 text-muted">
        {props.icon === "card" ? (
          <>
            <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
            <path d="M2.5 10h19M6 15h4" />
          </>
        ) : (
          <>
            <path d="M3.5 9.5 5 4.5h14l1.5 5" />
            <path d="M3.5 9.5a2.8 2.8 0 0 0 5.6 0 2.8 2.8 0 0 0 5.8 0 2.8 2.8 0 0 0 5.6 0" />
            <path d="M5 12v7.5h14V12M10 19.5v-4h4v4" />
          </>
        )}
      </svg>
    </label>
  );
}

function EmptyNotice({ text, phone, t }: { text: string; phone: string | null; t: Dictionary }) {
  return (
    <section className="flex flex-1 flex-col items-start gap-4 border-t border-line pt-6 pb-8">
      <p className="text-lg">{text}</p>
      {phone && (
        <a href={telHref(phone)} className="btn-primary">
          {t.callShop}
        </a>
      )}
    </section>
  );
}

/** The profile sheet: a real <dialog>, a bottom sheet on phones and a centered dialog on desktop. */
function BarberSheet(props: { barber: Barber | null; t: Dictionary; priceCents: number | null; onClose: () => void; onChoose: (b: Barber) => void }) {
  const { barber: b, t } = props;
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (b && !d.open) d.showModal();
    if (!b && d.open) d.close();
  }, [b]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="barber-sheet-name"
      onClose={props.onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="m-0 mt-auto max-h-[88dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-2xl border border-b-0 border-line bg-surface p-0 text-ink transition-[opacity,translate] duration-200 ease-out backdrop:bg-black/50 starting:translate-y-full starting:opacity-0 motion-reduce:transition-none sm:m-auto sm:max-w-md sm:rounded-2xl sm:border-b sm:starting:translate-y-3"
    >
      {b && (
        <div className="flex flex-col gap-5 px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-6">
          <div aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-line sm:hidden" />
          <div className="flex items-start gap-4">
            <Avatar barber={b} size="size-20 text-2xl" />
            <div className="min-w-0 flex-1 pt-1">
              <h2 id="barber-sheet-name" className="text-xl leading-tight font-semibold tracking-[-0.015em]">
                {b.displayName}
              </h2>
              {b.specialties.length > 0 && <p className="mt-1 text-sm text-muted">{b.specialties.join(" · ")}</p>}
            </div>
            <button
              type="button"
              aria-label={t.close}
              onClick={() => ref.current?.close()}
              className="-mt-1 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-5 w-5">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          {b.bio && <p className="leading-relaxed">{b.bio}</p>}
          {b.gallery.length > 0 && (
            <ul className="grid grid-cols-3 gap-2">
              {b.gallery.slice(0, 6).map((url, i) => (
                <li key={url}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- gallery photos from the Barber's own host */}
                  <img src={url} alt={t.workPhoto(b.displayName, i + 1)} width={240} height={240} loading="lazy" className="aspect-square w-full rounded-md bg-raised object-cover" />
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="btn-primary w-full" onClick={() => props.onChoose(b)}>
            {t.bookWith(b.displayName)}
            {props.priceCents !== null && <span className="font-mono tabular-nums opacity-80">· {formatMoney(props.priceCents)}</span>}
          </button>
        </div>
      )}
    </dialog>
  );
}

function Confirmation(props: {
  t: Dictionary;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  shop: Catalog["shop"];
  rows: [string, React.ReactNode][];
  manageToken: string;
  onAgain: () => void;
}) {
  const { t, shop, headingRef, rows, manageToken, onAgain } = props;
  const [copied, setCopied] = useState(false);
  const path = `/m/${manageToken}`;
  const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`;

  return (
    <section className="flex flex-col gap-5" aria-live="polite">
      <div className="flex flex-col items-start gap-3">
        {/* The booked check: the one red mark on this page (the Live Signal rule). */}
        <svg aria-hidden="true" viewBox="0 0 48 48" fill="none" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 text-red">
          <circle cx="24" cy="24" r="22" fill="currentColor" />
          <path d="M14.5 24.5l6.5 6.5 12.5-13" stroke="white" strokeWidth="3" />
        </svg>
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl leading-tight font-semibold tracking-[-0.02em] outline-none">
          {t.booked}
        </h2>
      </div>

      <dl className="divide-y divide-line rounded-2xl border border-line bg-surface text-sm">
        {rows.map(([label, value]) => (
          <SummaryRow key={label} label={label} value={value} />
        ))}
        {(shop.address || shop.phone) && (
          <SummaryRow
            label={shop.name}
            value={
              <>
                {shop.address && <span className="block">{shop.address}</span>}
                {shop.phone && (
                  <a
                    href={telHref(shop.phone)}
                    className="-mr-1 inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 font-mono tabular-nums underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    <PhoneIcon />
                    {formatPhone(shop.phone)}
                  </a>
                )}
              </>
            }
          />
        )}
      </dl>

      <div className="flex flex-col gap-3">
        {!shop.smsEnabled && <p className="text-sm text-muted">{t.smsPending}</p>}
        <p className="text-sm">{t.saveLink}</p>
        <a href={path} className="btn-primary w-full">
          {t.manageBooking}
        </a>
        <div className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pr-1 pl-4">
          <span className="min-w-0 flex-1 truncate font-mono text-sm text-muted">{url}</span>
          <button
            type="button"
            className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-raised px-4 text-sm font-medium hover:bg-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            onClick={() => {
              navigator.clipboard?.writeText(url).then(() => setCopied(true));
            }}
          >
            <span aria-live="polite">{copied ? t.copied : t.copy}</span>
          </button>
        </div>
      </div>

      <button type="button" className="btn-ghost self-start" onClick={onAgain}>
        {t.bookAnother}
      </button>
    </section>
  );
}
