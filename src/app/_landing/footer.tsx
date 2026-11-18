import Link from "next/link";
import { cacheLife } from "next/cache";
import { LogoMark } from "@/components/brand/logo";
import type { SectionProps } from "./types";
import { CONTACT_ID, Container, focusRing } from "./ui";

const base = `group inline-flex min-h-11 items-center rounded-md text-sm transition-colors duration-200 motion-reduce:transition-none ${focusRing}`;
const link = `${base} text-muted-foreground hover:text-foreground focus-visible:text-foreground`;
/** A 1px underline that draws in from the left on hover and focus (transform only; instant with reduced motion). */
const drawn =
  "relative after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 after:ease-out group-hover:after:scale-x-100 group-focus-visible:after:scale-x-100 motion-reduce:after:transition-none";
const label = "text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground";

/** The year for the © line. Cached so the landing stays a static prerender (no `new Date()` in the shell). */
async function Year() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

/**
 * Footer: its own flat surface a step darker than the page (`.l-foot`), opened by one hairline.
 * The name set large (it links home), what it is and the way to talk to us; the page's sections
 * on the right; then © with the legal pages and the staff door.
 */
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
    <footer className="l-foot pt-[calc(48px+6vh)] pb-[calc(16px+2vh)]">
      <Container>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[minmax(0,1fr)_auto] md:gap-16">
          <div>
            {/* A plain anchor on purpose: a <Link> to the page you are on does nothing, and this one must always land on the home page's top. */}
            <a
              href={prefix || "/"}
              aria-label={t.footerHome}
              className={`-ml-1 inline-flex min-h-12 items-center gap-3 rounded-lg px-1 text-foreground ${focusRing}`}
            >
              <LogoMark className="h-10 w-10 shrink-0 sm:h-12 sm:w-12" />
              <span className="whitespace-nowrap text-[1.875rem] font-semibold leading-none tracking-[-0.035em] sm:text-[2.5rem]">
                Barber Master
              </span>
            </a>
            <p className="mt-5 max-w-[40ch] text-base leading-relaxed text-muted-foreground">{t.footer}</p>
            <a href={`#${CONTACT_ID}`} className={`mt-4 gap-1.5 font-medium text-foreground ${base}`}>
              <span className={drawn}>{t.navCta}</span>
              <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none">
                →
              </span>
            </a>
          </div>

          <nav aria-labelledby="footer-page-title" className="md:min-w-48 md:pt-2">
            <p id="footer-page-title" className={label}>
              {t.footerPage}
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-x-8 md:grid-cols-1">
              {sections.map((s) => (
                <li key={s.href}>
                  <a href={s.href} className={`${link} text-[15px]`}>
                    <span className={drawn}>{s.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-16 flex flex-col gap-1 border-t border-white/10 pt-4 md:mt-20 md:flex-row md:items-center md:justify-between">
          <p className="py-3 text-sm text-muted-foreground">
            © <Year /> Barber Master
          </p>
          <nav aria-label={t.footerLinks}>
            <ul className="flex flex-wrap items-center gap-x-6">
              <li>
                <Link href={`${prefix}/privacy`} transitionTypes={["page"]} className={link}>
                  <span className={drawn}>{t.privacy}</span>
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/terms`} transitionTypes={["page"]} className={link}>
                  <span className={drawn}>{t.terms}</span>
                </Link>
              </li>
              <li>
                <Link href={`/login?lang=${locale}`} transitionTypes={["page"]} className={link}>
                  <span className={drawn}>{t.staffSignIn}</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </Container>
    </footer>
  );
}
