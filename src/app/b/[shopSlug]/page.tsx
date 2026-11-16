import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getLocale } from "@/lib/i18n/server";
import { bookingEngine } from "@/server/engine";
import { BookingFlow } from "./booking-flow";
import { ShopHeader } from "./shop-header";

export default function ShopBookingPage(props: PageProps<"/b/[shopSlug]">) {
  return (
    <Suspense fallback={<Loading />}>
      <ShopBooking params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function ShopBooking({ params, searchParams }: { params: Promise<{ shopSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ shopSlug }, query] = await Promise.all([params, searchParams]);
  await connection(); // prices depend on "now" (specials end), so never prerender
  const [locale, catalog] = await Promise.all([getLocale(), bookingEngine().getShopCatalog(shopSlug, new Date())]);
  if (!catalog) notFound();
  // Opened from our landing ("See a real booking page"): the top bar offers the way back.
  const fromSite = query.from === "site";
  return <BookingFlow catalog={catalog} locale={locale} fromSite={fromSite} header={<ShopHeader shop={catalog.shop} locale={locale} />} />;
}

/** Shaped like the first step: the glass bar, the Shop's front, the step counter, a ruled list of Services. */
function Loading() {
  return (
    <div className="client-page flex min-h-dvh w-full flex-col" aria-busy="true">
      {/* The glass nav's shape (client-nav.tsx): mark, language, the three-way theme switch. */}
      <div className="px-3 pt-3">
        <div className="c-bar mx-auto flex h-16 max-w-3xl items-center justify-between gap-2 rounded-full pr-[11px] pl-4">
          <div className="size-7 rounded-full bg-raised" />
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 rounded-full bg-raised" />
            <div className="h-11 w-[8.25rem] rounded-full border border-line" />
          </div>
        </div>
      </div>
      <main className="mx-auto flex w-full max-w-lg flex-col px-4">
        <div className="flex flex-col pt-6 pb-8">
          <div className="size-22 rounded-full bg-raised motion-safe:animate-pulse" />
          <div className="mt-4 h-8 w-56 rounded-md bg-raised motion-safe:animate-pulse" />
          <div className="c-card mt-5 h-[8.1rem]" />
        </div>
        <div className="flex min-h-11 items-center justify-end border-t border-line pt-2">
          <div className="h-4 w-36 rounded-md bg-raised motion-safe:animate-pulse" />
        </div>
        <div className="mt-3 mb-5 h-8 w-52 rounded-md bg-raised motion-safe:animate-pulse" />
        <div className="c-card divide-y divide-line overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex min-h-16 items-center justify-between gap-4 px-4 py-3">
              <div className="flex flex-col gap-2">
                <div className="h-4 w-32 rounded-md bg-raised motion-safe:animate-pulse" />
                <div className="h-3.5 w-16 rounded-md bg-raised motion-safe:animate-pulse" />
              </div>
              <div className="h-4 w-12 rounded-md bg-raised motion-safe:animate-pulse" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
