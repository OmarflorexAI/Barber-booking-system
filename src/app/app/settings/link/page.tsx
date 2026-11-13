import type { Metadata } from "next";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { RowsSkeleton } from "../../_shell/skeleton";
import { BackToSettings } from "../_back";
import { ownerContext } from "../_owner";
import { LinkActions } from "./link-actions";

export const metadata: Metadata = { title: "Booking link & QR code" };

/**
 * Booking link & QR code (Owner only): the Shop's /b/<slug> address with Copy and Share, its
 * QR code, and Print. Printing shows only the counter sign (Shop name, QR, "Book your next
 * cut" in both languages, the short link); the print rules hide the app shell.
 */
export default function LinkPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Suspense fallback={<RowsSkeleton rows={4} />}>
        <BookingLink />
      </Suspense>
    </div>
  );
}

/** The public address: NEXT_PUBLIC_SITE_URL when set, else this request's own origin. */
async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function BookingLink() {
  const ctx = await ownerContext();
  if (!ctx) return null;
  const { membership, t } = ctx;
  const s = t.settings.link;

  const supabase = await createClient();
  const { data: shop } = await supabase.from("shops").select("slug").eq("id", membership.shopId).single<{ slug: string }>();
  if (!shop) throw new Error("Shop not found");

  const url = `${await siteOrigin()}/b/${shop.slug}`;
  const shortUrl = url.replace(/^https?:\/\//, "");
  // Black on white in both themes: phone cameras read a dark-on-light code most reliably.
  const svg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
  const qr = (className: string) => (
    <div role="img" aria-label={s.qrLabel} className={className} dangerouslySetInnerHTML={{ __html: svg }} />
  );

  return (
    <>
      {/* Print: only the counter sign, on white, one page. */}
      <style>{`@media print {
  @page { margin: 16mm; }
  html, body { background: white !important; }
  body * { visibility: hidden !important; }
  .qr-sign, .qr-sign * { visibility: visible !important; }
  .qr-sign { position: fixed; inset: 0; display: flex !important; }
}`}</style>

      <div className="flex flex-col gap-8 print:hidden">
        <div className="flex flex-col gap-2">
          <BackToSettings label={t.settings.back} />
          <h1 className="text-2xl font-semibold tracking-[-0.015em]">{s.title}</h1>
          <p className="max-w-prose leading-relaxed text-muted">{s.intro}</p>
        </div>

        <section aria-labelledby="link-label" className="flex flex-col gap-3">
          <h2 id="link-label" className="text-sm font-medium">
            {s.linkLabel}
          </h2>
          <p data-testid="booking-url" className="rounded-md border border-line bg-surface px-4 py-3 font-mono text-base break-all select-all">
            {url}
          </p>
          <LinkActions url={url} shopName={membership.shopName} labels={s} />
        </section>

        <section className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-6">
          {/* A white tile around the code so it scans in dark mode too. */}
          <div className="rounded-xl bg-white p-4">{qr("h-48 w-48 [&>svg]:h-full [&>svg]:w-full")}</div>
          <p className="font-mono text-sm text-muted">{shortUrl}</p>
        </section>
      </div>

      <div className="qr-sign hidden flex-col items-center justify-center gap-8 bg-white text-center text-black">
        <p className="text-3xl font-semibold">{membership.shopName}</p>
        {qr("h-[9cm] w-[9cm] [&>svg]:h-full [&>svg]:w-full")}
        <div className="flex flex-col gap-2">
          <p className="text-4xl font-semibold tracking-[-0.015em]">{s.posterTitle}</p>
          <p className="text-2xl">{s.posterTitleAlt}</p>
        </div>
        <p className="font-mono text-xl">{shortUrl}</p>
        <p className="text-base">{s.posterScan}</p>
      </div>
    </>
  );
}
