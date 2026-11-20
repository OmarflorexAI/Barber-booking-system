import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { RowsSkeleton } from "../../../_shell/skeleton";
import { focusRing, ownerContext } from "../../_owner";
import { GallerySection } from "./gallery-section";
import { HoursSection } from "./hours-section";
import { PricesSection } from "./prices-section";
import { ProfileSection } from "./profile-section";

export const metadata: Metadata = { title: "Barber" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One Barber's page (Owner only, PLAN.md M4): everything Clients see about them, in four
 * sections: Profile, Work photos, Services & prices, Hours & days off. A Barber from another
 * Shop (or an unknown id) is a 404.
 */
export default function BarberProfilePage({ params }: PageProps<"/app/settings/barbers/[barberId]">) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Suspense fallback={<RowsSkeleton rows={6} />}>
        <BarberProfile params={params} />
      </Suspense>
    </div>
  );
}

type BarberRow = {
  id: string;
  display_name: string;
  photo_url: string | null;
  bio: string | null;
  bio_es?: string | null;
  instagram?: string | null;
  specialties: string[] | null;
  phone_e164: string | null;
  email?: string | null;
};

async function BarberProfile({ params }: { params: Promise<{ barberId: string }> }) {
  const ctx = await ownerContext();
  if (!ctx) return null;
  const { staff, membership, t, locale } = ctx;
  const bp = t.settings.barberProfile;
  const { shopId } = membership;
  const { barberId } = await params;
  if (!UUID.test(barberId)) notFound();

  const supabase = await createClient();
  const [barber, gallery] = await Promise.all([
    supabase.from("barbers").select("*").eq("id", barberId).eq("shop_id", shopId).eq("active", true).maybeSingle<BarberRow>(),
    supabase
      .from("barber_gallery")
      .select("url")
      .eq("shop_id", shopId)
      .eq("barber_id", barberId)
      .order("position")
      .returns<{ url: string }[]>(),
  ]);
  if (barber.error || gallery.error) throw new Error("Couldn't load the Barber");
  const b = barber.data;
  if (!b) notFound();
  const isYou = staff.barber?.id === b.id;

  const sectionCls = "flex flex-col gap-5 border-t border-line pt-6";

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <Link
          href="/app/shop"
          className={`-ml-2 inline-flex min-h-11 items-center gap-1 self-start rounded-md px-2 text-sm font-medium text-muted transition-colors hover:text-ink ${focusRing}`}
        >
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="m15 6-6 6 6 6" />
          </svg>
          {t.shopTab.title}
        </Link>
        <div className="flex min-w-0 items-center gap-4">
          <span aria-hidden="true" className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-surface text-lg font-semibold text-muted">
            {b.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- Storage URLs, already square and ≤ 512 px
              <img src={b.photo_url} alt="" className="size-full object-cover" />
            ) : (
              initials(b.display_name)
            )}
          </span>
          <h1 className="min-w-0 text-2xl font-semibold tracking-[-0.015em] break-words">{b.display_name}</h1>
          {isYou && <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs font-medium text-muted">{bp.you}</span>}
        </div>
      </div>

      <section aria-labelledby="profile-title" className={sectionCls}>
        <div className="flex flex-col gap-1">
          <h2 id="profile-title" className="text-xl font-semibold tracking-tight">
            {bp.profile.title}
          </h2>
          <p className="max-w-prose leading-relaxed text-muted">{bp.profile.intro}</p>
        </div>
        <ProfileSection
          shopId={shopId}
          barberId={b.id}
          locale={locale}
          initial={{
            name: b.display_name,
            photoUrl: b.photo_url,
            bio: b.bio ?? "",
            bioEs: b.bio_es ?? "",
            specialties: b.specialties ?? [],
            instagram: (b.instagram ?? "").replace(/^@/, ""),
            phone: b.phone_e164 ? formatPhone(b.phone_e164) : "",
            email: b.email ?? "",
          }}
        />
      </section>

      <section aria-labelledby="gallery-title" className={sectionCls}>
        <div className="flex flex-col gap-1">
          <h2 id="gallery-title" className="text-xl font-semibold tracking-tight">
            {bp.gallery.title}
          </h2>
          <p className="max-w-prose leading-relaxed text-muted">{bp.gallery.intro}</p>
        </div>
        <GallerySection shopId={shopId} barberId={b.id} locale={locale} initial={(gallery.data ?? []).map((g) => g.url)} />
      </section>

      <div className="border-t border-line pt-6">
        <Suspense fallback={<RowsSkeleton rows={4} />}>
          <PricesSection shopId={shopId} barberId={b.id} locale={locale} />
        </Suspense>
      </div>

      <div className="border-t border-line pt-6">
        <Suspense fallback={<RowsSkeleton rows={7} />}>
          <HoursSection shopId={shopId} barberId={b.id} locale={locale} />
        </Suspense>
      </div>
    </div>
  );
}

/** "Luis Peña" → "LP"; one word → its first letter. */
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
