import { createClient } from "@/lib/supabase/server";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { toLocal } from "@/server/booking-engine/time";
import { PriceList, type PriceItem } from "./prices-list";

type ServiceRow = { id: string; name_en: string; name_es: string; duration_min: number };
type OfferRow = {
  service_id: string;
  price_cents: number;
  duration_override_min: number | null;
  special_price_cents: number | null;
  special_ends_at: string | null;
};

/**
 * SERVICES & PRICES on the Barber profile (PLAN.md M4 job 3): every active Shop Service in the
 * order Clients see it, with a switch, the price, an optional own duration and a special price
 * with its last day. The page has already checked the Owner; each action checks again in the engine.
 */
export async function PricesSection({ shopId, barberId, locale }: { shopId: string; barberId: string; locale: Locale }) {
  const p = dictionaries[locale].settings.barberProfile.prices;
  const supabase = await createClient();
  const [services, offers, shop] = await Promise.all([
    supabase
      .from("services")
      .select("id, name_en, name_es, duration_min")
      .eq("shop_id", shopId)
      .eq("active", true)
      .order("sort_order")
      .order("name_en")
      .order("id")
      .returns<ServiceRow[]>(),
    supabase
      .from("barber_services")
      .select("service_id, price_cents, duration_override_min, special_price_cents, special_ends_at")
      .eq("shop_id", shopId)
      .eq("barber_id", barberId)
      .returns<OfferRow[]>(),
    supabase.from("shops").select("timezone").eq("id", shopId).maybeSingle<{ timezone: string }>(),
  ]);
  if (services.error || offers.error || shop.error) throw new Error("Couldn't load the Barber's prices");

  const tz = shop.data?.timezone ?? "America/New_York";
  const now = new Date();
  const today = toLocal(now, tz).date;
  const byService = new Map((offers.data ?? []).map((o) => [o.service_id, o]));

  const items: PriceItem[] = (services.data ?? []).map((s) => {
    const o = byService.get(s.id);
    const ends = o?.special_ends_at ? new Date(o.special_ends_at) : null;
    // An ended special is shown as none; saving the row clears it.
    const special =
      o && o.special_price_cents !== null && ends && ends > now
        ? { cents: o.special_price_cents, endDate: toLocal(new Date(ends.getTime() - 1), tz).date }
        : null;
    return {
      serviceId: s.id,
      name: locale === "es" && s.name_es ? s.name_es : s.name_en,
      shopDurationMin: s.duration_min,
      offer: o ? { priceCents: o.price_cents, durationOverrideMin: o.duration_override_min, special } : null,
    };
  });

  return (
    <section aria-labelledby="barber-prices-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="barber-prices-title" className="text-xl font-semibold tracking-tight">
          {p.title}
        </h2>
        <p className="max-w-prose leading-relaxed text-muted">{p.intro}</p>
      </div>
      <PriceList shopId={shopId} barberId={barberId} locale={locale} today={today} items={items} />
    </section>
  );
}
