import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getLocale } from "@/lib/i18n/server";
import { bookingEngine } from "@/server/engine";
import { BookingFlow } from "./booking-flow";

export default function ShopBookingPage(props: PageProps<"/b/[shopSlug]">) {
  return (
    <Suspense fallback={<Loading />}>
      <ShopBooking params={props.params} />
    </Suspense>
  );
}

async function ShopBooking({ params }: { params: Promise<{ shopSlug: string }> }) {
  const { shopSlug } = await params;
  await connection(); // prices depend on "now" (specials end), so never prerender
  const [locale, catalog] = await Promise.all([getLocale(), bookingEngine().getShopCatalog(shopSlug, new Date())]);
  if (!catalog) notFound();
  return <BookingFlow catalog={catalog} locale={locale} />;
}

/** Shaped like the first step: the header, the step counter, a ruled list of Services. */
function Loading() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4" aria-busy="true">
      <div className="flex items-start justify-between gap-3 pt-5 pb-4">
        <div className="flex flex-col gap-2">
          <div className="h-6 w-44 rounded-md bg-raised motion-safe:animate-pulse" />
          <div className="h-4 w-56 rounded-md bg-raised motion-safe:animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-11 w-20 rounded-full border border-line" />
          <div className="size-11 rounded-full border border-line" />
        </div>
      </div>
      <div className="flex min-h-11 items-center justify-end border-t border-line pt-2">
        <div className="h-4 w-36 rounded-md bg-raised motion-safe:animate-pulse" />
      </div>
      <div className="mt-3 mb-5 h-8 w-52 rounded-md bg-raised motion-safe:animate-pulse" />
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
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
  );
}
