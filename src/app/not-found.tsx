import type { Metadata } from "next";
import Link from "next/link";
import { ViewTransition } from "react";
import { Wordmark } from "@/components/brand/logo";
import { notFoundCopy } from "@/lib/i18n/legal";
import { HtmlLang } from "./_landing/html-lang";
import { focusRing, whitePill } from "./_landing/ui";

export const metadata: Metadata = { title: "Page not found · Página no encontrada" };

/**
 * The 404, in the landing's dark brand. It is static, so it can't know the visitor's
 * language: it says it in English, then Spanish, each with its own lang and home link.
 */
export default function NotFound() {
  const { en, es } = notFoundCopy;
  return (
    <ViewTransition default="none" enter={{ page: "page-in", default: "none" }} exit={{ page: "page-out", default: "none" }}>
      <div className="landing flex min-h-dvh flex-col antialiased">
        <HtmlLang lang="en" />
        <header className="mx-auto w-full max-w-5xl px-6 py-3">
          <Link href="/" transitionTypes={["page"]} className={`-ml-1 inline-flex min-h-11 items-center rounded-md px-1 ${focusRing}`}>
            <Wordmark />
          </Link>
        </header>
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 pb-16 pt-8">
          <h1 className="text-balance text-3xl font-medium leading-[1.12] tracking-[-0.03em] sm:text-5xl">
            <span lang="en" className="block">{en.title}</span>
            <span lang="es" className="mt-1 block">{es.title}</span>
          </h1>
          <div className="mt-8 grid max-w-xl gap-6 sm:grid-cols-2">
            <div lang="en" className="flex flex-col items-start">
              <p className="mb-4 text-base leading-relaxed text-foreground/80">{en.body}</p>
              <Link href="/?lang=en" transitionTypes={["page"]} hrefLang="en" className={`mt-auto ${whitePill}`}>
                {en.home}
              </Link>
            </div>
            <div lang="es" className="flex flex-col items-start">
              <p className="mb-4 text-base leading-relaxed text-foreground/80">{es.body}</p>
              <Link href="/es" transitionTypes={["page"]} hrefLang="es" className={`mt-auto ${whitePill}`}>
                {es.home}
              </Link>
            </div>
          </div>
        </main>
      </div>
    </ViewTransition>
  );
}
