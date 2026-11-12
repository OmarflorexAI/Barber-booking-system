import type { Metadata } from "next";
import Link from "next/link";
import { ViewTransition } from "react";
import { Wordmark } from "@/components/brand/logo";
import type { Locale } from "@/lib/i18n/dictionaries";
import { landingDictionaries } from "@/lib/i18n/landing";
import { CONTACT_EMAIL, CONTACT_IS_PLACEHOLDER, LAST_UPDATED, LAST_UPDATED_ISO, OPERATOR, legalDictionaries, legalPaths, type LegalPageKey } from "@/lib/i18n/legal";
import { Footer } from "../_landing/footer";
import { HtmlLang } from "../_landing/html-lang";
import { focusRing } from "../_landing/ui";

/**
 * The privacy and terms pages: quiet reading pages in the landing's dark brand. Fully
 * static; the language comes from the route (/privacy vs /es/privacy), never a cookie.
 */

const other = (locale: Locale): Locale => (locale === "en" ? "es" : "en");

/** Static metadata for one legal page in one language: title, description, canonical and the hreflang pair. */
export function legalMetadata(page: LegalPageKey, locale: Locale): Metadata {
  const p = legalDictionaries[locale][page];
  const path = legalPaths[page][locale];
  return {
    title: p.title,
    description: p.metaDescription,
    alternates: { canonical: path, languages: { en: legalPaths[page].en, es: legalPaths[page].es, "x-default": legalPaths[page].en } },
    openGraph: { title: `${p.title} · Barber Master`, description: p.metaDescription, type: "article", url: path, locale: locale === "es" ? "es_US" : "en_US", images: [locale === "es" ? "/es/opengraph-image" : "/opengraph-image"] },
  };
}

const textLink = `inline-flex min-h-11 items-center rounded-md text-sm text-muted-foreground underline decoration-white/30 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground ${focusRing}`;

export function LegalPage({ page, locale }: { page: LegalPageKey; locale: Locale }) {
  const t = legalDictionaries[locale];
  const p = t[page];
  const alt = other(locale);
  return (
    <ViewTransition default="none" enter={{ page: "page-in", default: "none" }} exit={{ page: "page-out", default: "none" }}>
      <div lang={locale} className="landing min-h-screen overflow-x-clip antialiased">
        <HtmlLang lang={locale} />
        <a
          href="#main"
          className={`sr-only rounded-full bg-white px-4 py-2 text-sm font-medium text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 ${focusRing}`}
        >
          {t.skipLink}
        </a>
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
            <Link href={locale === "es" ? "/es" : "/?lang=en"} transitionTypes={["page"]} aria-label={t.back} className={`-ml-1 flex min-h-11 items-center rounded-md px-1 ${focusRing}`}>
              <Wordmark />
            </Link>
            <Link href={legalPaths[page][alt]} hrefLang={alt} lang={alt} className={textLink}>
              {t.otherLang}
            </Link>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl px-6 pb-24 pt-14 outline-none sm:pt-20">
          <article className="max-w-[68ch]">
            <h1 className="text-balance text-4xl font-medium leading-[1.08] tracking-[-0.035em] sm:text-5xl">{p.title}</h1>
            <p className="mt-4 text-sm text-muted-foreground">
              {t.updated}: <time dateTime={LAST_UPDATED_ISO}>{LAST_UPDATED[locale]}</time>
            </p>
            <p className="mt-8 text-pretty text-lg leading-relaxed text-foreground/90">{p.intro}</p>

            {p.sections.map((s, i) => (
              <section key={s.heading} aria-labelledby={`${page}-${i}`} className="mt-12">
                <h2 id={`${page}-${i}`} className="text-balance text-xl font-semibold leading-snug tracking-[-0.015em] sm:text-2xl">
                  {s.heading}
                </h2>
                {s.body.map((para) => (
                  <p key={para} className="mt-4 text-pretty text-base leading-[1.7] text-foreground/80">
                    {para}
                  </p>
                ))}
              </section>
            ))}

            <section aria-labelledby={`${page}-contact`} className="mt-14 rounded-2xl border border-border bg-panel p-6 sm:p-8">
              <h2 id={`${page}-contact`} className="text-xl font-semibold leading-snug tracking-[-0.015em] sm:text-2xl">
                {t.contactLabel}
              </h2>
              <p className="mt-3 text-base leading-[1.7] text-foreground/80">{t.contactBody}</p>
              <p className="mt-3 text-base leading-[1.7]">
                {OPERATOR}
                <br />
                {CONTACT_IS_PLACEHOLDER ? (
                  <span className="break-all">{CONTACT_EMAIL}</span>
                ) : (
                  <a href={`mailto:${CONTACT_EMAIL}`} className={`break-all underline decoration-white/30 underline-offset-4 hover:decoration-foreground ${focusRing}`}>
                    {CONTACT_EMAIL}
                  </a>
                )}
              </p>
            </section>
          </article>
        </main>
        <Footer locale={locale} t={landingDictionaries[locale]} />
      </div>
    </ViewTransition>
  );
}
