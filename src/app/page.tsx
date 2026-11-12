import type { Metadata } from "next";
import { Suspense, ViewTransition } from "react";
import { landingDictionaries } from "@/lib/i18n/landing";
import { getLocale } from "@/lib/i18n/server";
import { Contact } from "./_landing/contact";
import { Facts } from "./_landing/facts";
import { Faq } from "./_landing/faq";
import { FirstMonth } from "./_landing/first-month";
import { Footer } from "./_landing/footer";
import { Hero } from "./_landing/hero";
import { HowItWorks } from "./_landing/how";
import { HtmlLang } from "./_landing/html-lang";
import { Nav } from "./_landing/nav";
import { Pricing } from "./_landing/pricing";
import { Setup } from "./_landing/setup";
import { focusRing } from "./_landing/ui";
import { Why } from "./_landing/why";

/** Title, description and Open Graph text in the visitor's language. */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = landingDictionaries[locale];
  return {
    title: { absolute: t.metaTitle },
    description: t.metaDescription,
    openGraph: { title: t.metaTitle, description: t.metaDescription, type: "website", locale: locale === "es" ? "es_US" : "en_US" },
  };
}

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
  const t = landingDictionaries[locale];
  const props = { locale, t };
  return (
    // Page-level transitions: links tagged "page" fade this page out (and back in);
    // the language switch cross-fades the text. Nested ones (the phone) handle their own.
    <ViewTransition
      default="none"
      enter={{ page: "page-in", default: "none" }}
      exit={{ page: "page-out", default: "none" }}
      update={{ "lang-switch": "lang-swap", default: "none" }}
    >
      <div lang={locale} className="landing min-h-screen overflow-x-clip antialiased">
        <HtmlLang lang={locale} />
        <a
          href="#main"
          className={`sr-only rounded-full bg-white px-4 py-2 text-sm font-medium text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 ${focusRing}`}
        >
          {t.skipLink}
        </a>
        <Nav {...props} />
        <main id="main">
          <Hero {...props} />
          <Why {...props} />
          <Facts {...props} />
          <HowItWorks {...props} />
          <Setup {...props} />
          <FirstMonth {...props} />
          <Pricing {...props} />
          <Faq {...props} />
          <Contact {...props} />
        </main>
        <Footer {...props} />
      </div>
    </ViewTransition>
  );
}
