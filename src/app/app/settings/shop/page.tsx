import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { formatPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { addDays, toLocal, weekdayOf } from "@/server/booking-engine/time";
import { reporting } from "@/server/engine";
import { ChevronIcon } from "../../_shell/icons";
import { RowsSkeleton } from "../../_shell/skeleton";
import { BackToSettings } from "../_back";
import { focusRing, ownerContext } from "../_owner";
import { CopyLink } from "./copy-link";
import { ShopForm } from "./shop-form";

export const metadata: Metadata = { title: "Shop profile" };

/**
 * Shop profile (Owner only, PLAN.md M5 · job 2): this week at a glance (the Dashboard's own
 * numbers), the form for what Clients see at the top of /b, and the booking link, read-only.
 */
export default function ShopProfilePage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Suspense fallback={<RowsSkeleton rows={8} />}>
        <ShopProfile />
      </Suspense>
    </div>
  );
}

/** The new columns may not be in the generated types yet: read them as optional. */
type ShopRow = {
  slug: string;
  name: string;
  phone: string | null;
  address: string | null;
  about_en?: string | null;
  about_es?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
};

/** The public address: NEXT_PUBLIC_SITE_URL when set, else this request's own origin. */
async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function ShopProfile() {
  const ctx = await ownerContext();
  if (!ctx) return null;
  const { staff, membership, t, locale } = ctx;
  const s = t.settings.shop;
  const d = t.dashboard;

  // The same Monday-to-Sunday New York week, and the same call, as the Dashboard.
  const today = toLocal(new Date(), membership.timezone).date;
  const weekStart = addDays(today, -((weekdayOf(today) + 6) % 7));

  const supabase = await createClient();
  const [shopRes, week, origin] = await Promise.all([
    supabase.from("shops").select("*").eq("id", membership.shopId).single<ShopRow>(),
    reporting().dashboardWeek({ userId: staff.userId, shopId: membership.shopId, weekStart }),
    siteOrigin(),
  ]);
  const shop = shopRes.data;
  if (!shop) throw new Error("Shop not found");
  const url = `${origin}/b/${shop.slug}`;
  const nf = new Intl.NumberFormat(locale === "es" ? "es-US" : "en-US");
  const stats = [
    { label: s.bookings, value: nf.format(week.totals.bookings), testId: "week-bookings" },
    { label: d.walkIns, value: nf.format(week.totals.walkIns), testId: "week-walkins" },
    { label: d.timeSaved, value: d.duration(week.totals.timeSavedMin), testId: "week-timesaved" },
  ];

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <BackToSettings label={t.settings.back} />
        <h1 className="text-2xl font-semibold tracking-[-0.015em]">{s.title}</h1>
        <p className="max-w-prose leading-relaxed text-muted">{s.intro}</p>
      </div>

      <section aria-labelledby="week-title" className="card-depth flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id="week-title" className="text-sm font-medium text-muted">
            {s.weekTitle}
          </h2>
          <Link
            href="/app/dashboard"
            className={`-mr-2 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-medium transition-colors hover:text-muted ${focusRing}`}
          >
            {s.openDashboard}
            <ChevronIcon className="h-5 w-5 text-muted" />
          </Link>
        </div>
        <dl className="grid grid-cols-3 gap-3">
          {stats.map((x) => (
            <div key={x.testId} className="flex min-w-0 flex-col gap-1">
              <dt className="text-sm text-muted">{x.label}</dt>
              <dd data-testid={x.testId} className="font-mono text-2xl leading-tight font-semibold tracking-[-0.02em] tabular-nums">
                {x.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <ShopForm
        locale={locale}
        initial={{
          name: shop.name,
          phone: shop.phone ? formatPhone(shop.phone) : "",
          address: shop.address ?? "",
          aboutEn: shop.about_en ?? "",
          aboutEs: shop.about_es ?? "",
          logoUrl: shop.logo_url ?? null,
          coverUrl: shop.cover_url ?? null,
        }}
      />

      <section aria-labelledby="link-label" className="flex flex-col gap-3 border-t border-line pt-6">
        <h2 id="link-label" className="text-sm font-medium">
          {s.linkLabel}
        </h2>
        <p data-testid="booking-url" className="rounded-md border border-line bg-surface px-4 py-3 font-mono text-base break-all select-all">
          {url}
        </p>
        <p className="text-sm text-muted">{s.linkHint}</p>
        <CopyLink url={url} labels={{ copy: s.copy, copied: s.copied, copyFailed: s.copyFailed }} />
      </section>
    </div>
  );
}
