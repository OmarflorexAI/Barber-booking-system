import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { LanguageToggle } from "@/components/language-toggle";
import { formatPhone } from "@/lib/phone";
import { formatDateTime, formatMoney } from "@/lib/i18n/dictionaries";
import { getDictionary } from "@/lib/i18n/server";
import { bookingEngine } from "@/server/engine";
import { ManageActions } from "./manage-actions";

// The token in the URL is a credential: keep it out of search engines and referrers.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function ManagePage(props: PageProps<"/m/[token]">) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-4 py-6">
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-line/60" />}>
        <Manage params={props.params} />
      </Suspense>
    </main>
  );
}

async function Manage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await connection();
  const [{ locale, t }, data] = await Promise.all([getDictionary(), bookingEngine().getBookingByToken(token, new Date())]);

  if (!data) {
    return <p className="card p-5">{t.notFound}</p>;
  }
  const { booking, shop } = data;
  const phone = shop.phone ? formatPhone(shop.phone) : null;
  const statusTone =
    booking.status === "confirmed" ? "bg-ok-soft text-ok" : booking.status === "cancelled" ? "bg-accent-soft text-accent" : "bg-paper text-muted";

  return (
    <>
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{shop.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{t.yourBooking}</h1>
        </div>
        <LanguageToggle locale={locale} label={t.otherLang} />
      </header>

      <section className="card flex flex-col gap-1 p-5">
        <span className={`mb-2 w-fit rounded-full px-3 py-1 text-xs font-medium ${statusTone}`}>{t.status[booking.status]}</span>
        <p className="text-lg font-medium">
          {locale === "es" ? data.serviceName.es : data.serviceName.en} {t.bookedWith} {data.barberName}
        </p>
        <p>{formatDateTime(booking.startsAt, shop.timezone, locale)}</p>
        <p className="text-muted">
          {formatMoney(booking.priceCents)} · {booking.paymentStatus === "paid" ? t.paid : t.payAtShop}
        </p>
      </section>

      {booking.status === "confirmed" && !data.canChange && (
        <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">{t.tooLate(phone)}</p>
      )}

      {data.canChange && (
        <ManageActions
          token={token}
          locale={locale}
          shopId={booking.shopId}
          serviceId={booking.serviceId}
          barberId={booking.barberId}
          timezone={shop.timezone}
        />
      )}
    </>
  );
}
