"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { addTransitionType, startTransition, useEffect, useId, useRef, useState } from "react";
import { Wordmark } from "@/components/brand/logo";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/dictionaries";
import type { LandingDictionary } from "@/lib/i18n/landing";
import { CONTACT_ID, focusRing, whitePill } from "./ui";

/** Only the nav's own strings: this is a client component, so everything it gets is sent to the browser. */
type NavText = Pick<LandingDictionary, "nav" | "navLabel" | "navMenu" | "navCta" | "otherLang">;

/**
 * The sticky bar (the template's): wordmark left, section links centered, the language
 * switch and a white "Talk to us" pill on the right. Below md the links move into a
 * disclosure under the bar: Escape or a link tap closes it, Escape gives focus back.
 */
export function Nav({ locale, t }: { locale: Locale; t: NavText }) {
  const other: Locale = locale === "en" ? "es" : "en";
  const links = [
    { href: "#how", label: t.nav.how },
    { href: "#setup", label: t.nav.setup },
    { href: "#pricing", label: t.nav.pricing },
    { href: "#faq", label: t.nav.faq },
  ];
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!header.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const linkClass = `inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground ${focusRing}`;

  return (
    <header
      ref={header}
      id="main-header"
      className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md [view-transition-name:landing-header]"
    >
      <div id="main-nav" className="relative mx-auto flex max-w-5xl items-center justify-between gap-2 px-6 py-3">
        <Link href={locale === "es" ? "/es" : "/"} className={`-ml-1 flex min-h-11 items-center rounded-md px-1 ${focusRing}`}>
          <Wordmark />
        </Link>

        <nav aria-label={t.navLabel} className="absolute left-1/2 hidden -translate-x-1/2 md:block">
          <ul className="flex items-center gap-7">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className={linkClass}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1 md:gap-2">
          {/* The other language is another page (/ or /es). With JS: save the choice, then go to
              the clean URL in a "lang-switch" transition (cross-fades the two pages). Without JS the
              href's ?lang=en has the proxy save it. No prefetch: a prefetch of / would still carry
              the old choice and come back redirected. */}
          <Link
            href={other === "es" ? "/es" : "/?lang=en"}
            prefetch={false}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              e.preventDefault();
              document.cookie = `${LOCALE_COOKIE}=${other}; path=/; max-age=31536000; samesite=lax`;
              startTransition(() => {
                addTransitionType("lang-switch");
                router.push(other === "es" ? "/es" : "/");
              });
            }}
            hrefLang={other}
            lang={other}
            className={`inline-flex min-h-11 items-center rounded-full px-3 text-sm text-muted-foreground transition-colors hover:text-foreground ${focusRing}`}
          >
            {t.otherLang}
          </Link>
          <span className="hidden md:block">
            <a href={`#${CONTACT_ID}`} className={whitePill}>
              {t.navCta}
            </a>
          </span>
          <button
            ref={button}
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((o) => !o)}
            className={`-mr-2 flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-panel hover:text-foreground aria-expanded:text-foreground md:hidden ${focusRing}`}
          >
            <span className="sr-only">{t.navMenu}</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-5 w-5">
              {open ? <path d="M6 18 18 6M6 6l12 12" /> : <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />}
            </svg>
          </button>
        </div>
      </div>

      <nav id={menuId} aria-label={t.navLabel} hidden={!open} className="border-t border-border bg-background px-6 pb-5 pt-2 md:hidden">
        <ul className="flex flex-col">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setOpen(false)} className={`flex min-h-12 w-full items-center rounded-md text-base text-muted-foreground transition-colors hover:text-foreground ${focusRing}`}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <a href={`#${CONTACT_ID}`} onClick={() => setOpen(false)} className={`${whitePill} mt-3 w-full`}>
          {t.navCta}
        </a>
      </nav>
    </header>
  );
}
