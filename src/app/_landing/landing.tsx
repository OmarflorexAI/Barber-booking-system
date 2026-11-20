import type { Metadata } from "next";
import { ViewTransition, type ReactNode } from "react";
import { landingText as t } from "@/lib/i18n/landing";
import { SITE_URL } from "@/lib/site";
import { Velaris } from "@/components/ui/velaris";
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

/**
 * Title, description, canonical and Open Graph text. Static, so it lands in <head>.
 * The landing is English only: browsers offer Spanish speakers a translation (the page says
 * lang="en" and nothing opts out of translation). The old /es address forwards to / (next.config.ts).
 */
export const landingMetadata: Metadata = {
  title: { absolute: t.metaTitle },
  description: t.metaDescription,
  alternates: { canonical: "/" },
  openGraph: {
    title: t.metaTitle,
    description: t.metaDescription,
    type: "website",
    url: "/",
    siteName: "Barber Master",
    locale: "en_US",
  },
};

/** Structured data: who we are and the site. No ratings, reviews, prices or offers. */
function JsonLd() {
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
        inLanguage: "en-US",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/`,
        url: `${SITE_URL}/`,
        name: t.metaTitle,
        description: t.metaDescription,
        inLanguage: "en-US",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/**
 * Page-level transitions, one boundary per section: links tagged "page" fade this page out
 * (and back in).
 * Per section, not one box around the whole page: React names only the boundaries on screen,
 * so the browser snapshots the one or two sections in view instead of the full landing.
 * The nav names its own layers (nav.tsx); the phone's screens are nested and stay put.
 */
function Swap({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      default="none"
      enter={{ page: "page-in", default: "none" }}
      exit={{ page: "page-out", default: "none" }}
    >
      {children}
    </ViewTransition>
  );
}

/**
 * The landing page that sells Barber Master to Shop Owners, at /, fully static. Clients use
 * their Shop's /b/<slug> link instead.
 */
export function Landing() {
  const props = { t };
  // The nav is a client component: send it only its own strings, not the whole page's text.
  const navText = { nav: t.nav, navLabel: t.navLabel, navMenu: t.navMenu, navLogin: t.navLogin, navSignup: t.navSignup };
  return (
    <div lang="en" className="landing min-h-screen overflow-x-clip antialiased">
      {/* Coming from the Spanish app or login in the same tab, <html lang> still says "es". */}
      <HtmlLang lang="en" />
      <JsonLd />
      <a
        href="#main"
        className={`sr-only rounded-full bg-white px-4 py-2 text-sm font-medium text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 ${focusRing}`}
      >
        {t.skipLink}
      </a>
      <Nav t={navText} />
      <main id="main">
        <Swap>
          <Hero {...props} />
        </Swap>
        <Swap>
          <Why {...props} />
        </Swap>
        <Swap>
          <Facts {...props} />
        </Swap>
        <Swap>
          <HowItWorks {...props} />
        </Swap>
        <Swap>
          <Setup {...props} />
        </Swap>
        <Swap>
          <FirstMonth {...props} />
        </Swap>
        <Swap>
          <Pricing {...props} />
        </Swap>
        {/* FAQ and Contact share one slow brand gradient behind them (decorative, no text).
            It stays live under the page swap. */}
        <div className="relative isolate">
          <Velaris className="velaris-band" height="100%" speed={1} releaseOffscreen />
          <Swap>
            <Faq {...props} />
          </Swap>
          <Swap>
            <Contact {...props} />
          </Swap>
        </div>
      </main>
      <Swap>
        <Footer {...props} />
      </Swap>
    </div>
  );
}
