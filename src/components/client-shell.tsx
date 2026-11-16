import { HtmlLang } from "@/app/_landing/html-lang";
import { Wordmark } from "@/components/brand/logo";
import { ClientNav } from "@/components/client-nav";
import type { Dictionary, Locale } from "@/lib/i18n/dictionaries";
import { formatPhone } from "@/lib/phone";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/**
 * The frame both Client pages share (/b booking, /m manage). The landing's glass nav floats
 * over the top (ClientNav: the mark or a way back to our site, language, the theme switch);
 * it takes no room in the flow, so the Shop's cover photo on /b can run full-bleed underneath it. Below it the
 * Shop's name (1.25rem semibold) with its address and a tap-to-call phone, the content
 * column, and a hairline footer with the Barber Master wordmark. `shopNameAs="h1"` on /b,
 * where the Shop is the page's title; /m keeps its own h1. Styles: the "Client pages
 * (premium)" block in globals.css, whose header comment is the recipe for these screens.
 */
export function ClientShell(props: {
  locale: Locale;
  t: Dictionary;
  shop: { name: string; address?: string | null; phone?: string | null } | null;
  shopNameAs?: "h1" | "p";
  /** Set when the visitor came from our landing: the bar's mark becomes a pill back to it. */
  backHref?: string;
  children: React.ReactNode;
}) {
  const { locale, t, shop } = props;
  const Name = props.shopNameAs ?? "p";
  return (
    <div className="client-page relative flex min-h-dvh w-full flex-col overflow-x-clip">
      <HtmlLang lang={locale} />
      <ClientNav locale={locale} t={{ otherLang: t.otherLang, themeSwitch: t.themeSwitch, backToSite: t.backToSite, talkToUs: t.talkToUs }} backHref={props.backHref} />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-(--cbar-h)">
        {shop && (
          <div className="c-in flex flex-col items-start pt-6 pb-4">
            <Name className="text-xl leading-tight font-semibold tracking-[-0.02em] text-balance">{shop.name}</Name>
            {shop.address && <p className="mt-1 text-sm text-muted">{shop.address}</p>}
            {shop.phone && (
              <a
                href={`tel:${shop.phone}`}
                className={`-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-sm text-muted transition-colors hover:text-ink ${focusRing}`}
              >
                <PhoneIcon />
                <span className="c-link font-mono tabular-nums">{formatPhone(shop.phone)}</span>
              </a>
            )}
          </div>
        )}
        <main className="flex flex-1 flex-col">{props.children}</main>
      </div>
      <footer className="mt-12 border-t border-line">
        <div className="mx-auto flex max-w-lg justify-center px-4 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-muted">
          <span className="sr-only">{t.manage.poweredBy}</span>
          <span aria-hidden="true">
            <Wordmark className="scale-90" />
          </span>
        </div>
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
