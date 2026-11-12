import Link from "next/link";
import { Wordmark } from "@/components/brand/logo";
import type { SectionProps } from "./types";
import { Container, focusRing } from "./ui";

const link = `inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground ${focusRing}`;

/** Footer: the name, what it is, the legal pages and the staff door. */
export function Footer({ t }: SectionProps) {
  return (
    <footer className="border-t border-border py-12">
      <Container className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <Wordmark />
          <p className="mt-3 max-w-[44ch] text-sm leading-relaxed text-muted-foreground">{t.footer}</p>
        </div>
        <nav aria-label={t.footerLinks}>
          <ul className="flex flex-wrap items-center gap-x-6">
            <li>
              <Link href="/privacy" transitionTypes={["page"]} className={link}>
                {t.privacy}
              </Link>
            </li>
            <li>
              <Link href="/terms" transitionTypes={["page"]} className={link}>
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
      </Container>
    </footer>
  );
}
