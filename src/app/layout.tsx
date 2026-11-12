import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  // Makes canonical, hreflang and Open Graph URLs absolute.
  metadataBase: new URL(SITE_URL),
  title: { default: "Barber Master", template: "%s · Barber Master" },
  description: "Book your barber online in under a minute.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ee" },
    { media: "(prefers-color-scheme: dark)", color: "#141311" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // lang="en" is the static default; the Spanish landing (/es) sets it to "es" before paint (_landing/html-lang.tsx).
    // data-scroll-behavior: the landing scrolls smoothly; this tells Next to turn it off during route changes.
    <html lang="en" data-scroll-behavior="smooth" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      {/* Browser extensions add attributes to <body> (e.g. location="localhost") before React
          starts; ignore those on this tag only. Mismatches inside the page still show. */}
      <body className="min-h-full font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
