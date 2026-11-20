import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { formatMoney, type Dictionary, type Locale } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { ChevronIcon } from "../_shell/icons";
import { RowsSkeleton } from "../_shell/skeleton";
import { focusRing, ownerContext } from "../settings/_owner";
import { BarberList, type BarberItem } from "../settings/barbers/barber-list";
import { CopyLink } from "../settings/shop/copy-link";
import { siteOrigin } from "../settings/shop/origin";

export const metadata: Metadata = { title: "Shop", robots: { index: false } };

/**
 * The Shop tab (Owner only): the one place to manage the Shop. Three sections, top to bottom:
 * the Shop itself (cover, logo, name, address, booking link → Shop profile), the Barbers (photo
 * or initials, their Services and prices, gallery thumbnails; Add, Delete and the profile, all
 * from the Barber list), and the Services with duration and price (→ Services & prices).
 * The deeper pages still live under /app/settings; the tab bar marks them as this tab's.
 */
export default function ShopPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Suspense fallback={<RowsSkeleton rows={8} />}>
        <Shop />
      </Suspense>
    </div>
  );
}

const MAX_BARBERS = 6;

type ShopRow = {
  slug: string;
  name: string;
  address: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  sms_enabled: boolean;
  plan: string;
};
type ServiceRow = { id: string; name_en: string; name_es: string; duration_min: number; sort_order: number };
type OfferRow = {
  barber_id: string;
  service_id: string;
  price_cents: number;
  special_price_cents: number | null;
  special_ends_at: string | null;
};

/** "Luis Peña" → "LP"; one word → its first letter. */
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

async function Shop() {
  const ctx = await ownerContext();
  if (!ctx) return null;
  const { staff, membership, t, locale } = ctx;
  const s = t.shopTab;
  const { shopId } = membership;

  const supabase = await createClient();
  const [shopRes, barbers, services, offers, hours, gallery, origin] = await Promise.all([
    supabase.from("shops").select("*").eq("id", shopId).single<ShopRow>(),
    supabase
      .from("barbers")
      .select("id, display_name, photo_url")
      .eq("shop_id", shopId)
      .eq("active", true)
      .order("sort_order")
      .order("created_at")
      .order("id")
      .returns<{ id: string; display_name: string; photo_url: string | null }[]>(),
    supabase
      .from("services")
      .select("id, name_en, name_es, duration_min, sort_order")
      .eq("shop_id", shopId)
      .eq("active", true)
      .order("sort_order")
      .order("name_en")
      .order("id")
      .returns<ServiceRow[]>(),
    supabase
      .from("barber_services")
      .select("barber_id, service_id, price_cents, special_price_cents, special_ends_at")
      .eq("shop_id", shopId)
      .returns<OfferRow[]>(),
    supabase.from("weekly_hours").select("barber_id").eq("shop_id", shopId).returns<{ barber_id: string }[]>(),
    supabase
      .from("barber_gallery")
      .select("barber_id, url, position")
      .eq("shop_id", shopId)
      .order("position")
      .returns<{ barber_id: string; url: string; position: number }[]>(),
    siteOrigin(),
  ]);
  const shop = shopRes.data;
  if (!shop || barbers.error || services.error || offers.error || hours.error || gallery.error) throw new Error("Couldn't load the Shop");

  const now = new Date().getTime();
  const serviceList = services.data ?? [];
  const serviceIds = new Set(serviceList.map((x) => x.id));
  const activeBarbers = new Set((barbers.data ?? []).map((b) => b.id));
  // Only active Services offered by active Barbers count.
  const liveOffers = (offers.data ?? []).filter((o) => serviceIds.has(o.service_id) && activeBarbers.has(o.barber_id));
  const special = (o: OfferRow) =>
    o.special_price_cents !== null && o.special_ends_at !== null && Date.parse(o.special_ends_at) > now ? o.special_price_cents : null;
  const serviceName = (x: ServiceRow) => (locale === "es" && x.name_es ? x.name_es : x.name_en);

  const working = new Set((hours.data ?? []).map((h) => h.barber_id));
  const ownId = staff.barber?.id ?? null;
  const items: BarberItem[] = (barbers.data ?? []).map((b) => {
    const mine = liveOffers.filter((o) => o.barber_id === b.id);
    const summary = serviceList
      .map((x) => {
        const o = mine.find((m) => m.service_id === x.id);
        return o ? `${serviceName(x)} ${formatMoney(special(o) ?? o.price_cents)}` : null;
      })
      .filter(Boolean)
      .join(" · ");
    return {
      id: b.id,
      name: b.display_name,
      photoUrl: b.photo_url,
      isYou: b.id === ownId,
      bookable: mine.length > 0 && working.has(b.id),
      summary,
      thumbs: (gallery.data ?? []).filter((g) => g.barber_id === b.id).map((g) => g.url),
    };
  });

  const url = `${origin}/b/${shop.slug}`;
  const barberText = t.settings.barbers;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-[-0.015em]">{s.title}</h1>
        <p className="max-w-prose leading-relaxed text-muted">{s.intro}</p>
      </div>

      <ShopCard s={s} name={shop.name} address={shop.address} logoUrl={shop.logo_url ?? null} coverUrl={shop.cover_url ?? null} url={url} />

      <section aria-labelledby="barbers-title" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4 px-1">
          <h2 id="barbers-title" className="text-lg font-semibold tracking-[-0.01em]">
            {s.barbersTitle}
          </h2>
          <p className="shrink-0 font-mono text-sm text-muted tabular-nums" data-testid="barber-count">
            <span aria-hidden="true">{barberText.count(items.length)}</span>
            <span className="sr-only">{barberText.countLabel(items.length)}</span>
          </p>
        </div>
        <BarberList
          shopId={shopId}
          locale={locale}
          timezone={membership.timezone}
          smsEnabled={shop.sms_enabled && shop.plan === "pro"}
          full={items.length >= MAX_BARBERS}
          items={items}
        />
      </section>

      <ServicesSection s={s} locale={locale} services={serviceList} offers={liveOffers} special={special} serviceName={serviceName} />
    </div>
  );
}

