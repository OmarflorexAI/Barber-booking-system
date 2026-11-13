import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { formatPhone } from "@/lib/phone";
import { formatDay, formatMoney, formatTime } from "@/lib/i18n/dictionaries";
import { getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { addDays, isLocalDate, localDayRange, toLocal } from "@/server/booking-engine/time";
import { BookingRowActions, TelegramLinkButton, WalkInButton } from "./day-actions";

export const metadata: Metadata = { title: "My day", robots: { index: false } };

export default function DayPage(props: PageProps<"/app/day">) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-5 px-4 py-6">
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-line/60" />}>
        <Day searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

type BookingRow = {
  id: string;
  kind: "booking" | "walk_in";
  status: "pending_payment" | "confirmed" | "cancelled" | "arrived" | "no_show";
  starts_at: string;
  ends_at: string;
  price_cents: number;
  payment_status: "unpaid" | "paid" | "refunded";
  clients: { name: string; phone_e164: string } | null;
  services: { name_en: string; name_es: string } | null;
};

async function Day({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  await connection();
  const { locale, t } = await getDictionary();
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  // Row-level security limits every query below to the user's own Shop (and, for Barbers, their own Bookings).
  const { data: membership } = await supabase
    .from("shop_members")
    .select("shop_id, role, shops(name, timezone)")
    .eq("user_id", auth.user.id)
    .limit(1)
    .maybeSingle<{ shop_id: string; role: "owner" | "barber"; shops: { name: string; timezone: string } }>();

  if (!membership) {
    return <p className="card p-5">{t.notMember}</p>;
  }
  const shopId = membership.shop_id;
  const tz = membership.shops.timezone;
  const isOwner = membership.role === "owner";

  const { data: barbers } = await supabase
    .from("barbers")
    .select("id, display_name, user_id")
    .eq("shop_id", shopId)
    .eq("active", true)
    .order("sort_order")
    .returns<{ id: string; display_name: string; user_id: string | null }[]>();

  const mine = barbers?.find((b) => b.user_id === auth.user.id) ?? null;
  const visible = isOwner ? (barbers ?? []) : mine ? [mine] : [];
  const requested = typeof sp.barber === "string" ? sp.barber : undefined;
  const barber = visible.find((b) => b.id === requested) ?? mine ?? visible[0] ?? null;

  const today = toLocal(new Date(), tz).date;
  const date = typeof sp.date === "string" && isLocalDate(sp.date) ? sp.date : today;
  const { start, end } = localDayRange(date, tz);

  const [{ data: bookings }, { data: services }] = barber
    ? await Promise.all([
        supabase
          .from("bookings")
          .select("id, kind, status, starts_at, ends_at, price_cents, payment_status, clients(name, phone_e164), services(name_en, name_es)")
          .eq("barber_id", barber.id)
          .gte("starts_at", start.toISOString())
          .lt("starts_at", end.toISOString())
          .neq("status", "cancelled")
          .order("starts_at")
          .returns<BookingRow[]>(),
        supabase
          .from("barber_services")
          .select("service_id, services(name_en, name_es, active)")
          .eq("barber_id", barber.id)
          .returns<{ service_id: string; services: { name_en: string; name_es: string; active: boolean } }[]>(),
      ])
    : [{ data: [] as BookingRow[] }, { data: [] }];

  const link = (d: string, b = barber?.id) => `/app/day?date=${d}${b ? `&barber=${b}` : ""}`;
  const serviceName = (s: { name_en: string; name_es: string } | null) => (s ? (locale === "es" ? s.name_es : s.name_en) : "");

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{membership.shops.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{barber?.display_name ?? "—"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle label={t.themeDark} />
          <LanguageToggle locale={locale} label={t.otherLang} />
          <form action="/auth/signout" method="post">
            <button className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-line px-4 text-sm font-medium text-muted transition-colors hover:border-ink/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">{t.signOut}</button>
          </form>
        </div>
      </header>

      {isOwner && visible.length > 1 && (
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4" aria-label={t.barber}>
          {visible.map((b) => (
            <Link
              key={b.id}
              href={link(date, b.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm ${b.id === barber?.id ? "border-ink bg-ink text-paper" : "border-line bg-surface"}`}
            >
              {b.display_name}
            </Link>
          ))}
        </nav>
      )}

      <nav className="flex items-center justify-between gap-2">
        <Link href={link(addDays(date, -1))} className="btn-ghost px-4" aria-label={t.prevDay}>
          ←
        </Link>
        <div className="text-center">
          <p className="font-medium">{formatDay(date, locale)}</p>
          {date !== today && (
            <Link href={link(today)} className="text-sm text-accent">
              {t.today}
            </Link>
          )}
        </div>
        <Link href={link(addDays(date, 1))} className="btn-ghost px-4" aria-label={t.nextDay}>
          →
        </Link>
      </nav>

      {barber && date === today && (
        <WalkInButton
          locale={locale}
          shopId={shopId}
          barberId={barber.id}
          services={(services ?? [])
            .filter((s) => s.services?.active)
            .map((s) => ({ id: s.service_id, name: serviceName(s.services) }))}
        />
      )}

      {barber && <TelegramLinkButton locale={locale} shopId={shopId} barberId={barber.id} />}

      <ol className="flex flex-col gap-3">
        {(bookings ?? []).length === 0 && <li className="card p-5 text-muted">{t.noBookings}</li>}
        {(bookings ?? []).map((b) => (
          <li key={b.id} className="card flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">
                  {formatTime(b.starts_at, tz, locale)}
                  <span className="ml-2 text-sm font-normal text-muted">– {formatTime(b.ends_at, tz, locale)}</span>
                </p>
                <p className="font-medium">{b.kind === "walk_in" ? t.walkIn : b.clients?.name}</p>
                {b.clients?.phone_e164 && (
                  <a href={`tel:${b.clients.phone_e164}`} className="text-sm text-accent">
                    {formatPhone(b.clients.phone_e164)}
                  </a>
                )}
                <p className="text-sm text-muted">{serviceName(b.services)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatMoney(b.price_cents)}</p>
                <p className={`text-xs ${b.payment_status === "paid" ? "text-ok" : "text-muted"}`}>
                  {b.payment_status === "paid" ? t.paid : t.payAtShop}
                </p>
                <p className="mt-1 text-xs text-muted">{t.status[b.status]}</p>
              </div>
            </div>
            {b.kind === "booking" && b.status !== "pending_payment" && <BookingRowActions bookingId={b.id} status={b.status} locale={locale} />}
          </li>
        ))}
      </ol>
    </>
  );
}
