"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LanguageToggle } from "@/components/language-toggle";
import { NavMenu } from "./nav-menu";
import { FORM_ID, Pole, focusRing, toggleSkin } from "./ui";
import type { SectionProps } from "./types";

/** The wordmark: a small barber pole (it turns on hover) and the name in the signage face. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Pole />
      <span className="font-display text-[19px] font-[800] leading-none tracking-[0.005em] min-[420px]:text-[21px]">Barber Master</span>
    </span>
  );
}

/**
 * A fixed glass bar over the page. Once the visitor scrolls (or swipes) down it
 * eases narrower, shorter and darker; a hairline along its bottom edge fills with the
 * page's scroll progress, and a soft highlight slides behind the link of the section in view.
 */
export function Nav({ locale, t }: SectionProps) {
  const links = [
    { href: "#how", label: t.nav.how },
    { href: "#features", label: t.nav.features },
    { href: "#setup", label: t.nav.setup },
    { href: "#faq", label: t.nav.faq },
  ];
  const bar = useRef<HTMLElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [ind, setInd] = useState({ x: 0, w: 0 });
  const targets = links.map((l) => l.href).join(",");

  useEffect(() => {
    const ids = targets.split(",");
    let queued = false;
    const update = () => {
      queued = false;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const max = document.documentElement.scrollHeight - vh;
      bar.current?.style.setProperty("--page", max > 0 ? (y / max).toFixed(4) : "0");
      setScrolled(y > 24);
      let current: number | null = null;
      ids.forEach((id, i) => {
        const s = document.querySelector(id);
        if (s && s.getBoundingClientRect().top <= vh * 0.4) current = i;
      });
      setActive(current);
    };
    const queue = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    };
  }, [targets]);

  // Slide the highlight under the active link; re-measure when the bar's width changes (shrink, language).
  useEffect(() => {
    const ul = list.current;
    if (!ul) return;
    const measure = () => {
      const a = active === null ? null : (ul.children[active] as HTMLElement | undefined);
      if (a) setInd({ x: a.offsetLeft, w: a.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(ul);
    return () => ro.disconnect();
  }, [active, locale]);

  return (
    <header
      ref={bar}
      className={`bm-nav fixed left-1/2 top-3 z-50 flex -translate-x-1/2 items-center gap-2 rounded-[14px] border border-white/[0.11] pl-3.5 pr-1.5 backdrop-blur-[40px] transition-[max-width,width,height,background-color,box-shadow] duration-[600ms] ease-[cubic-bezier(.2,.7,.2,1)] motion-reduce:transition-none sm:top-4 sm:gap-4 sm:pl-4 ${
        scrolled
          ? "h-[52px] w-[calc(100%-40px)] max-w-[920px] bg-night/85 shadow-[0_18px_40px_-20px_rgba(0,0,0,.9)]"
          : "h-14 w-[calc(100%-24px)] max-w-[1120px] bg-night/45 sm:w-[calc(100%-32px)]"
      }`}
    >
      <Link href="/" className={`group flex min-h-11 shrink-0 items-center rounded-lg text-night-ink ${focusRing}`}>
        <Wordmark />
      </Link>

      <nav aria-label={t.navLabel} className="hidden flex-1 justify-center lg:flex">
        <ul ref={list} className="relative flex items-center gap-0.5">
          {links.map((l, i) => (
            <li key={l.href} className="relative z-10">
              <a
                href={l.href}
                aria-current={i === active ? "location" : undefined}
                className={`inline-flex min-h-9 items-center rounded-lg px-3 text-[14px] font-medium transition-colors duration-200 hover:text-night-ink ${
                  i === active ? "text-night-ink" : "text-night-ink/65"
                } ${focusRing}`}
              >
                {l.label}
              </a>
            </li>
          ))}
          <li
            aria-hidden
            className="absolute inset-y-0 left-0 rounded-lg bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,.08)] transition-[transform,width,opacity] duration-[450ms] ease-[cubic-bezier(.2,.7,.2,1)] motion-reduce:transition-none"
            style={{ width: ind.w, transform: `translateX(${ind.x}px)`, opacity: active === null ? 0 : 1 }}
          />
        </ul>
      </nav>

      <div className="ml-auto flex items-center gap-1 lg:ml-0">
        <div className={`${toggleSkin} [&_button]:rounded-lg [&_button]:px-2 [&_button]:text-[13px] sm:[&_button]:px-3 sm:[&_button]:text-[14px]`}>
          <LanguageToggle locale={locale} label={t.otherLang} />
        </div>
        <a
          href={`#${FORM_ID}`}
          className={`relative inline-flex min-h-10 items-center whitespace-nowrap rounded-[10px] bg-night-ink px-3.5 text-[13px] font-semibold text-night shadow-[0_4px_6px_-2px_rgba(0,0,0,.35)] transition-[background-color,transform] duration-150 hover:-translate-y-px hover:bg-white active:translate-y-px sm:text-[14px] ${focusRing} after:absolute after:-inset-y-1 after:inset-x-0 after:content-['']`}
        >
          {t.navCta}
        </a>
        <NavMenu links={links} label={t.navLabel} buttonLabel={t.navMenu} />
      </div>
    </header>
  );
}
