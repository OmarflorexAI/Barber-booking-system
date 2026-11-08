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

function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-3 px-4 py-6" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-line" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-line/60" />
      ))}
    </main>
  );
}
