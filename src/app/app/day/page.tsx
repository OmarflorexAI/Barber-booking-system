import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatPhone } from "@/lib/phone";
import { formatDay, formatMoney, formatTime, type Locale } from "@/lib/i18n/dictionaries";
import { getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { addDays, isLocalDate, localDayRange, toLocal } from "@/server/booking-engine/time";
import { getStaff } from "../_shell/staff";
import { DayBoard } from "./day-board";
import { DaySkeleton } from "./skeleton";
import type { DayBarber, DayRow } from "./types";

export const metadata: Metadata = { title: "Day", robots: { index: false } };

/**
 * Day (a Barber's own Bookings) and Today (the Owner: every active Barber). URL state is
 * `?date=YYYY-MM-DD&barber=<id>`; the Owner's phone list filters by `barber`, the desktop
 * shows one column per Barber. Row-level security limits every read to what this person may see.
 */
export default function DayPage(props: PageProps<"/app/day">) {
  return (
    <Suspense fallback={<DaySkeleton />}>
      <Day searchParams={props.searchParams} />
    </Suspense>
  );
}

type BookingRecord = {
  id: string;
  barber_id: string;
  service_id: string;
  kind: "booking" | "walk_in";
  status: DayRow["status"];
  starts_at: string;
  ends_at: string;
  created_at: string;
  price_cents: number;
  payment_status: "unpaid" | "paid" | "refunded";
  clients: { name: string; phone_e164: string } | null;
  services: { name_en: string; name_es: string } | null;
};

/** A Booking the Client made online in the last 2 hours gets the red new-Booking dot. */
const NEW_WINDOW_MS = 2 * 60 * 60_000;

function timeParts(iso: string, tz: string, locale: Locale) {
  const parts = new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).formatToParts(new Date(iso));
  const hm = parts.filter((p) => p.type === "hour" || p.type === "minute" || (p.type === "literal" && p.value.includes(":"))).map((p) => p.value).join("");
  const period = parts.find((p) => p.type === "dayPeriod")?.value ?? "";
  return { hm, period };
}

