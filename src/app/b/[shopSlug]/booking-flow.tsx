"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import type { BookingEngine } from "@/server/booking-engine";
import { SlotPicker, type Slot } from "@/components/slot-picker";
import { Turnstile } from "@/components/turnstile";
import { ClientShell, PhoneIcon } from "@/components/client-shell";
import { Notice } from "@/components/notice";
import { PayTag } from "@/components/pay-tag";
import { formatPhone } from "@/lib/phone";
import { dictionaries, formatCutoff, formatMoney, formatShortDate, formatTime, type Dictionary, type Locale } from "@/lib/i18n/dictionaries";
import { createBookingAction } from "./actions";

type Catalog = NonNullable<Awaited<ReturnType<BookingEngine["getShopCatalog"]>>>;
type Barber = Catalog["barbers"][number];
type Step = "service" | "barber" | "time" | "details" | "done";
const STEPS: Step[] = ["service", "barber", "time", "details", "done"];

const intl = (l: Locale) => (l === "es" ? "es-US" : "en-US");
function formatLongDay(iso: string, tz: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(intl(locale), {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
function formatDayShort(iso: string, tz: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(intl(locale), {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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
/** The bio in the Client's language, else the one the Barber wrote (Q35: no auto-translation). */
function bioFor(b: Barber, locale: Locale) {
  const [mine, other] = locale === "es" ? [b.bioEs, b.bio] : [b.bio, b.bioEs];
  return mine.trim() || other.trim();
}

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
/** A ruled row inside one .c-card (the recipe in globals.css → "Client pages (premium)"). */
const rowClass = "c-row press w-full justify-between gap-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink";

/**
 * `header` is the Shop's front (cover, logo, about), rendered on the server. It leads the
 * first screen; from step 2 on the compact name/address/phone line takes its place.
 * Each step slides in from the side it comes from (.c-step, transform/opacity only); from
 * step 2 a glass dock pinned to the bottom (.c-dock) carries what is chosen so far, and on
 * the details step the one primary button.
 */
export function BookingFlow({ catalog, locale, header, fromSite = false }: { catalog: Catalog; locale: Locale; header?: React.ReactNode; fromSite?: boolean }) {
  const t = dictionaries[locale];
  const { shop, services, barbers } = catalog;

  const [step, setStep] = useState<Step>("service");
  // 1 = forward (the new step comes in from the right), -1 = back.
  const [dir, setDir] = useState<1 | -1>(1);
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
  const [result, setResult] = useState<{
    manageToken: string;
    barberId: string;
    startsAt: string;
    priceCents: number;
  } | null>(null);
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
    setDir(STEPS.indexOf(to) < STEPS.indexOf(step) ? -1 : 1);
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
        setDir(1);
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
        setDir(-1);
        setStep("time");
      }
    });
  }

  const notice = error && (
    <Notice ref={errorRef} role="alert">
      <p>{error}</p>
    </Notice>
  );

  const showFront = !!header && (step === "service" || !takingBookings);
  const stepNo = STEPS.indexOf(step) + 1;
  const backTo: Partial<Record<Step, Step>> = {
    barber: "service",
    time: "barber",
    details: "time",
  };
  const stepTitle: Record<Step, string> = {
    service: t.stepService,
    barber: t.stepBarber,
    time: t.stepTime,
    details: t.stepDetails,
    done: t.booked,
  };

  // What the dock shows: the choices made so far, and the best-known price.
  const barberLabel = barberId === "any" ? t.anyBarber : (chosenBarber?.displayName ?? null);
  const dockMeta = [
    step !== "barber" ? barberLabel : null,
    slot && (step === "time" || step === "details")
      ? `${formatDayShort(slot.startsAt, shop.timezone, locale)} · ${formatTime(slot.startsAt, shop.timezone, locale)}`
      : null,
  ].filter(Boolean) as string[];
  const dockPrice = price ? { from: false, cents: price.priceCents } : service ? { from: service.pricesVary, cents: service.fromPriceCents } : null;
  const dock = service && (
    <Dock
      t={t}
      title={serviceName(service)}
      meta={dockMeta}
      price={dockPrice}
      avatar={step !== "barber" && chosenBarber && barberId !== "any" ? chosenBarber : null}
    />
  );

  return (
    <ClientShell locale={locale} t={t} shop={showFront ? null : shop} shopNameAs="h1" backHref={fromSite ? (locale === "es" ? "/es" : "/") : undefined}>
      {showFront && header}
      {!takingBookings ? (
        <EmptyNotice text={t.errors.SHOP_UNAVAILABLE} phone={shop.phone} t={t} />
      ) : (
        <>
          <div className="flex flex-col gap-2.5 border-t border-line pt-3 lg:flex-row lg:items-center lg:gap-6">
            <div className="flex min-h-11 items-center gap-2 lg:flex-1">
              {backTo[step] && (
                <button
                  type="button"
                  onClick={() => go(backTo[step]!)}
                  className={`press -ml-2.5 inline-flex min-h-11 items-center gap-1 rounded-full pr-3.5 pl-2 text-sm font-medium text-ink hover:bg-raised ${focusRing}`}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M15 5l-7 7 7 7" />
                  </svg>
                  {t.back}
                </button>
              )}
              <p className="ml-auto text-sm font-medium text-muted" aria-live="polite">
                {t.stepOf(stepNo, STEPS.length, t.stepNames[step])}
              </p>
            </div>
            {/* Page-control steps: done dots solid, the current step an ink capsule, the rest faint (CSS: .c-pager). */}
            <div
              role="progressbar"
              aria-label={t.stepOf(stepNo, STEPS.length, t.stepNames[step])}
              aria-valuemin={1}
              aria-valuemax={STEPS.length}
              aria-valuenow={stepNo}
              aria-valuetext={t.stepOf(stepNo, STEPS.length, t.stepNames[step])}
              className="flex justify-center py-1.5 lg:shrink-0"
            >
              <span className="c-pager" style={{ "--i": stepNo - 1 } as React.CSSProperties}>
                {STEPS.map((s, i) => (
                  <span
                    key={s}
                    className={`c-pager-dot ${i < stepNo - 1 ? "is-done" : ""} ${i === stepNo - 1 ? "is-now" : ""}`}
                    style={{ "--j": i, "--after": i > stepNo - 1 ? 1 : 0 } as React.CSSProperties}
                  />
                ))}
                <span className="c-pager-cap">
                  <span key={step} className="c-pager-cap-in" />
                </span>
              </span>
            </div>
          </div>

          <div key={step} className="c-step flex flex-1 flex-col gap-6 pt-6 pb-6 lg:gap-5 lg:pt-7" style={{ "--dir": dir } as React.CSSProperties}>
            {step !== "done" && (
              <h2 ref={headingRef} tabIndex={-1} className="c-h2 outline-none">
                {stepTitle[step]}
              </h2>
            )}

            {step === "service" && (
              <ul className="c-card divide-y divide-line overflow-hidden">
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
                      className={`${rowClass} min-h-[4.5rem]! lg:min-h-16!`}
                    >
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="block leading-snug font-semibold">{serviceName(s)}</span>
                        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted">
                          <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                            <ClockIcon />
                            {s.durationMin} {t.min}
                          </span>
                          {s.specialEndsAt && (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="rounded-full border border-line px-2 py-px text-xs font-medium text-ink">{t.special}</span>
                              {t.specialUntil} {formatShortDate(s.specialEndsAt, shop.timezone, locale)}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="flex flex-col items-end">
                          {s.pricesVary && <span className="block text-xs text-muted">{t.from}</span>}
                          <span className="block font-mono text-[1.0625rem] font-medium tabular-nums">{formatMoney(s.fromPriceCents)}</span>
                          {s.specialEndsAt && (
                            <span className="block font-mono text-sm text-muted tabular-nums line-through">{formatMoney(s.regularPriceCents)}</span>
                          )}
                        </span>
                        <Chevron />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {step === "barber" && service && (
              <>
                {offering.length === 0 ? (
                  <div className="c-card flex flex-col items-start gap-4 p-5">
                    <p>{t.noBarbersForService}</p>
                    <button type="button" className={`c-btn c-btn-secondary press ${focusRing}`} onClick={() => go("service")}>
                      {t.pickAnotherService}
                    </button>
                  </div>
                ) : (
                  // Separators start at the names, past the faces (iOS inset rows).
                  <ul className="c-card divide-y divide-line overflow-hidden [--sep:5.375rem] lg:[--sep:4.875rem]">
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setBarberId("any");
                          setSlot(null);
                          go("time");
                        }}
                        className={`${rowClass} min-h-[4.75rem]! lg:min-h-[4.25rem]! lg:py-2.5!`}
                      >
                        <span className="flex min-w-0 items-center gap-3.5">
                          <span className="c-avatar c-avatar-any size-14 lg:size-12">
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-6 w-6"
                            >
                              <circle cx="9" cy="8" r="3.5" />
                              <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
                              <path d="M15.5 4.6a3.5 3.5 0 0 1 0 6.8M18 14.4c2.1.7 3.5 2.8 3.5 5.6" />
                            </svg>
                          </span>
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="block font-semibold tracking-[-0.01em]">{t.anyBarber}</span>
                            <span className="block text-sm text-muted">{t.anyBarberHint}</span>
                          </span>
                        </span>
                        <Chevron />
                      </button>
                    </li>
                    {offering.map((b) => {
                      const p = b.services[service.id];
                      const hasProfile = !!(b.photoUrl || bioFor(b, locale) || b.instagram || b.gallery.length > 0);
                      return (
                        <li key={b.id} className="flex items-stretch">
                          <button
                            type="button"
                            onClick={() => {
                              setBarberId(b.id);
                              setSlot(null);
                              go("time");
                            }}
                            className={`${rowClass} min-h-[4.75rem]! lg:min-h-[4.25rem]! lg:py-2.5! min-w-0 flex-1 ${hasProfile ? "pr-2!" : ""}`}
                          >
                            <span className="flex min-w-0 items-center gap-3.5">
                              <Avatar barber={b} size="size-14 lg:size-12" />
                              <span className="flex min-w-0 flex-col gap-0.5">
                                <span className="block truncate font-semibold tracking-[-0.01em]">{b.displayName}</span>
                                {b.specialties.length > 0 && <span className="block truncate text-sm text-muted">{b.specialties.join(" · ")}</span>}
                              </span>
                            </span>
                            <span className="flex shrink-0 flex-col items-end">
                              <span className="c-price block">{formatMoney(p.priceCents)}</span>
                              {p.specialEndsAt && (
                                <span className="block text-sm text-muted tabular-nums line-through">{formatMoney(p.regularPriceCents)}</span>
                              )}
                            </span>
                          </button>
                          {hasProfile && (
                            <span className="flex shrink-0 items-center pr-3 pl-1">
                              <button
                                type="button"
                                onClick={() => setProfile(b)}
                                className={`c-chip c-chip-quiet press px-3.5! text-sm font-medium whitespace-nowrap ${focusRing}`}
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
                  locale={locale}
                  priceCents={profile ? (profile.services[service.id]?.priceCents ?? null) : null}
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
                <div>
                  <SlotPicker
                    calendar
                    duration={`${service.durationMin} ${t.min}`}
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
                </div>
              </>
            )}

            {step === "details" && service && barberId && slot && (
              <form
                className="relative flex flex-1 flex-col gap-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <dl className="c-card c-in divide-y divide-line text-sm" style={{ "--i": 0 } as React.CSSProperties}>
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

                <div className="c-in flex flex-col gap-4" style={{ "--i": 1 } as React.CSSProperties}>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">{t.name}</span>
                    <input className="c-field" name="name" autoComplete="name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">{t.phone}</span>
                    <input
                      className="c-field font-mono tabular-nums"
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
                </div>

                {shop.onlinePayments ? (
                  <fieldset className="c-in flex flex-col" style={{ "--i": 2 } as React.CSSProperties}>
                    <legend className="mb-2 text-sm font-medium">{t.payment}</legend>
                    <div className="flex flex-col gap-3">
                      <PayOption
                        checked={payment === "in_person"}
                        onChange={() => setPayment("in_person")}
                        title={t.payInPerson}
                        hint={t.payInPersonHint}
                        icon="shop"
                      />
                      <PayOption checked={payment === "online"} onChange={() => setPayment("online")} title={t.payOnline} hint={t.payOnlineHint} icon="card" />
                    </div>
                  </fieldset>
                ) : (
                  <div className="c-card c-in flex items-center gap-3 px-4 py-3.5 text-sm" style={{ "--i": 2 } as React.CSSProperties}>
                    <span className="c-tile">
                      <ShopIcon className="h-5 w-5" />
                    </span>
                    <p>
                      <span className="font-medium">{t.payment}:</span> {t.payInPerson}
                    </p>
                  </div>
                )}

                <ul className="c-in flex flex-col gap-2.5 text-sm leading-relaxed text-muted" style={{ "--i": 3 } as React.CSSProperties}>
                  <FinePrint icon="refund">{t.refundRule(formatCutoff(shop.cancelCutoffMinutes, locale))}</FinePrint>
                  <FinePrint icon="tip">{t.tipsInPerson}</FinePrint>
                  <FinePrint icon="text">{t.smsConsent}</FinePrint>
                </ul>

                <Turnstile key={turnstileKey} onToken={setTurnstileToken} lang={locale} />

                <RevealDock
                  t={t}
                  title={serviceName(service)}
                  meta={dockMeta}
                  price={dockPrice}
                  avatar={chosenBarber && barberId !== "any" ? chosenBarber : null}
                  compact
                  force={!!error || pending}
                >
                  {notice}
                  <button
                    type="submit"
                    className={`c-btn c-btn-primary press w-full ${focusRing}`}
                    disabled={pending || !botCheckDone}
                    aria-busy={pending || undefined}
                  >
                    <span className="c-btn-label">
                      {pending ? t.booking : !botCheckDone ? t.verifying : payment === "online" ? t.continueToPay : t.confirm}
                    </span>
                    <span aria-hidden="true" className="c-spin" />
                  </button>
                </RevealDock>
              </form>
            )}

            {step === "done" && result && service && (
              <Confirmation
                t={t}
                headingRef={headingRef}
                shop={shop}
                barber={chosenBarber}
                serviceName={serviceName(service)}
                rows={[
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
                startsAt={result.startsAt}
                durationMin={service.durationMin}
                onAgain={() => {
                  setResult(null);
                  setSlot(null);
                  go("service");
                }}
              />
            )}
          </div>

          {(step === "barber" || step === "time") && dock}
        </>
      )}
    </ClientShell>
  );
}

/**
 * The glass dock pinned to the bottom of the screen (above the phone's home bar): the Service,
 * the Barber's face, the other choices so far and the price; `children` (the primary button
 * and its notice) go under it. `compact` (the details step, whose summary card already says
 * all of it) drops the summary line so the dock covers as little of the form as possible. It sits last in its column, so `mt-auto` keeps it low on a
 * short step and `sticky` keeps it in thumb reach on a long one.
 */
type DockProps = {
  t: Dictionary;
  title: string;
  meta: string[];
  price: { from: boolean; cents: number } | null;
  avatar: Barber | null;
  compact?: boolean;
  /** Set (by RevealDock): true while hidden below, false once shown. */
  concealed?: boolean;
  ref?: React.Ref<HTMLDivElement>;
  children?: React.ReactNode;
};
function Dock({ ref, ...props }: DockProps) {
  const { t, price } = props;
  const reveal = props.concealed === undefined ? "" : `c-dock-reveal ${props.concealed ? "is-concealed" : ""}`;
  return (
    <div
      ref={ref}
      tabIndex={props.concealed === undefined ? undefined : -1}
      role="group"
      aria-label={t.yourBooking}
      inert={props.concealed || undefined}
      aria-hidden={props.concealed || undefined}
      className={`c-dock sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 mt-auto flex flex-col gap-3 ${reveal} ${props.compact ? "c-dock-bare rounded-[2rem] p-1.5" : "rounded-[1.75rem] p-3 md:static"}`}
    >
      {!props.compact && (
        <div className="flex min-h-12 items-center gap-3 pr-2 pl-1">
          {props.avatar ? (
            <Avatar barber={props.avatar} size="size-10 text-sm" />
          ) : (
            <span aria-hidden="true" className="c-avatar c-avatar-any size-10">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M4 7a2 2 0 0 1 2-2h8.2a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 0 2.8l-6.2 6.2a2 2 0 0 1-2.8 0L4.6 13.4A2 2 0 0 1 4 12Z" />
                <circle cx="8.5" cy="9" r="1.1" />
              </svg>
            </span>
          )}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[0.9375rem] leading-tight font-semibold tracking-[-0.01em]">{props.title}</span>
            {props.meta.length > 0 && <span className="mt-0.5 truncate text-sm leading-tight text-muted">{props.meta.join(" · ")}</span>}
          </span>
          {price && (
            <span className="flex shrink-0 flex-col items-end leading-none">
              {price.from && <span className="mb-1 text-xs text-muted">{t.from}</span>}
              <span className="c-price c-price-lg">{formatMoney(price.cents)}</span>
            </span>
          )}
        </div>
      )}
      {props.children}
    </div>
  );
}

/**
 * The details step's dock (the Book now button), shown only once the Client has reached the
 * end of the page: it stays in the DOM and holds its place, but sits 1rem low at opacity 0,
 * inert and aria-hidden, until an IntersectionObserver sees the sentinel at the form's end;
 * then it slides up (.c-dock-reveal, transform/opacity; reduced motion: it just appears). It
 * slides back down when the Client scrolls away from the end again. A page that doesn't scroll sees the sentinel at once. Keyboard: the sentinel is the
 * next tab stop while the dock is hidden, so tabbing on from the last field scrolls to the end,
 * reveals the dock and moves focus to its button. An error or a booking in flight shows it too.
 */
function RevealDock({ force = false, ...dock }: DockProps & { force?: boolean }) {
  const [seen, setSeen] = useState(false);
  const shown = seen || force;
  const dockRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLSpanElement>(null);

  // Conceals again when the end of the form is more than 160px below the screen, unless focus
  // is inside the dock or something forces it open. Called on focus leaving and when force ends.
  const forceRef = useRef(force);
  const recheck = useCallback(() => {
    const end = endRef.current;
    if (!end || forceRef.current) return;
    if (dockRef.current?.contains(document.activeElement)) return;
    if (end.getBoundingClientRect().top > window.innerHeight + 160) setSeen(false);
  }, []);

  useEffect(() => {
    const end = endRef.current;
    const dockEl = dockRef.current;
    if (!end) return;
    // Two observers give hysteresis: it shows when the end of the form is in view, and hides
    // only once the end is more than 160px below the screen, so the edge never flickers.
    const show = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setSeen(true);
    });
    const hide = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) recheck();
      },
      { rootMargin: "0px 0px 160px 0px" },
    );
    show.observe(end);
    hide.observe(end);
    const onFocusOut = (e: FocusEvent) => {
      if (!dockEl?.contains(e.relatedTarget as Node | null)) setTimeout(recheck); // after focus settles
    };
    dockEl?.addEventListener("focusout", onFocusOut);
    return () => {
      show.disconnect();
      hide.disconnect();
      dockEl?.removeEventListener("focusout", onFocusOut);
    };
  }, [recheck]);

  useEffect(() => {
    forceRef.current = force;
    if (!force) recheck();
  }, [force, recheck]);

  function revealFromKeyboard() {
    flushSync(() => setSeen(true)); // drops inert now, so the button can take focus
    // The button, or (while the bot check still holds it disabled) the dock itself, so focus
    // stays at the end of the form and the next Tab reaches the button once it is ready.
    const dockEl = dockRef.current;
    (dockEl?.querySelector<HTMLElement>("button:not(:disabled)") ?? dockEl)?.focus();
  }

  return (
    <>
      <Dock {...dock} ref={dockRef} concealed={!shown} />
      <span
        ref={endRef}
        tabIndex={shown ? undefined : 0}
        onFocus={shown ? undefined : revealFromKeyboard}
        className="pointer-events-none absolute bottom-0 left-0 size-px outline-none"
      />
    </>
  );
}

function Chevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="c-chevron h-5 w-5 shrink-0 text-muted"
    >
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function ShopIcon({ className = "h-6 w-6 shrink-0 text-muted" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3.5 9.5 5 4.5h14l1.5 5" />
      <path d="M3.5 9.5a2.8 2.8 0 0 0 5.6 0 2.8 2.8 0 0 0 5.8 0 2.8 2.8 0 0 0 5.6 0" />
      <path d="M5 12v7.5h14V12M10 19.5v-4h4v4" />
    </svg>
  );
}

function FinePrint({ icon, children }: { icon: "refund" | "tip" | "text"; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 h-4 w-4 shrink-0"
      >
        {icon === "refund" ? (
          <path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4h4" />
        ) : icon === "tip" ? (
          <>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M14.5 9.5c-.4-.9-1.3-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.2 0-2.1-.6-2.5-1.5M12 6.5V8M12 16v1.5" />
          </>
        ) : (
          <path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4 3.5v-3.5h0a1.5 1.5 0 0 1-1.5-1.5Z" />
        )}
      </svg>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function Avatar({ barber, size }: { barber: Barber; size: string }) {
  if (barber.photoUrl) {
    return (
      <span className={`c-photo c-avatar-photo ${size} shrink-0 rounded-full`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- photos come from any host the Owner uses */}
        <img src={barber.photoUrl} alt="" width={112} height={112} loading="lazy" className="size-full object-cover" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`c-avatar ${size}`}
    >
      {initials(barber.displayName)}
    </span>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-h-12 items-baseline justify-between gap-4 px-4 py-3">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right font-medium">{value}</dd>
    </div>
  );
}

/** One raised card per way to pay (.c-pay): the icon in a soft tile, a filled radio; the chosen one lifts on an ink ring. */
function PayOption(props: { checked: boolean; onChange: () => void; title: string; hint: string; icon: "shop" | "card" }) {
  return (
    <label className={`c-pay press ${props.checked ? "is-on" : ""}`}>
      <input type="radio" name="payment" checked={props.checked} onChange={props.onChange} className="sr-only" />
      <span className="c-tile">
        {props.icon === "card" ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
            <path d="M2.5 10h19M6 15h4" />
          </svg>
        ) : (
          <ShopIcon className="h-5 w-5" />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold">{props.title}</span>
        <span className="text-sm text-muted">{props.hint}</span>
      </span>
      <span aria-hidden="true" className="c-radio">
        <span className={`c-radio-dot ${props.checked ? "is-on" : ""}`} />
      </span>
    </label>
  );
}

function EmptyNotice({ text, phone, t }: { text: string; phone: string | null; t: Dictionary }) {
  return (
    <section className="c-card c-in flex flex-col items-start gap-4 p-5">
      <p className="text-lg leading-snug">{text}</p>
      {phone && (
        <a href={telHref(phone)} className={`c-btn c-btn-primary press ${focusRing}`}>
          <PhoneIcon />
          {t.callShop}
        </a>
      )}
    </section>
  );
}

/** The profile sheet: a real <dialog>, a bottom sheet on phones and a centered dialog on desktop. */
function BarberSheet(props: {
  barber: Barber | null;
  t: Dictionary;
  locale: Locale;
  priceCents: number | null;
  onClose: () => void;
  onChoose: (b: Barber) => void;
}) {
  const { barber: b, t } = props;
  const bio = b ? bioFor(b, props.locale) : "";
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (b && !d.open) d.showModal();
    if (!b && d.open) d.close();
  }, [b]);

  const closeButton = (
    <button
      type="button"
      aria-label={t.close}
      onClick={() => ref.current?.close()}
      className={`press grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-raised hover:text-ink ${focusRing}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-5 w-5">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  );

  return (
    <dialog
      ref={ref}
      aria-labelledby="barber-sheet-name"
      onClose={props.onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="c-sheet m-0 mt-auto max-h-[90dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-[1.5rem] border border-b-0 border-line bg-surface p-0 text-ink transition-[opacity,translate] duration-(--dur-slow) ease-(--ease-out) backdrop:bg-black/55 starting:translate-y-full starting:opacity-0 motion-reduce:transition-none sm:m-auto sm:max-w-md sm:rounded-[1.5rem] sm:border-b sm:starting:translate-y-3"
    >
      {b && (
        <div className="flex flex-col gap-5 px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-6">
          <div aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-line sm:hidden" />
          {b.photoUrl ? (
            <>
              <div className="c-photo relative aspect-[4/3] rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element -- photos come from any host the Owner uses */}
                <img src={b.photoUrl} alt="" width={720} height={540} className="c-in-photo size-full object-cover object-[50%_25%]" />
              </div>
              <div className="-mt-1 flex items-start gap-3">
                <div className="min-w-0 flex-1 pt-1">
                  <h2 id="barber-sheet-name" className="c-h2">
                    {b.displayName}
                  </h2>
                  {b.specialties.length > 0 && <p className="mt-1 text-sm text-muted">{b.specialties.join(" · ")}</p>}
                </div>
                {closeButton}
              </div>
            </>
          ) : (
            <div className="flex items-start gap-4">
              <Avatar barber={b} size="size-20 text-2xl" />
              <div className="min-w-0 flex-1 pt-2">
                <h2 id="barber-sheet-name" className="c-h2">
                  {b.displayName}
                </h2>
                {b.specialties.length > 0 && <p className="mt-1 text-sm text-muted">{b.specialties.join(" · ")}</p>}
              </div>
              {closeButton}
            </div>
          )}
          {bio && <p className="leading-relaxed whitespace-pre-line">{bio}</p>}
          {b.instagram && (
            <a
              href={`https://instagram.com/${b.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`-my-2 inline-flex min-h-11 items-center gap-2 self-start rounded-md font-medium ${focusRing}`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 shrink-0 text-muted"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" />
              </svg>
              <span className="c-link min-w-0 break-all">
                <span className="sr-only">Instagram </span>@{b.instagram}
                <span className="sr-only"> {t.opensNewTab}</span>
              </span>
            </a>
          )}
          {b.gallery.length > 0 && (
            <ul className="grid grid-cols-3 gap-2">
              {b.gallery.slice(0, 6).map((url, i) => (
                <li key={url} className="c-photo aspect-square rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element -- gallery photos from the Barber's own host */}
                  <img src={url} alt={t.workPhoto(b.displayName, i + 1)} width={240} height={240} loading="lazy" className="size-full object-cover" />
                </li>
              ))}
            </ul>
          )}
          <button type="button" className={`c-btn c-btn-primary press w-full ${focusRing}`} onClick={() => props.onChoose(b)}>
            {t.bookWith(b.displayName)}
            {props.priceCents !== null && <span className="font-mono tabular-nums opacity-70">· {formatMoney(props.priceCents)}</span>}
          </button>
        </div>
      )}
    </dialog>
  );
}

/** The public origin for links that leave the page: NEXT_PUBLIC_SITE_URL when set, else this page's own origin. */
const siteOrigin = () => (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/+$/, "");

/** A Google Calendar "new event" link, prefilled. Dates are UTC as YYYYMMDDTHHMMSSZ. */
function googleCalendarHref(e: { title: string; startsAt: string; durationMin: number; location: string; details: string }) {
  const start = new Date(e.startsAt);
  const end = new Date(start.getTime() + e.durationMin * 60_000);
  const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates: `${utc(start)}/${utc(end)}`, details: e.details });
  if (e.location) q.set("location", e.location);
  return `https://calendar.google.com/calendar/render?${q}`;
}

function Confirmation(props: {
  t: Dictionary;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  shop: Catalog["shop"];
  barber: Barber | null;
  serviceName: string;
  rows: [string, React.ReactNode][];
  manageToken: string;
  startsAt: string;
  durationMin: number;
  onAgain: () => void;
}) {
  const { t, shop, headingRef, rows, manageToken, onAgain, barber } = props;
  const path = `/m/${manageToken}`;
  const calendarHref = googleCalendarHref({
    title: `${props.serviceName} · ${shop.name}`,
    startsAt: props.startsAt,
    durationMin: props.durationMin,
    location: shop.address ?? "",
    details: [barber ? `${t.bookedWith} ${barber.displayName}` : "", `${t.manageBooking}: ${siteOrigin()}${path}`].filter(Boolean).join("\n\n"),
  });

  return (
    <section className="flex flex-col gap-6" aria-live="polite">
      <div className="flex flex-col items-center gap-4 text-center">
        {/* The booked check: the success green, the only colored mark on this page. */}
        {/* Disc springs in, the tick draws itself, one soft ring ripples out (CSS: .c-check). */}
        <svg aria-hidden="true" viewBox="0 0 48 48" fill="none" strokeLinecap="round" strokeLinejoin="round" overflow="visible" className="c-check h-14 w-14">
          <circle className="c-check-ring" cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" />
          <circle className="c-check-disc" cx="24" cy="24" r="22" fill="currentColor" />
          <path className="c-check-tick" d="M14.5 24.5l6.5 6.5 12.5-13" stroke="white" strokeWidth="3" pathLength={1} strokeDasharray="1" />
        </svg>
        <h2 ref={headingRef} tabIndex={-1} className="c-h2 outline-none">
          {t.booked}
        </h2>
      </div>

      <div className="c-card c-in overflow-hidden" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="flex items-center gap-3.5 px-4 py-4">
          {barber && <Avatar barber={barber} size="size-14" />}
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="font-semibold">{props.serviceName}</p>
            {barber && (
              <p className="text-sm text-muted">
                <span className="sr-only">{t.barber}: </span>
                {t.bookedWith} <span className="font-medium text-ink">{barber.displayName}</span>
              </p>
            )}
          </div>
        </div>
        <dl className="divide-y divide-line border-t border-line text-sm">
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
                      className={`-mr-1 inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 font-mono tabular-nums ${focusRing}`}
                    >
                      <PhoneIcon />
                      <span className="c-link">{formatPhone(shop.phone)}</span>
                    </a>
                  )}
                </>
              }
            />
          )}
        </dl>
      </div>

      <div className="c-in flex flex-col gap-3" style={{ "--i": 2 } as React.CSSProperties}>
        {!shop.smsEnabled && <p className="text-sm text-muted">{t.smsPending}</p>}
        <p className="text-sm">{t.saveLink}</p>
        <a href={path} className={`c-btn c-btn-primary press w-full ${focusRing}`}>
          {t.manageBooking}
        </a>
        <a href={calendarHref} target="_blank" rel="noopener noreferrer" className={`c-btn c-btn-secondary press w-full ${focusRing}`}>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 shrink-0"
          >
            <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" />
            <path d="M3.5 10h17M8 3v4M16 3v4" />
          </svg>
          {t.addToCalendar}
          <span className="sr-only"> {t.opensNewTab}</span>
        </a>
      </div>

      <button
        type="button"
        className={`c-btn c-btn-secondary press c-in w-full ${focusRing}`}
        style={{ "--i": 3 } as React.CSSProperties}
        onClick={onAgain}
      >
        {t.bookAnother}
      </button>
    </section>
  );
}
