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
        <div className="flex items-start gap-3 pt-6">
          <CrossCircleIcon className="mt-0.5 h-6 w-6 shrink-0 text-muted" />
          <h1 className="text-xl font-semibold tracking-tight text-balance">{m.notFound}</h1>
        </div>
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
          <p className="px-1 text-sm text-muted">
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
                  {m.callShop} · <span className="font-mono tabular-nums">{phone}</span>
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
            <a href={`tel:${shop.phone}`} className="btn-primary w-full">
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
          <Link href={bookAgainHref} className="btn-primary w-full">
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
          <Link href={bookAgainHref} className="btn-primary w-full">
            {m.bookAgain}
          </Link>
        </Actions>
      )}

      {view === "past" && (
        <Actions>
          <Link href={bookAgainHref} className="btn-primary w-full">
            {m.bookAgain}
          </Link>
        </Actions>
      )}
    </Shell>
  );
}

/** The shared Client frame (header, footer); here the h1 is the Booking's status, so the Shop name is a <p>. */
function Shell({ locale, t, shop, children }: { locale: Locale; t: Dictionary; shop: { name: string; address: string | null; phone: string | null } | null; children: React.ReactNode }) {
  return (
    <ClientShell locale={locale} t={t} shop={shop} shopNameAs="p">
      <div className="flex flex-1 flex-col gap-4 border-t border-line pt-4 pb-2">{children}</div>
    </ClientShell>
  );
}

/** The action block sits low on phones, within thumb reach, and under the card on desktop. */
function Actions({ children }: { children: React.ReactNode }) {
  return <div className="mt-auto flex flex-col gap-3 pt-4 sm:mt-2">{children}</div>;
}

function StatusLine({ view, m }: { view: View; m: Dictionary["manage"] }) {
  const [icon, text] =
    view === "booked" || view === "tooLate"
      ? [<BookedCheck key="i" />, m.booked]
      : view === "awaiting"
        ? [<ClockIcon key="i" className="h-7 w-7 text-muted" />, m.awaiting]
        : view === "holding"
          ? [<ClockIcon key="i" className="h-7 w-7 text-muted" />, m.holding]
          : view === "expired"
            ? [<ClockIcon key="i" className="h-7 w-7 text-muted" />, m.expired]
            : view === "cancelled"
              ? [<CrossCircleIcon key="i" className="h-7 w-7 text-muted" />, m.cancelled]
              : [<CalendarIcon key="i" className="h-7 w-7 text-muted" />, m.past];
  return (
    <div className="flex items-center gap-3 px-5 pt-5 pb-4">
      <span className="shrink-0">{icon}</span>
      <h1 className="text-xl font-semibold tracking-tight text-balance">{text}</h1>
    </div>
  );
}

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
  const tone = inactive ? "text-muted" : "text-ink";
  const paidTag =
    booking.paymentMethod === "online" && booking.paymentStatus !== "unpaid" ? (booking.paymentStatus === "refunded" ? m.refundedTag : m.paidOnline) : null;

  return (
    <section aria-labelledby="booking-status" className="card overflow-hidden">
      <div id="booking-status">
        <StatusLine view={view} m={m} />
      </div>
      <dl className={tone}>
        <div className="flex items-center gap-3 border-t border-line px-5 py-4">
          <dt className="sr-only">{m.barber}</dt>
          <dd className="contents">
            <Avatar name={data.barberName} photoUrl={data.barberPhotoUrl} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-semibold">{data.barberName}</span>
              <span className="text-sm text-muted">
                <span className="sr-only">{m.service}: </span>
                {serviceName} · <span className="font-mono tabular-nums">{minutes}</span> {t.min}
              </span>
            </span>
          </dd>
        </div>
        <div className="border-t border-line px-5 py-4">
          <dt className="sr-only">{m.when}</dt>
          <dd className="flex flex-col gap-0.5">
            <span className="text-sm text-muted">{longDay(booking.startsAt, tz, locale)}</span>
            <span className={`font-mono text-2xl font-medium tracking-tight tabular-nums ${inactive ? "line-through decoration-1" : ""}`}>
              {clock(booking.startsAt, tz, locale)}
            </span>
          </dd>
        </div>
        <div className="flex min-h-14 items-center justify-between gap-3 border-t border-line px-5 py-3">
          <dt className="sr-only">{m.price}</dt>
          <dd className="font-mono text-lg tabular-nums">{price}</dd>
          <dd>
            {paidTag ? <PayTag label={paidTag} card /> : booking.paymentMethod === "in_person" ? <PayTag label={m.payAtShop} /> : null}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function Avatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  if (photoUrl) {
    // Barber photos live in Supabase Storage (U3b); a plain <img> avoids configuring remote patterns for one 44px avatar.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-raised text-sm font-semibold text-ink">
      {initials(name)}
    </span>
  );
}

/** Shaped like the header, the summary card and the two buttons. Pulses slowly; still under reduced motion. */
function ManageSkeleton() {
  const block = "rounded-full bg-line motion-safe:animate-pulse";
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 sm:py-6" aria-busy="true">
      <div className="flex min-h-16 items-center justify-between gap-3 py-3">
        <div className={`h-5 w-40 ${block}`} />
        <div className="flex gap-2">
          <div className={`h-11 w-20 ${block}`} />
          <div className={`h-11 w-11 ${block}`} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4">
        <div className="card overflow-hidden">
          <div className="flex items-center gap-3 px-5 pt-5 pb-4">
            <div className={`h-7 w-7 ${block}`} />
            <div className={`h-6 w-36 ${block}`} />
          </div>
          <div className="flex items-center gap-3 border-t border-line px-5 py-4">
            <div className={`h-11 w-11 ${block}`} />
            <div className="flex flex-col gap-2">
              <div className={`h-4 w-24 ${block}`} />
              <div className={`h-4 w-32 ${block}`} />
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-line px-5 py-4">
            <div className={`h-4 w-44 ${block}`} />
            <div className={`h-8 w-28 ${block}`} />
          </div>
          <div className="flex min-h-14 items-center justify-between border-t border-line px-5 py-3">
            <div className={`h-5 w-12 ${block}`} />
            <div className={`h-6 w-24 ${block}`} />
          </div>
        </div>
        <div className="mt-auto flex flex-col gap-3 pt-4 sm:mt-2">
          <div className={`h-12 w-full ${block}`} />
          <div className={`h-12 w-full ${block}`} />
        </div>
      </div>
    </div>
  );
}
