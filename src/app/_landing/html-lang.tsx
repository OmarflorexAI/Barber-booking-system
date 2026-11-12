"use client";

import { useEffect } from "react";

/**
 * Sets <html lang> to the visitor's language. The root layout can't read the locale
 * cookie without making every route dynamic (cacheComponents keeps <html> in the static
 * shell), so the landing page corrects it here: an inline script before first paint on
 * full loads (the Next "preventing flash" pattern), and an effect after the language
 * toggle's refresh. The landing root also carries lang={locale} itself.
 */
export function HtmlLang({ lang }: { lang: string }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: `document.documentElement.lang=${JSON.stringify(lang)}` }}
    />
  );
}
