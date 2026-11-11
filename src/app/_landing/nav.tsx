import Link from "next/link";
import { LanguageToggle } from "@/components/language-toggle";
import { NavMenu } from "./nav-menu";
import { Container, FORM_ID, focusRing, toggleSkin } from "./ui";
import type { SectionProps } from "./types";

/** A barber pole in miniature: a capsule with red, white and blue stripes. */
export function PoleMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-[18px] w-[7px] rounded-full ring-1 ring-white/15 ${className}`}
      style={{
        background:
          "repeating-linear-gradient(135deg, var(--l-red) 0 3px, var(--l-ink) 3px 5px, var(--l-blue) 5px 8px, var(--l-ink) 8px 10px)",
      }}
    />
  );
}

/** The sticky top bar: wordmark, section links (a menu below lg), language and the one action. */
export function Nav({ locale, t }: SectionProps) {
  const links = [
    { href: "#how", label: t.nav.how },
    { href: "#features", label: t.nav.features },
    { href: "#setup", label: t.nav.setup },
    { href: "#faq", label: t.nav.faq },
    { href: "#styles", label: t.nav.styles },
  ];
  const focus = focusRing;

  return (
    <header className="sticky top-0 z-50 border-b border-night-line/70 bg-night/75 backdrop-blur-md supports-[backdrop-filter]:bg-night/60">
      <Container className="flex h-16 items-center gap-2 sm:gap-3">
        <Link
          href="/"
          className={`flex min-h-11 shrink-0 items-center gap-2 rounded-sm text-[15px] font-semibold min-[420px]:text-[17px] tracking-[-0.035em] text-night-ink ${focus}`}
        >
          <PoleMark />
          <span className="leading-none">Barber Master</span>
        </Link>

        <nav aria-label={t.navLabel} className="hidden flex-1 justify-center lg:flex">
          <ul className="flex items-center gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className={`inline-flex min-h-11 items-center rounded-sm px-3 font-mono text-[13px] text-night-muted transition-colors hover:text-night-ink ${focus}`}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2 lg:ml-0">
          {/* Restyle the shared toggle for the dark bar without changing the component. */}
          <div className={`${toggleSkin} [&_button]:text-[12px] sm:[&_button]:px-2.5 sm:[&_button]:text-[13px]`}>
            <LanguageToggle locale={locale} label={t.otherLang} />
          </div>
          <a
            href={`#${FORM_ID}`}
            className={`inline-flex min-h-9 items-center whitespace-nowrap rounded-md bg-night-ink px-2.5 font-mono text-[12px] text-night sm:px-3 sm:text-[13px] transition-colors hover:bg-white ${focus} relative after:absolute after:-inset-y-1 after:inset-x-0 after:content-['']`}
          >
            {t.navCta}
          </a>
          <NavMenu links={links} label={t.navLabel} buttonLabel={t.navMenu} />
        </div>
      </Container>
    </header>
  );
}
