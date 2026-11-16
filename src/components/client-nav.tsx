"use client";

import Link from "next/link";
import { useRef } from "react";
import { useCompactOnScroll } from "@/app/_landing/nav-scroll";
import { LogoMark } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/language-toggle";
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import type { Dictionary, Locale } from "@/lib/i18n/dictionaries";

const focusRing = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink";

/** Only the nav's own strings: this is a client component, so everything it gets is sent to the browser. */
export type ClientNavText = Pick<Dictionary, "otherLang" | "themeSwitch" | "backToSite" | "talkToUs">;

/**
 * The Client pages' top bar: the landing's floating glass nav (the same shadow, rim, glint and
 * glass layers and the same contract-on-scroll, see `.nav-*` in globals.css), in the page's
 * own light or dark theme. Left: the scissors mark, or, for visitors who came from our site
 * (`backHref`), a way back to it with the wordmark. Right: the language switch (a link-style
 * text with the drawn hairline), the dashboard's System/Light/Dark switch, and for site
 * visitors on wider screens the liquid metal "Talk to us".
 */
export function ClientNav({ locale, t, backHref }: { locale: Locale; t: ClientNavText; backHref?: string }) {
  const header = useRef<HTMLElement>(null);
  useCompactOnScroll(header);

  return (
    <header ref={header} className="landing-nav c-nav pointer-events-none sticky top-0 z-40 -mb-(--cbar-h) h-(--cbar-h) w-full">
      <div className="mx-auto max-w-3xl px-3 pt-3">
        <div className="nav-bar pointer-events-auto relative h-16">
          <span aria-hidden="true" className="nav-shadow">
            <span />
          </span>
          <span aria-hidden="true" className="nav-rim" />
          <span aria-hidden="true" className="nav-glint" />
          <span aria-hidden="true" className="nav-glass" />

          <div className="relative flex h-full items-center justify-between gap-2 pr-[11px] pl-3 sm:pl-2">
            <div className="nav-start min-w-0">
              {backHref ? (
                <Link
                  href={backHref}
                  transitionTypes={["page"]}
                  aria-label={t.backToSite}
                  className={`nav-link group flex min-h-11 min-w-0 items-center gap-1.5 rounded-full pr-2 pl-1.5 text-ink ${focusRing}`}
                >
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="c-nav-back h-4 w-4 shrink-0 text-muted">
                    <path d="M12.5 4.5 7 10l5.5 5.5" />
                  </svg>
                  <LogoMark className="h-6 w-6 shrink-0" />
                  <span className="truncate text-[0.9375rem] font-semibold tracking-[-0.02em] max-[419px]:sr-only">Barber Master</span>
                </Link>
              ) : (
                <span className="flex min-h-11 items-center px-1.5">
                  <LogoMark className="h-7 w-7 shrink-0 text-ink" />
                </span>
              )}
            </div>

            <div className="nav-end flex items-center gap-1 sm:gap-2">
              <LanguageToggle locale={locale} label={t.otherLang} className="c-nav-lang" />
              <ThemeSwitcher labels={t.themeSwitch} className="c-nav-theme" />
              {backHref && (
                <span className="hidden md:block">
                  <LiquidMetalButton href={`${backHref === "/es" ? "/es" : "/"}#contact`} size="sm">
                    {t.talkToUs}
                  </LiquidMetalButton>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
