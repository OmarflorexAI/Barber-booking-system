import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { RowsSkeleton } from "../../_shell/skeleton";
import { BackToSettings } from "../_back";
import { ownerContext } from "../_owner";
import { BarberList, type BarberItem } from "./barber-list";

export const metadata: Metadata = { title: "Barbers" };

/**
 * Barbers (Owner only, PLAN.md M3): the Shop's active Barbers with photo or initials, "You" on the
 * Owner's own Barber and "Not bookable yet" until they have a priced Service and weekly hours;
 * an Add sheet (name; photo and phone optional; 6 at most) and Delete behind a confirm. The
 * phone is never read here: it is Owner-only and stays out of every list.
 */
export default function BarbersPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Suspense fallback={<RowsSkeleton rows={4} />}>
        <Barbers />
      </Suspense>
    </div>
  );
}

const MAX_BARBERS = 6;

async function Barbers() {
  const ctx = await ownerContext();
  if (!ctx) return null;
  const { staff, membership, t, locale } = ctx;
  const s = t.settings.barbers;
  const { shopId } = membership;

  const supabase = await createClient();
  const [barbers, offers, hours, shop] = await Promise.all([
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
      .from("barber_services")
      .select("barber_id, services(active)")
      .eq("shop_id", shopId)
      .returns<{ barber_id: string; services: { active: boolean } | null }[]>(),
    supabase.from("weekly_hours").select("barber_id").eq("shop_id", shopId).returns<{ barber_id: string }[]>(),
    supabase.from("shops").select("sms_enabled, plan").eq("id", shopId).maybeSingle<{ sms_enabled: boolean; plan: string }>(),
  ]);
  if (barbers.error || offers.error || hours.error) throw new Error("Couldn't load the Barbers");

  const priced = new Set((offers.data ?? []).filter((o) => o.services?.active).map((o) => o.barber_id));
  const working = new Set((hours.data ?? []).map((h) => h.barber_id));
  const ownId = staff.barber?.id ?? null;

  const items: BarberItem[] = (barbers.data ?? []).map((b) => ({
    id: b.id,
    name: b.display_name,
    photoUrl: b.photo_url,
    isYou: b.id === ownId,
    bookable: priced.has(b.id) && working.has(b.id),
  }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <BackToSettings label={t.settings.back} />
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-[-0.015em]">{s.title}</h1>
          <p className="shrink-0 font-mono text-sm text-muted tabular-nums" data-testid="barber-count">
            <span aria-hidden="true">{s.count(items.length)}</span>
            <span className="sr-only">{s.countLabel(items.length)}</span>
          </p>
        </div>
        <p className="max-w-prose leading-relaxed text-muted">{s.intro}</p>
      </div>
      <BarberList
        shopId={shopId}
        locale={locale}
        timezone={membership.timezone}
        smsEnabled={(shop.data?.sms_enabled && shop.data.plan === "pro") ?? false}
        full={items.length >= MAX_BARBERS}
        items={items}
      />
    </div>
  );
}
