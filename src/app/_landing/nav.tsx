"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Wordmark } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/language-toggle";
import { CONTACT_ID, focusRing, toggleSkin, whitePill } from "./ui";
import type { SectionProps } from "./types";

/**
 * The sticky bar (the template's): wordmark left, section links centered, the language
 * switch and a white "Talk to us" pill on the right. Below md the links move into a
 * disclosure under the bar: Escape or a link tap closes it, Escape gives focus back.
 */
export function Nav({ locale, t }: SectionProps) {
  const links = [
    { href: "#how", label: t.nav.how },
    { href: "#setup", label: t.nav.setup },
    { href: "#pricing", label: t.nav.pricing },
    { href: "#faq", label: t.nav.faq },
  ];
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
      className="sticky top-0 z-40 w-full border-b border-transparent bg-background/80 backdrop-blur-md"
    >
      <div id="main-nav" className="relative mx-auto flex max-w-5xl items-center justify-between gap-2 px-6 py-3">
        <Link href="/" className={`-ml-1 flex min-h-11 items-center rounded-md px-1 ${focusRing}`}>
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
          <div className={toggleSkin}>
            <LanguageToggle locale={locale} label={t.otherLang} />
          </div>
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
