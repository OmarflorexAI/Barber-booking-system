import type { Metadata } from "next";
import { ViewTransition } from "react";
import type { Locale } from "@/lib/i18n/dictionaries";
import { landingDictionaries } from "@/lib/i18n/landing";
import { SITE_URL } from "@/lib/site";
import { Contact } from "./contact";
import { Facts } from "./facts";
import { Faq } from "./faq";
import { FirstMonth } from "./first-month";
import { Footer } from "./footer";
import { Hero } from "./hero";
import { HowItWorks } from "./how";
import { HtmlLang } from "./html-lang";
import { Nav } from "./nav";
import { Pricing } from "./pricing";
import { Setup } from "./setup";
import { focusRing } from "./ui";
import { Why } from "./why";

/** Each language has its own address: English at /, Spanish at /es. */
export const landingPath = (locale: Locale) => (locale === "es" ? "/es" : "/");

/** Title, description, canonical, hreflang and Open Graph text for one language. Static, so it lands in <head>. */
export function landingMetadata(locale: Locale): Metadata {
  const t = landingDictionaries[locale];
  return {
    title: { absolute: t.metaTitle },
    description: t.metaDescription,
    alternates: {
      canonical: landingPath(locale),
      languages: { en: "/", es: "/es", "x-default": "/" },
    },
    openGraph: {
      title: t.metaTitle,
      description: t.metaDescription,
      type: "website",
      url: landingPath(locale),
      siteName: "Barber Master",
      locale: locale === "es" ? "es_US" : "en_US",
      alternateLocale: locale === "es" ? "en_US" : "es_US",
    },
  };
}

/** Structured data: who we are and the site, in this page's language. No ratings, reviews, prices or offers. */
function JsonLd({ locale }: { locale: Locale }) {
  const t = landingDictionaries[locale];
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "Barber Master", url: `${SITE_URL}/`, logo: `${SITE_URL}/icon.svg` },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "Barber Master",
        url: `${SITE_URL}/`,
        description: t.metaDescription,
        inLanguage: ["en-US", "es-US"],
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}${landingPath(locale)}`,
        url: `${SITE_URL}${landingPath(locale)}`,
        name: t.metaTitle,
        description: t.metaDescription,
        inLanguage: locale === "es" ? "es-US" : "en-US",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/**
 * The landing page that sells Barber Master to Shop Owners, in one language. Used by
 * / (English) and /es (Spanish); both are fully static. Clients use their Shop's /b/<slug> link instead.
 */
export function Landing({ locale }: { locale: Locale }) {
  const t = landingDictionaries[locale];
  const props = { locale, t };
  // The nav is a client component: send it only its own strings, not the whole page's text.
  const navText = { nav: t.nav, navLabel: t.navLabel, navMenu: t.navMenu, navCta: t.navCta, otherLang: t.otherLang };
  return (
    // Page-level transitions: links tagged "page" fade this page out (and back in).
    // The language switch moves between / and /es, so the old page exits and the new one
    // enters: "lang-switch" cross-fades them. Nested ones (the phone) handle their own.
    <ViewTransition
      default="none"
      enter={{ page: "page-in", "lang-switch": "lang-swap", default: "none" }}
      exit={{ page: "page-out", "lang-switch": "lang-swap", default: "none" }}
      update={{ "lang-switch": "lang-swap", default: "none" }}
    >
      <div lang={locale} className="landing min-h-screen overflow-x-clip antialiased">
        <HtmlLang lang={locale} />
        <JsonLd locale={locale} />
        <a
          href="#main"
          className={`sr-only rounded-full bg-white px-4 py-2 text-sm font-medium text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 ${focusRing}`}
        >
          {t.skipLink}
        </a>
        <Nav locale={locale} t={navText} />
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
