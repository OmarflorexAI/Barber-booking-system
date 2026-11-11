import type { Metadata } from "next";
import { Suspense } from "react";
import { landingDictionaries } from "@/lib/i18n/landing";
import { getLocale } from "@/lib/i18n/server";
import { Closing } from "./_landing/closing";
import { Faq } from "./_landing/faq";
import { Features } from "./_landing/features";
import { Footer } from "./_landing/footer";
import { Gallery } from "./_landing/gallery";
import { Hero } from "./_landing/hero";
import { HowItWorks } from "./_landing/how";
import { Nav } from "./_landing/nav";
import { Offer } from "./_landing/offer";
import { Problem } from "./_landing/problem";
import { Setup } from "./_landing/setup";

const en = landingDictionaries.en;
export const metadata: Metadata = {
  title: { absolute: en.metaTitle },
  description: en.metaDescription,
  openGraph: { title: en.metaTitle, description: en.metaDescription, type: "website", images: ["/landing/booking-services-en.png"] },
};

/** The landing page that sells Barber Master to Shop Owners. Clients use their Shop's /b/<slug> link instead. */
export default function Home() {
  return (
    <Suspense fallback={<div className="landing min-h-screen" />}>
      <Landing />
    </Suspense>
  );
}

async function Landing() {
  const locale = await getLocale();
  const props = { locale, t: landingDictionaries[locale] };
  return (
    <div lang={locale} className="landing min-h-screen overflow-x-clip">
      <Nav {...props} />
      <main>
        <Hero {...props} />
        <Problem {...props} />
        <HowItWorks {...props} />
        <Features {...props} />
        <Setup {...props} />
        <Offer {...props} />
        <Faq {...props} />
        <Closing {...props} />
        <Gallery {...props} />
      </main>
      <Footer {...props} />
    </div>
  );
}