/** The Shop as Clients meet it: cover, logo, name and address, then the booking link. */
function ShopCard(props: { s: Dictionary["shopTab"]; name: string; address: string | null; logoUrl: string | null; coverUrl: string | null; url: string }) {
  const { s } = props;
  return (
    <section aria-labelledby="shop-title" className="card-depth overflow-hidden rounded-[1.25rem] border border-line bg-surface">
      {/* No cover yet: a short band, just enough to seat the logo. */}
      <div className={props.coverUrl ? "aspect-[3/1] bg-raised" : "h-16 bg-raised"}>
        {props.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- Storage URL, already sized for covers
          <img src={props.coverUrl} alt="" className="size-full object-cover" data-testid="shop-cover" />
        )}
      </div>
      <div className="flex flex-col gap-5 px-5 pb-5">
        <div className="flex items-end gap-4">
          <span
            aria-hidden="true"
            className={`-mt-8 grid size-16 shrink-0 place-items-center overflow-hidden rounded-full text-lg ring-4 ring-surface ${props.logoUrl ? "c-avatar-photo bg-surface" : "c-avatar"}`}
          >
            {props.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Storage URL, already square
              <img src={props.logoUrl} alt="" className="size-full object-cover" />
            ) : (
              initials(props.name)
            )}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5 pt-3">
            <h2 id="shop-title" className="truncate text-lg font-semibold tracking-[-0.01em]">
              {props.name}
            </h2>
            <p className={`text-sm leading-snug ${props.address ? "text-muted" : "text-muted italic"}`}>{props.address || s.noAddress}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted">{s.linkLabel}</h3>
          <p data-testid="shop-booking-url" className="rounded-xl bg-raised px-4 py-3 font-mono text-sm break-all select-all">
            {props.url}
          </p>
          <CopyLink url={props.url} labels={{ copy: s.copy, copied: s.copied, copyFailed: s.copyFailed }} />
        </div>
      </div>
      <Link
        href="/app/settings/shop"
        className={`flex min-h-14 items-center justify-between gap-4 border-t border-line px-5 font-medium transition-colors hover:bg-raised ${focusRing} focus-visible:-outline-offset-2`}
      >
        {s.editProfile}
        <ChevronIcon className="h-5 w-5 shrink-0 text-muted" />
      </Link>
    </section>
  );
}

/** Each Service with its length and price: one price, or the range across Barbers, plus a live special. */
function ServicesSection(props: {
  s: Dictionary["shopTab"];
  locale: Locale;
  services: ServiceRow[];
  offers: OfferRow[];
  special: (o: OfferRow) => number | null;
  serviceName: (x: ServiceRow) => string;
}) {
  const { s, services, offers } = props;
  return (
    <section aria-labelledby="services-title" className="flex flex-col gap-3">
      <h2 id="services-title" className="px-1 text-lg font-semibold tracking-[-0.01em]">
        {s.servicesTitle}
      </h2>
      {services.length === 0 ? (
        <p className="card-depth rounded-[1.25rem] border border-line bg-surface px-5 py-4 leading-relaxed text-muted">{s.noServices}</p>
      ) : (
        <ul aria-label={s.servicesLabel} className="c-card divide-y divide-line overflow-hidden">
          {services.map((x) => {
            const mine = offers.filter((o) => o.service_id === x.id);
            const prices = mine.map((o) => o.price_cents);
            const specials = mine.map(props.special).filter((p): p is number => p !== null);
            const low = Math.min(...prices);
            const high = Math.max(...prices);
            const price = prices.length === 0 ? null : low === high ? formatMoney(low) : s.priceRange(formatMoney(low), formatMoney(high));
            return (
              <li key={x.id}>
                <Link href="/app/settings/services" className={`c-row group transition-colors hover:bg-raised ${focusRing} focus-visible:-outline-offset-2`}>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-semibold">{props.serviceName(x)}</span>
                    <span className="font-mono text-sm text-muted tabular-nums">{s.minutes(x.duration_min)}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                    <span className={`font-mono tabular-nums ${price ? "font-semibold" : "text-sm text-muted"}`}>{price ?? s.noPrice}</span>
                    {specials.length > 0 && (
                      <span className="rounded-full bg-raised px-2 py-0.5 font-mono text-xs text-muted tabular-nums">
                        {s.special(formatMoney(Math.min(...specials)))}
                      </span>
                    )}
                  </span>
                  <ChevronIcon className="h-5 w-5 shrink-0 text-muted transition-colors group-hover:text-ink" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Link href="/app/settings/services" className="btn-ghost w-full sm:w-auto sm:self-start">
        {services.length === 0 ? s.addService : s.editServices}
      </Link>
    </section>
  );
}
