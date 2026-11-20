"use client";

import Link from "next/link";
import { ViewTransition, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Wordmark } from "@/components/brand/logo";
import type { LandingDictionary } from "@/lib/i18n/landing";
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button";
import { useCompactOnScroll } from "./nav-scroll";
import { focusRing } from "./ui";

/** Only the nav's own strings: this is a client component, so everything it gets is sent to the browser. */
type NavText = Pick<LandingDictionary, "nav" | "navLabel" | "navMenu" | "navLogin" | "navSignup">;

/** The page-level transitions the header takes part in: leaving or entering the landing. */
const HEADER_TYPES = { page: "landing-header", default: "none" };

/**
 * The glass, its content row and the menu each get their own transition layer, kept on top and
 * still (`.landing-header` in globals.css), so the swapping sections never draw over the nav.
 * Not the header box itself: a name on an ancestor cuts the glass off from the page behind it.
 * Named only for the page-level types: a hero phone tap names nothing up here, so the browser
 * does not re-snapshot the blurred glass on every tap.
 */
function HeaderLayer({ name, children }: { name: string; children: ReactNode }) {
  return (
    <ViewTransition name={name} default="none" share={HEADER_TYPES} enter={HEADER_TYPES} exit={HEADER_TYPES}>
      {children}
    </ViewTransition>
  );
}

/**
 * A floating glass bar (rim, glint and glass layers, see the `.nav-*` rules): wordmark left,
 * section links centered (hover: muted to ink and a hairline drawn from the centre), the
 * "Log in" and a liquid metal "Sign up" on the right. No language switch: the page is English and
 * browsers offer Spanish speakers a translation.
 * "Talk to us" lives on in the hero and the contact section. Scrolling down contracts it (narrower and shorter),
 * scrolling up opens it again (`useCompactOnScroll` + `.nav-*` rules in globals.css). The
 * header box itself never changes size; only clip and translate move, so nothing below shifts.
 * Below md the links move into a glass card under the bar: Escape or a link tap closes it,
 * Escape gives focus back.
 */
export function Nav({ t }: { t: NavText }) {
  const links = [
    { href: "#how", label: t.nav.how },
    { href: "#setup", label: t.nav.setup },
    { href: "#pricing", label: t.nav.pricing },
    { href: "#faq", label: t.nav.faq },
  ];
  // No ?lang: the login page goes by the saved language, else the browser's.
  const loginHref = "/login";
  const signupHref = "/login?mode=signup";
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  useCompactOnScroll(header);

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

  // The 44px box is the hit area; the visible hover is only the text and its hairline (`.nav-link`).
  const linkClass = `nav-link inline-flex min-h-11 items-center justify-center rounded-full px-2.5 text-sm text-muted-foreground lg:px-3.5 ${focusRing}`;

  return (
    <header
      ref={header}
      id="main-header"
      data-open={open || undefined}
      className="landing-nav sticky top-0 z-40 h-20 w-full"
    >
      <div className="mx-auto max-w-5xl px-3 pt-3 md:px-2">
        <div className="nav-bar relative h-16">
          <span aria-hidden="true" className="nav-shadow">
            <span />
          </span>
          <span aria-hidden="true" className="nav-rim" />
          <span aria-hidden="true" className="nav-glint" />
          <HeaderLayer name="landing-nav-glass">
            <span aria-hidden="true" className="nav-glass" />
          </HeaderLayer>

          <HeaderLayer name="landing-nav-row">
            <div id="main-nav" className="relative flex h-full items-center justify-between gap-2 pl-4 pr-2.5 md:pl-[7px] md:pr-[13px]">
              <div className="nav-start">
                <Link href="/" className={`flex min-h-11 items-center rounded-full px-1.5 ${focusRing}`}>
                  <Wordmark />
                </Link>
              </div>

              <nav aria-label={t.navLabel} className="absolute left-1/2 hidden -translate-x-1/2 md:block">
                <ul className="flex items-center gap-0.5 lg:gap-1">
                  {links.map((l) => (
                    <li key={l.href}>
                      <a href={l.href} className={linkClass}>
                        <span className="nav-link-label">{l.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="nav-end flex items-center gap-1 md:gap-1.5">
                <Link href={loginHref} prefetch={false} className={`nav-link hidden min-h-11 items-center rounded-full px-3 text-sm text-muted-foreground md:inline-flex ${focusRing}`}>
                  <span className="nav-link-label">{t.navLogin}</span>
                </Link>
                <span className="hidden md:block">
                  <LiquidMetalButton href={signupHref} size="sm">
                    {t.navSignup}
                  </LiquidMetalButton>
                </span>
                <button
                  ref={button}
                  type="button"
                  aria-expanded={open}
                  aria-controls={menuId}
                  onClick={() => setOpen((o) => !o)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-white/[0.06] hover:text-foreground aria-expanded:bg-white/[0.08] aria-expanded:text-foreground md:hidden ${focusRing}`}
                >
                  <span className="sr-only">{t.navMenu}</span>
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-5 w-5">
                    {open ? <path d="M6 18 18 6M6 6l12 12" /> : <path d="M3.75 9h16.5m-16.5 6h16.5" />}
                  </svg>
                </button>
              </div>
            </div>
          </HeaderLayer>

          <HeaderLayer name="landing-nav-menu">
            <nav id={menuId} aria-label={t.navLabel} hidden={!open} className="nav-menu absolute inset-x-0 top-full mt-2 rounded-[22px] p-2 md:hidden">
              <ul className="flex flex-col">
                {links.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className={`flex min-h-12 w-full items-center rounded-2xl px-4 text-base text-muted-foreground transition-colors duration-200 hover:bg-white/[0.06] hover:text-foreground ${focusRing}`}
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link
                  href={loginHref}
                  prefetch={false}
                  onClick={() => setOpen(false)}
                  className={`flex min-h-12 items-center justify-center rounded-full border border-white/15 px-4 text-sm font-medium text-foreground transition-colors duration-200 hover:border-white/30 hover:bg-white/[0.06] ${focusRing}`}
                >
                  {t.navLogin}
                </Link>
                <LiquidMetalButton href={signupHref} onClick={() => setOpen(false)} className="w-full">
                  {t.navSignup}
                </LiquidMetalButton>
              </div>
            </nav>
          </HeaderLayer>
        </div>
      </div>
    </header>
  );
}
