import { PhoneIcon } from "@/components/client-shell";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { formatPhone } from "@/lib/phone";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export type ShopHeaderShop = {
  name: string;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  aboutEn: string;
  aboutEs: string;
};

/**
 * The Shop's own front at the top of /b (M5). The cover runs full-bleed under the shell's
 * glass bar (pulled up by --cbar-h, widened to the window), the round logo overlaps its
 * bottom edge, then the name, the about text and one card with two rows: the address (opens
 * the map) and tap-to-call. Without a cover the header starts under the bar; without a logo
 * an initials disc stands in. A server component, so it adds no client JS; the booking flow
 * places it above step 1. About follows Q35: the Client's language, else the other one
 * (marked with its own lang). It enters once on load (.c-in / .c-in-photo, still under
 * reduced motion).
 */
export function ShopHeader({ shop, locale }: { shop: ShopHeaderShop; locale: Locale }) {
  const t = dictionaries[locale];
  const own = locale === "es" ? shop.aboutEs : shop.aboutEn;
  const other = locale === "es" ? shop.aboutEn : shop.aboutEs;
  const about = own.trim() ? own : other.trim() ? other : "";
  const aboutLang = own.trim() ? undefined : locale === "es" ? "en" : "es";
  const cover = !!shop.coverUrl;

  return (
    <div className="flex flex-col pb-6 lg:pb-5">
      {shop.coverUrl ? (
        // Full window width (the shell clips sideways overflow) and up under the glass bar.
        <div className="c-photo relative mx-[calc(50%-50vw)] -mt-(--cbar-h) h-[clamp(16rem,64vw,28rem)] lg:h-[clamp(15rem,22vw,20rem)]">
          {/* Above the fold on a phone: fetched first, and the fixed height keeps the layout still. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- Storage URLs, already sized on the phone (≤ 1600 px) */}
          <img
            src={shop.coverUrl}
            alt=""
            width={1600}
            height={800}
            fetchPriority="high"
            decoding="async"
            className="c-in-photo absolute inset-0 h-full w-full object-cover"
          />
          {/* A soft top shade so the glass bar sits on the photo, and a hairline to close it. */}
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-black/35 to-transparent" />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-black/10" />
        </div>
      ) : null}

      {cover ? (
        <>
          <div className="c-in relative z-10 -mt-11 flex items-end" style={{ "--i": 1 } as React.CSSProperties}>
            <Logo shop={shop} alt={t.shopLogo(shop.name)} size="size-22 text-2xl" />
          </div>
          <h1 className="c-in mt-4 text-[1.75rem] leading-[1.1] font-semibold tracking-[-0.03em] text-balance" style={{ "--i": 2 } as React.CSSProperties}>
            {shop.name}
          </h1>
        </>
      ) : (
        // No cover: one compact line, a small monogram (or the logo) beside the name.
        <div className="c-in flex items-center gap-3.5 pt-6 lg:pt-8" style={{ "--i": 1 } as React.CSSProperties}>
          <Logo shop={shop} alt={t.shopLogo(shop.name)} size="size-12 text-[0.9375rem]" />
          <h1 className="min-w-0 text-2xl leading-[1.1] font-semibold tracking-[-0.025em] text-balance">{shop.name}</h1>
        </div>
      )}

      {about && (
        <p
          lang={aboutLang}
          className="c-in mt-3 max-w-[60ch] text-[0.9375rem] leading-relaxed text-pretty whitespace-pre-line text-muted"
          style={{ "--i": 3 } as React.CSSProperties}
        >
          {about}
        </p>
      )}

      {(shop.address || shop.phone) && (
        // One compact row: the address (opens the map) and tap-to-call, as two pills that wrap.
        <div className="c-in mt-4 flex flex-wrap gap-2" style={{ "--i": 4 } as React.CSSProperties}>
          {shop.address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(shop.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`c-chip press max-w-full min-w-0 gap-2 pr-3.5! pl-3! text-sm ${focusRing}`}
            >
              <PinIcon />
              <span className="min-w-0 truncate">{shop.address}</span>
              <span className="sr-only">{t.openInMaps}</span>
              <ArrowIcon />
            </a>
          )}
          {shop.phone && (
            <a href={`tel:${shop.phone}`} className={`c-chip press gap-2 pr-3.5! pl-3! text-sm ${focusRing}`}>
              <PhoneIcon />
              <span className="font-mono tabular-nums">{formatPhone(shop.phone)}</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/** Up to two initials for the stand-in disc: "Fresh Cuts Barbershop" → "FC". */
function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** The Shop's logo, or a monogram disc with the card's rim when it has none. */
function Logo({ shop, alt, size }: { shop: ShopHeaderShop; alt: string; size: string }) {
  if (shop.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Storage URLs, already square and ≤ 512 px
      <img src={shop.logoUrl} alt={alt} width={160} height={160} decoding="async" className={`${size} shrink-0 rounded-full bg-surface object-cover ring-4 ring-paper`} />
    );
  }
  return (
    <span aria-hidden="true" className={`c-card ${size} grid shrink-0 place-items-center rounded-full! font-semibold tracking-[-0.02em] text-ink`}>
      {initials(shop.name)}
    </span>
  );
}

function PinIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-muted">
      <path d="M8 16 16 8M9 8h7v7" />
    </svg>
  );
}
