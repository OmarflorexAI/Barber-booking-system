import Link from "next/link";
import { LanguageToggle } from "@/components/language-toggle";
import type { SectionProps } from "./types";
import { Wordmark } from "./nav";
import { Container, focusRing, toggleSkin } from "./ui";

const link = `inline-flex min-h-11 items-center rounded-sm text-[15px] text-night-muted transition-colors hover:text-night-ink ${focusRing}`;

/** Footer: the name, what it is, the page's sections, the staff door and the language switch. */
export function Footer({ locale, t }: SectionProps) {
  const anchors = [
    ["#how", t.nav.how],
    ["#features", t.nav.features],
    ["#setup", t.nav.setup],
    ["#faq", t.nav.faq],
  ] as const;

  return (
    <footer>
      <Container className="grid gap-10 py-14 sm:py-16 md:grid-cols-[minmax(0,1fr)_auto_auto] md:gap-20">
        <div>
          <p className="group w-max">
            <Wordmark />
          </p>
          <p className="mt-4 max-w-[38ch] text-[15px] leading-[1.6] text-night-muted">{t.footer}</p>
        </div>

        <ul className="grid grid-cols-2 gap-x-8 md:grid-cols-1">
          {anchors.map(([href, label]) => (
            <li key={href}>
              <a href={href} className={link}>
                {label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-start gap-3">
          <Link href="/login" className={link}>
            {t.staffSignIn}
          </Link>
          {/* Same plain text as the nav; the negative margin lines its text up with the links above. */}
          <div className={`${toggleSkin} -ml-2 [&_button]:text-sm`}>
            <LanguageToggle locale={locale} label={t.otherLang} />
          </div>
        </div>
      </Container>
    </footer>
  );
}
