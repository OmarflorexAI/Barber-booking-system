import { HtmlLang } from "@/app/_landing/html-lang";
import { Wordmark } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Dictionary, Locale } from "@/lib/i18n/dictionaries";
import { formatPhone } from "@/lib/phone";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/**
 * The frame both Client pages share (/b booking, /m manage): the Shop's name as the lead
 * (1.25rem semibold) with its address and a tap-to-call phone, the language and theme
 * toggles, the content column, and a hairline footer with the Barber Master wordmark.
 * `shopNameAs="h1"` on /b, where the Shop is the page's title; /m keeps its own h1.
 */
export function ClientShell(props: {
  locale: Locale;
  t: Dictionary;
  shop: { name: string; address?: string | null; phone?: string | null } | null;
  shopNameAs?: "h1" | "p";
  children: React.ReactNode;
}) {
  const { locale, t, shop } = props;
  const Name = props.shopNameAs ?? "p";
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 selection:bg-ink selection:text-paper">
      <HtmlLang lang={locale} />
      <header className="flex items-start justify-between gap-3 pt-5 pb-3">
        <div className="min-w-0">
          {shop && <Name className="text-xl leading-tight font-semibold tracking-[-0.015em] text-balance">{shop.name}</Name>}
          {shop?.address && <p className="mt-1 text-sm text-muted">{shop.address}</p>}
          {shop?.phone && (
            <a
              href={`tel:${shop.phone}`}
              className={`-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-sm text-muted underline-offset-4 hover:text-ink hover:underline ${focusRing}`}
            >
              <PhoneIcon />
              <span className="font-mono tabular-nums">{formatPhone(shop.phone)}</span>
            </a>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageToggle locale={locale} label={t.otherLang} />
          <ThemeToggle label={t.themeDark} />
        </div>
      </header>
      <main className="flex flex-1 flex-col">{props.children}</main>
      <footer className="mt-8 flex justify-center border-t border-line py-6 text-muted">
        <span className="sr-only">{t.manage.poweredBy}</span>
        <span aria-hidden="true">
          <Wordmark className="scale-90" />
        </span>
      </footer>
    </div>
  );
}

export function PhoneIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6.6 3.5h-2a1.5 1.5 0 0 0-1.5 1.6 16.5 16.5 0 0 0 15.8 15.8 1.5 1.5 0 0 0 1.6-1.5v-2a1.5 1.5 0 0 0-1.2-1.5l-3-.7a1.5 1.5 0 0 0-1.5.5l-.9 1.1a12 12 0 0 1-5.7-5.7l1.1-.9a1.5 1.5 0 0 0 .5-1.5l-.7-3A1.5 1.5 0 0 0 6.6 3.5Z" />
    </svg>
  );
}
