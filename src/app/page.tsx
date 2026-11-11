import type { Metadata } from "next";
import { Big_Shoulders, Instrument_Sans } from "next/font/google";
import { Suspense } from "react";
import { landingDictionaries } from "@/lib/i18n/landing";
import { getLocale } from "@/lib/i18n/server";
import { Closing } from "./_landing/closing";
import { Faq } from "./_landing/faq";
import { Features } from "./_landing/features";
import { Footer } from "./_landing/footer";
import { Hero } from "./_landing/hero";
import { HowItWorks } from "./_landing/how";
import { Nav } from "./_landing/nav";
import { Offer } from "./_landing/offer";
import { RevealObserver } from "./_landing/reveal";
import { Setup } from "./_landing/setup";

/* The landing page's own faces: condensed storefront signage for headlines, a calm sans for reading. */
const display = Big_Shoulders({ subsets: ["latin", "latin-ext"], variable: "--ff-display", axes: ["opsz"] });
const body = Instrument_Sans({ subsets: ["latin", "latin-ext"], variable: "--ff-body", axes: ["wdth"] });

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
    <div lang={locale} className={`landing ${display.variable} ${body.variable} min-h-screen overflow-x-clip`}>
      <Nav {...props} />
      <main>
        <Hero {...props} />
        <HowItWorks {...props} />
        <Features {...props} />
        <Setup {...props} />
        <Offer {...props} />
        <Faq {...props} />
        <Closing {...props} />
      </main>
      <Footer {...props} />
      <RevealObserver locale={locale} />
    </div>
  );
}
