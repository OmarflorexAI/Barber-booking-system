import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { ThemeSync } from "@/components/theme-toggle";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// Hanken Grotesk sets every word; JetBrains Mono only times, prices and numbers.
const sans = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin", "latin-ext"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  // Makes canonical, hreflang and Open Graph URLs absolute.
  metadataBase: new URL(SITE_URL),
  title: { default: "Barber Master", template: "%s · Barber Master" },
  description: "Book your barber online in under a minute.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The app's light and dark grounds (globals.css --paper): oklch(98.5% 0 0) = #fafafa and oklch(6% 0 0) = #010101.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#010101" },
  ],
};

/*
 * The saved theme (cookie theme=light|dark, set by the theme toggle) goes on <html> before
 * first paint. The root layout can't read cookies without making every route dynamic
 * (cacheComponents keeps <html> in the static shell), so an inline script in <head> reads it
 * (Next's "preventing flash" pattern). No cookie: no attribute, and the CSS follows the phone.
 */
const themeScript = `(function(){try{var m=document.cookie.match(/(?:^|; )theme=(light|dark)(?:;|$)/);if(m)document.documentElement.setAttribute("data-theme",m[1])}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // lang="en" is the static default; the Spanish landing (/es) sets it to "es" before paint (_landing/html-lang.tsx).
    // data-scroll-behavior: the landing scrolls smoothly; this tells Next to turn it off during route changes.
    <html lang="en" data-scroll-behavior="smooth" className={`${sans.variable} ${mono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      {/* Browser extensions add attributes to <body> (e.g. location="localhost") before React
          starts; ignore those on this tag only. Mismatches inside the page still show. */}
      <body className="min-h-full font-sans" suppressHydrationWarning>
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
