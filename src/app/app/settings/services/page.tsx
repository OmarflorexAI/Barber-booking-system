import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { RowsSkeleton } from "../../_shell/skeleton";
import { BackToSettings } from "../_back";
import { ownerContext } from "../_owner";
import { ServiceList, type ServiceItem } from "./service-list";

export const metadata: Metadata = { title: "Services & prices" };

/**
 * Services & prices (Owner only): the Shop's active Services in the order Clients see them,
 * an Add/Edit sheet, Archive (with a confirm) and up/down reorder. Prices are per Barber (M4).
 */
export default function ServicesPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Suspense fallback={<RowsSkeleton rows={5} />}>
        <Services />
      </Suspense>
    </div>
  );
}

type Row = { id: string; name_en: string; name_es: string; duration_min: number; buffer_min: number };

async function Services() {
  const ctx = await ownerContext();
  if (!ctx) return null;
  const { membership, t, locale } = ctx;
  const s = t.settings.services;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, name_en, name_es, duration_min, buffer_min")
    .eq("shop_id", membership.shopId)
    .eq("active", true)
    .order("sort_order")
    .order("name_en")
    .order("id");
  if (error) throw new Error("Couldn't load the Services");

  const items: ServiceItem[] = ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    nameEn: r.name_en,
    // The engine stores the English name when Spanish is left empty; show the field empty then.
    nameEs: r.name_es === r.name_en ? "" : r.name_es,
    durationMin: r.duration_min,
    bufferMin: r.buffer_min,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <BackToSettings label={t.settings.back} />
        <h1 className="text-2xl font-semibold tracking-[-0.015em]">{s.title}</h1>
        <p className="max-w-prose leading-relaxed text-muted">{s.intro}</p>
      </div>
      <ServiceList shopId={membership.shopId} locale={locale} items={items} />
    </div>
  );
}
