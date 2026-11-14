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
 * The Shop's own front at the top of /b (M5): cover, round logo, name, address with a map
 * link, tap-to-call and the about text. A server component, so it adds no client JS; the
 * booking flow places it above step 1. Every part is left out when the Owner hasn't set it.
 * About follows Q35: the Client's language, else the other one (marked with its own lang).
 */
export function ShopHeader({ shop, locale }: { shop: ShopHeaderShop; locale: Locale }) {
  const t = dictionaries[locale];
  const own = locale === "es" ? shop.aboutEs : shop.aboutEn;
  const other = locale === "es" ? shop.aboutEn : shop.aboutEs;
  const about = own.trim() ? own : other.trim() ? other : "";
  const aboutLang = own.trim() ? undefined : locale === "es" ? "en" : "es";

  return (
    <div className="flex flex-col pb-4">
      {shop.coverUrl && (
        // Above the fold on a phone: fetched first, and the fixed ratio keeps the layout still.
        // eslint-disable-next-line @next/next/no-img-element -- Storage URLs, already sized on the phone (≤ 1600 px)
        <img
          src={shop.coverUrl}
          alt=""
          width={1600}
          height={800}
          fetchPriority="high"
          decoding="async"
          className="aspect-[2/1] w-full rounded-2xl border border-line bg-raised object-cover"
        />
      )}
      {/* Only rendered with a logo, so a Shop without one gets no empty box. */}
      {shop.logoUrl && (
        <div className={`flex items-end gap-3 ${shop.coverUrl ? "-mt-10 pl-3" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Storage URLs, already square and ≤ 512 px */}
          <img
            src={shop.logoUrl}
            alt={t.shopLogo(shop.name)}
            width={160}
            height={160}
            decoding="async"
            className="size-20 shrink-0 rounded-full border-4 border-paper bg-surface object-cover"
          />
        </div>
      )}
      <h1 className={`text-xl leading-tight font-semibold tracking-[-0.015em] text-balance ${shop.logoUrl ? "mt-2" : shop.coverUrl ? "mt-4" : ""}`}>
        {shop.name}
      </h1>
      {(shop.address || shop.phone) && (
        <div className="mt-1 flex flex-col items-start">
          {shop.address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(shop.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-left text-sm text-muted underline-offset-4 hover:text-ink hover:underline ${focusRing}`}
            >
              <PinIcon />
              <span>{shop.address}</span>
              <span className="sr-only">{t.openInMaps}</span>
            </a>
          )}
          {shop.phone && (
            <a
              href={`tel:${shop.phone}`}
              className={`-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-sm text-muted underline-offset-4 hover:text-ink hover:underline ${focusRing}`}
            >
              <PhoneIcon />
              <span className="font-mono tabular-nums">{formatPhone(shop.phone)}</span>
            </a>
          )}
        </div>
      )}
      {about && (
        <p lang={aboutLang} className="mt-2 max-w-[65ch] text-base leading-relaxed text-pretty whitespace-pre-line">
          {about}
        </p>
      )}
    </div>
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
