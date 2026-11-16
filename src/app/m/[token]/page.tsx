import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ClientShell } from "@/components/client-shell";
import { Notice } from "@/components/notice";
import { PayTag } from "@/components/pay-tag";
import { formatCutoff, formatMoney, type Dictionary, type Locale } from "@/lib/i18n/dictionaries";
import { getDictionary } from "@/lib/i18n/server";
import { formatPhone } from "@/lib/phone";
import { bookingEngine } from "@/server/engine";
import { clock, initials, longDay, sameLocalDay, shortDay } from "./format";
import { BookedCheck, CalendarIcon, ClockIcon, CrossCircleIcon, PhoneIcon } from "./icons";
import { AwaitingPayment, HoldCountdown, ManageActions, PayNowButton } from "./manage-actions";

// The token in the URL is a credential: keep it out of search engines and referrers.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function ManagePage(props: PageProps<"/m/[token]">) {
  return (
    <Suspense fallback={<ManageSkeleton />}>
      <Manage params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

type Data = NonNullable<Awaited<ReturnType<ReturnType<typeof bookingEngine>["getBookingByToken"]>>>;

/**
 * What the Client is looking at. One of these, each with one next action:
 * booked (change / cancel), tooLate (call the Shop), awaiting (we're confirming the
 * payment), holding (pay now), expired (pick a time again), cancelled / past (book again).
 */
type View = "booked" | "tooLate" | "awaiting" | "holding" | "expired" | "cancelled" | "past";

function viewFor(data: Data, now: Date, justPaid: boolean): View {
  const { booking } = data;
  if (booking.status === "cancelled") return data.cancelledBy === "system" ? "expired" : "cancelled";
  if (booking.status === "pending_payment") {
    if (justPaid) return "awaiting";
    return data.holdExpiresAt && data.holdExpiresAt <= now ? "expired" : "holding";
  }
  if (booking.status !== "confirmed" || booking.startsAt <= now) return "past";
  return data.canChange ? "booked" : "tooLate";
}

async function Manage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const justPaid = query.paid === "1";
  await connection();
  const now = new Date();
  const [{ locale, t }, data] = await Promise.all([getDictionary(), bookingEngine().getBookingByToken(token, now)]);
  const m = t.manage;

  if (!data) {
    return (
      <Shell locale={locale} t={t} shop={null}>
        <section className="c-card c-in mt-6 flex flex-col items-start gap-4 px-5 py-6">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-raised text-muted">
            <CrossCircleIcon className="h-6 w-6" />
          </span>
          <h1 className="c-h2">{m.notFound}</h1>
        </section>
      </Shell>
    );
  }

  const { booking, shop } = data;
  const view = viewFor(data, now, justPaid);
  const tz = shop.timezone;
  const price = formatMoney(booking.priceCents);
  const paidOnline = booking.paymentMethod === "online" && booking.paymentStatus === "paid";
  const serviceName = locale === "es" ? data.serviceName.es : data.serviceName.en;
  const phone = shop.phone ? formatPhone(shop.phone) : null;
  const bookAgainHref = `/b/${shop.slug}`;
  const inactive = view === "cancelled" || view === "expired" || view === "past";

  return (
    <Shell locale={locale} t={t} shop={shop}>
      <Summary data={data} view={view} locale={locale} t={t} serviceName={serviceName} price={price} inactive={inactive} />

      {view === "booked" && (
        <>
          <p className="c-in px-1 text-sm leading-relaxed text-muted" style={stagger(1)}>
            {m.cutoff(
              sameLocalDay(data.cutoffAt, booking.startsAt, tz) ? null : shortDay(data.cutoffAt, tz, locale),
              clock(data.cutoffAt, tz, locale),
              formatCutoff(shop.cancelCutoffMinutes, locale),
            )}
          </p>
          <Actions>
            <ManageActions
              token={token}
              locale={locale}
              shopId={booking.shopId}
              serviceId={booking.serviceId}
              barberId={booking.barberId}
              timezone={tz}
              startsAt={booking.startsAt.toISOString()}
              paidOnline={paidOnline}
              price={price}
              recap={`${serviceName} ${t.bookedWith} ${data.barberName}`}
            />
            {shop.phone && phone && (
              <a
                href={`tel:${shop.phone}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 self-center rounded-full px-4 text-sm text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <PhoneIcon className="h-5 w-5" />
                <span>
                  {m.callShop} · <span className="c-link font-mono tabular-nums">{phone}</span>
                </span>
              </a>
            )}
          </Actions>
        </>
      )}

      {view === "tooLate" && (
        <Actions>
          <Notice>
            <p>{phone ? m.tooLate : m.tooLateNoPhone}</p>
          </Notice>
          {shop.phone && phone && (
            <a href={`tel:${shop.phone}`} className="c-btn c-btn-primary press w-full">
              <PhoneIcon className="h-5 w-5" />
              <span className="tabular-nums">{m.call(phone)}</span>
            </a>
          )}
        </Actions>
      )}

      {view === "awaiting" && (
        <Actions>
          <AwaitingPayment locale={locale} />
        </Actions>
      )}

      {view === "holding" && (
        <Actions>
          <Notice icon={<ClockIcon className="h-5 w-5" />}>
            <p>{m.holdBody}</p>
            {data.holdExpiresAt && (
              <HoldCountdown expiresAt={data.holdExpiresAt.toISOString()} serverNow={now.getTime()} label={m.holdLeft} />
            )}
          </Notice>
          <PayNowButton token={token} locale={locale} />
        </Actions>
      )}

      {view === "expired" && (
        <Actions>
          <Notice>
            <p>{m.expiredBody}</p>
            {booking.paymentStatus === "paid" && <p>{m.lateRefundOnWay(price)}</p>}
            {booking.paymentStatus === "refunded" && <p>{m.lateRefunded(price)}</p>}
          </Notice>
          <Link href={bookAgainHref} className="c-btn c-btn-primary press w-full">
            {m.pickAgain}
          </Link>
        </Actions>
      )}

      {view === "cancelled" && (
        <Actions>
          <Notice>
            <p>{data.cancelledBy === "client" ? m.cancelledByYou : m.cancelledByShop}</p>
            {booking.paymentMethod === "online" && booking.paymentStatus === "paid" && <p>{m.refundOnWay(price)}</p>}
            {booking.paymentMethod === "online" && booking.paymentStatus === "refunded" && <p>{m.refunded(price)}</p>}
          </Notice>
          <Link href={bookAgainHref} className="c-btn c-btn-primary press w-full">
            {m.bookAgain}
          </Link>
        </Actions>
      )}

      {view === "past" && (
        <Actions>
          <Link href={bookAgainHref} className="c-btn c-btn-primary press w-full">
            {m.bookAgain}
          </Link>
        </Actions>
      )}
    </Shell>
  );
}

/** The entrance stagger index the .c-in animation reads (60ms a step). */
const stagger = (i: number) => ({ "--i": i }) as React.CSSProperties;

/** The shared Client frame (glass bar, footer); here the h1 is the Booking's status, so the Shop name is a <p>. */
function Shell({ locale, t, shop, children }: { locale: Locale; t: Dictionary; shop: { name: string; address: string | null; phone: string | null } | null; children: React.ReactNode }) {
  return (
    <ClientShell locale={locale} t={t} shop={shop} shopNameAs="p">
      <div className="flex flex-1 flex-col gap-4 pb-2">{children}</div>
    </ClientShell>
  );
}

/** The action block sits low on phones, within thumb reach, and right under the ticket on desktop. */
function Actions({ children }: { children: React.ReactNode }) {
  return (
    <div className="c-in mt-auto flex flex-col gap-3 pt-4 sm:mt-2" style={stagger(2)}>
      {children}
    </div>
  );
}

function StatusLine({ view, m }: { view: View; m: Dictionary["manage"] }) {
  const disc = (node: React.ReactNode) => <span className="grid h-10 w-10 place-items-center rounded-full bg-raised text-muted">{node}</span>;
  const icon =
    view === "booked" || view === "tooLate" ? (
      <BookedCheck className="h-10 w-10" />
    ) : view === "cancelled" ? (
      disc(<CrossCircleIcon className="h-6 w-6" />)
    ) : view === "past" ? (
      disc(<CalendarIcon className="h-6 w-6" />)
    ) : (
      disc(<ClockIcon className="h-6 w-6" />)
    );
  const text =
    view === "booked" || view === "tooLate"
      ? m.booked
      : view === "awaiting"
        ? m.awaiting
        : view === "holding"
          ? m.holding
          : view === "expired"
            ? m.expired
            : view === "cancelled"
              ? m.cancelled
              : m.past;
  return (
    <div className="flex items-center gap-3 px-5 pt-5">
      <span className="shrink-0">{icon}</span>
      <h1 id="booking-status" className="c-h2">
        {text}
      </h1>
    </div>
  );
}

/**
 * The Booking as a ticket: status on top, the day and time large in mono, a perforated
 * tear line (a notch bitten out of each edge), then who, what, and how it's paid.
 */
function Summary({
  data,
  view,
  locale,
  t,
  serviceName,
  price,
  inactive,
}: {
  data: Data;
  view: View;
  locale: Locale;
  t: Dictionary;
  serviceName: string;
  price: string;
  inactive: boolean;
}) {
  const { booking, shop } = data;
  const m = t.manage;
  const tz = shop.timezone;
  const minutes = Math.round((booking.endsAt.getTime() - booking.startsAt.getTime()) / 60_000);
  const struck = view === "cancelled" || view === "expired";
  const paidTag =
    booking.paymentMethod === "online" && booking.paymentStatus !== "unpaid" ? (booking.paymentStatus === "refunded" ? m.refundedTag : m.paidOnline) : null;

  return (
    <section aria-labelledby="booking-status" className="c-card c-in relative overflow-hidden" style={stagger(0)}>
      <StatusLine view={view} m={m} />
      <dl className={inactive ? "text-muted" : "text-ink"}>
        <div className="px-5 pt-5 pb-5">
          <dt className="sr-only">{m.when}</dt>
          <dd className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-muted">{longDay(booking.startsAt, tz, locale)}</span>
            <span className={`font-mono text-[2rem] leading-none font-medium tracking-[-0.03em] tabular-nums ${struck ? "line-through decoration-2" : ""}`}>
              {clock(booking.startsAt, tz, locale)}
            </span>
          </dd>
        </div>

        <Perforation />

        <div className="flex items-center gap-3 px-5 pt-4 pb-4">
          <dt className="sr-only">{m.barber}</dt>
          <dd className="contents">
            <Avatar name={data.barberName} photoUrl={data.barberPhotoUrl} muted={inactive} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-semibold">{data.barberName}</span>
              <span className="text-sm text-muted">
                <span className="sr-only">{m.service}: </span>
                {serviceName} · <span className="font-mono tabular-nums">{minutes}</span> {t.min}
              </span>
            </span>
          </dd>
        </div>
        <div className="mx-5 flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-line py-3">
          <dt className="sr-only">{m.price}</dt>
          <dd className="font-mono text-lg font-medium tabular-nums">{price}</dd>
          <dd>{paidTag ? <PayTag label={paidTag} card /> : booking.paymentMethod === "in_person" ? <PayTag label={m.payAtShop} /> : null}</dd>
        </div>
      </dl>
    </section>
  );
}

/** The ticket's tear line: a dashed rule with a half-circle notch bitten out of each edge. */
function Perforation() {
  return (
    <div aria-hidden="true" className="relative h-5">
      <span className="m-tear absolute inset-x-6 top-1/2 border-t border-dashed border-line" />
      <span className="m-notch absolute top-0 -left-2.5 h-5 w-5 rounded-full" />
      <span className="m-notch absolute top-0 -right-2.5 h-5 w-5 rounded-full" />
    </div>
  );
}

function Avatar({ name, photoUrl, muted }: { name: string; photoUrl: string | null; muted: boolean }) {
  if (photoUrl) {
    // Barber photos live in Supabase Storage (U3b); a plain <img> avoids configuring remote patterns for one 48px avatar.
    return (
      <span className={`c-photo h-12 w-12 shrink-0 rounded-full ${muted ? "opacity-60 grayscale" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl} alt="" width={48} height={48} className="c-in-photo h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-raised text-sm font-semibold text-ink">
      {initials(name)}
    </span>
  );
}

/** Shaped like the glass bar, the Shop's name, the ticket and the two buttons. Pulses slowly; still under reduced motion. */
function ManageSkeleton() {
  const block = "rounded-full bg-line motion-safe:animate-pulse";
  return (
    <div className="client-page flex min-h-dvh w-full flex-col" aria-busy="true">
      {/* The glass nav's shape (client-nav.tsx): mark, language, the three-way theme switch. */}
      <div className="px-3 pt-3">
        <div className="c-bar mx-auto flex h-16 max-w-3xl items-center justify-between gap-2 rounded-full pr-[11px] pl-4">
          <div className="size-7 rounded-full bg-raised" />
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 rounded-full bg-raised" />
            <div className="h-11 w-[8.25rem] rounded-full border border-line" />
          </div>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4">
        <div className="flex flex-col gap-2 pt-6 pb-4">
          <div className={`h-6 w-48 ${block}`} />
          <div className={`h-4 w-36 ${block}`} />
        </div>
        <div className="c-card overflow-hidden">
          <div className="flex items-center gap-3 px-5 pt-5">
            <div className={`h-10 w-10 ${block}`} />
            <div className={`h-7 w-40 ${block}`} />
          </div>
          <div className="flex flex-col gap-2 p-5">
            <div className={`h-4 w-44 ${block}`} />
            <div className={`h-8 w-32 ${block}`} />
          </div>
          <div className="mx-6 my-2.5 border-t border-dashed border-line" />
          <div className="flex items-center gap-3 p-4 px-5">
            <div className={`h-12 w-12 ${block}`} />
            <div className="flex flex-col gap-2">
              <div className={`h-4 w-24 ${block}`} />
              <div className={`h-4 w-32 ${block}`} />
            </div>
          </div>
          <div className="mx-5 flex min-h-14 items-center justify-between border-t border-line py-3">
            <div className={`h-5 w-12 ${block}`} />
            <div className={`h-6 w-24 ${block}`} />
          </div>
        </div>
        <div className="mt-auto flex flex-col gap-3 pt-4 pb-6 sm:mt-2">
          <div className={`h-12 w-full ${block}`} />
          <div className={`h-12 w-full ${block}`} />
        </div>
      </div>
    </div>
  );
}