async function Day({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  await connection();
  const [{ locale, t }, staff] = await Promise.all([getDictionary(), getStaff()]);
  if (!staff) redirect("/login");
  // The shell shows the "not linked to a Shop" view for this case.
  if (!staff.membership) return null;
  const d = t.day;

  const supabase = await createClient();
  const { shopId, timezone: tz, role } = staff.membership;
  const isOwner = role === "owner";

  const [{ data: shop }, { data: barberRows }] = await Promise.all([
    supabase.from("shops").select("name, slug, sms_enabled").eq("id", shopId).maybeSingle<{ name: string; slug: string; sms_enabled: boolean }>(),
    supabase
      .from("barbers")
      .select("id, display_name")
      .eq("shop_id", shopId)
      .eq("active", true)
      .order("sort_order")
      .order("id")
      .returns<{ id: string; display_name: string }[]>(),
  ]);

  // A Barber sees only their own day; the Owner sees every active Barber.
  const visible = isOwner ? (barberRows ?? []) : staff.barber ? [{ id: staff.barber.id, display_name: staff.barber.displayName }] : [];
  const requested = typeof sp.barber === "string" ? sp.barber : undefined;
  const filter = isOwner && visible.some((b) => b.id === requested) ? requested! : null;

  const nowDate = new Date();
  const now = nowDate.getTime();
  const today = toLocal(nowDate, tz).date;
  const date = typeof sp.date === "string" && isLocalDate(sp.date) ? sp.date : today;
  const isToday = date === today;
  const { start, end } = localDayRange(date, tz);
  const ids = visible.map((b) => b.id);

  const [{ data: bookings, error }, { data: offers }] = ids.length
    ? await Promise.all([
        supabase
          .from("bookings")
          .select("id, barber_id, service_id, kind, status, starts_at, ends_at, created_at, price_cents, payment_status, clients(name, phone_e164), services(name_en, name_es)")
          .in("barber_id", ids)
          .gte("starts_at", start.toISOString())
          .lt("starts_at", end.toISOString())
          .neq("status", "cancelled")
          .order("starts_at")
          .returns<BookingRecord[]>(),
        supabase
          .from("barber_services")
          .select("barber_id, service_id, services(name_en, name_es, active, sort_order)")
          .in("barber_id", ids)
          .returns<{ barber_id: string; service_id: string; services: { name_en: string; name_es: string; active: boolean; sort_order: number } | null }[]>(),
      ])
    : [{ data: [] as BookingRecord[], error: null }, { data: [] }];

  const name = (s: { name_en: string; name_es: string } | null) => (s ? (locale === "es" ? s.name_es : s.name_en) : "");

  const rows: DayRow[] = (bookings ?? []).map((b) => {
    const s = timeParts(b.starts_at, tz, locale);
    const startMs = new Date(b.starts_at).getTime();
    const endMs = new Date(b.ends_at).getTime();
    return {
      id: b.id,
      barberId: b.barber_id,
      serviceId: b.service_id,
      kind: b.kind,
      status: b.status,
      startMs,
      endMs,
      startHm: s.hm,
      startPeriod: s.period,
      endHm: timeParts(b.ends_at, tz, locale).hm,
      range: `${formatTime(b.starts_at, tz, locale)} – ${formatTime(b.ends_at, tz, locale)}`,
      durationMin: Math.round((endMs - startMs) / 60_000),
      price: formatMoney(b.price_cents),
      paid: b.payment_status === "paid",
      client: b.clients?.name ?? null,
      phone: b.clients?.phone_e164 ?? null,
      phoneLabel: b.clients?.phone_e164 ? formatPhone(b.clients.phone_e164) : null,
      service: name(b.services),
      isNew: b.kind === "booking" && b.status === "confirmed" && now - new Date(b.created_at).getTime() < NEW_WINDOW_MS,
    };
  });

  const barbers: DayBarber[] = visible.map((b) => ({
    id: b.id,
    name: b.display_name,
    services: (offers ?? [])
      .filter((o) => o.barber_id === b.id && o.services?.active)
      .sort((x, y) => (x.services!.sort_order - y.services!.sort_order) || name(x.services).localeCompare(name(y.services)))
      .map((o) => ({ id: o.service_id, name: name(o.services) })),
  }));

  const href = (day: string, barber: string | null = filter) => {
    const q = new URLSearchParams();
    if (day !== today) q.set("date", day);
    if (barber) q.set("barber", barber);
    const s = q.toString();
    return s ? `/app/day?${s}` : "/app/day";
  };

  const chip = (on: boolean) =>
    `inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
      on ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink hover:border-ink/40"
    }`;
  const arrow =
    "inline-grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-ink/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">{isOwner && isToday ? d.titleOwner : d.titleBarber}</h1>

        {/* Date bar: ‹ · the date · ›, plus a way back to today. */}
        <nav aria-label={t.dayLabel} className="flex w-full items-center gap-3 lg:max-w-md">
          <Link href={href(addDays(date, -1))} scroll={false} className={arrow} aria-label={d.prev}>
            <Chevron dir="left" />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col items-center text-center">
            <p className="text-sm font-medium text-muted" aria-hidden={!isToday}>
              {isToday ? d.today : " "}
            </p>
            <p className="font-semibold" aria-current={isToday ? "date" : undefined}>
              {formatDay(date, locale)}
            </p>
          </div>
          <Link href={href(addDays(date, 1))} scroll={false} className={arrow} aria-label={d.next}>
            <Chevron dir="right" />
          </Link>
        </nav>
        {!isToday && (
          <Link href={href(today)} scroll={false} className="btn-ghost self-center text-sm lg:self-start">
            {d.backToToday}
          </Link>
        )}

        {isOwner && visible.length > 1 && (
          <nav aria-label={d.filterLabel} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden">
            <Link href={href(date, null)} scroll={false} className={chip(!filter)} aria-current={!filter ? "page" : undefined}>
              {d.all}
            </Link>
            {visible.map((b) => (
              <Link key={b.id} href={href(date, b.id)} scroll={false} className={chip(filter === b.id)} aria-current={filter === b.id ? "page" : undefined}>
                {b.display_name}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <DayBoard
        key={date}
        locale={locale}
        shopId={shopId}
        shopName={shop?.name ?? staff.membership.shopName}
        bookingPath={shop ? `/b/${shop.slug}` : null}
        smsEnabled={shop?.sms_enabled ?? false}
        timezone={tz}
        isOwner={isOwner}
        barbers={barbers}
        filter={filter}
        rows={rows}
        isToday={isToday}
        serverNow={now}
        loadFailed={Boolean(error)}
      />
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}
