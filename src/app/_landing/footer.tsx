import Link from "next/link";
import { cacheLife } from "next/cache";
import { Wordmark } from "@/components/brand/logo";
import type { SectionProps } from "./types";
import { CONTACT_ID, Container, focusRing } from "./ui";

const base = `inline-flex min-h-11 items-center rounded-md text-sm transition-colors motion-reduce:transition-none ${focusRing}`;
const link = `${base} text-muted-foreground hover:text-foreground`;

/** The year for the © line. Cached so the landing stays a static prerender (no `new Date()` in the shell). */
async function Year() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

/** Footer: the name and what it is, the page's sections, then © with the legal pages and the staff door. */
export function Footer({ locale, t }: SectionProps) {
  // The legal pages come in both languages: Spanish pages link to /es/privacy and /es/terms.
  const prefix = locale === "es" ? "/es" : "";
  const sections = [
    { href: "#how", label: t.nav.how },
    { href: "#setup", label: t.nav.setup },
    { href: "#pricing", label: t.nav.pricing },
    { href: "#faq", label: t.nav.faq },
  ];
  return (
    <footer className="l-rise pt-[calc(32px+5vh)] pb-[calc(16px+2vh)]">
      <Container>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_auto] md:gap-16">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-[44ch] text-sm leading-relaxed text-muted-foreground">{t.footer}</p>
            <a href={`#${CONTACT_ID}`} className={`group mt-3 gap-1.5 font-medium text-foreground ${base}`}>
              {t.navCta}
              <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none">
                →
              </span>
            </a>
          </div>

          <nav aria-labelledby="footer-page-title" className="md:min-w-44">
            <p id="footer-page-title" className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {t.footerPage}
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-x-6 md:grid-cols-1">
              {sections.map((s) => (
                <li key={s.href}>
                  <a href={s.href} className={link}>
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
          <p className="py-3 text-sm text-muted-foreground">
            © <Year /> Barber Master
          </p>
          <nav aria-label={t.footerLinks}>
            <ul className="flex flex-wrap items-center gap-x-6">
              <li>
                <Link href={`${prefix}/privacy`} transitionTypes={["page"]} className={link}>
                  {t.privacy}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/terms`} transitionTypes={["page"]} className={link}>
                  {t.terms}
                </Link>
              </li>
              <li>
                <Link href="/login" transitionTypes={["page"]} className={link}>
                  {t.staffSignIn}
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </Container>
    </footer>
  );
}
