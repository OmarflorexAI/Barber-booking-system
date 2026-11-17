import type { Metadata } from "next";
import { Suspense } from "react";
import { Wordmark } from "@/components/brand/logo";
import { HtmlLang } from "@/app/_landing/html-lang";
import { getDictionary } from "@/lib/i18n/server";
import { confirmSignIn } from "./actions";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const COPY = {
  en: { title: "Sign in", hint: "Tap the button to open your shop.", button: "Sign in" },
  es: { title: "Entrar", hint: "Toca el botón para abrir tu barbería.", button: "Entrar" },
} as const;

/*
 * Landing page for sign-in links sent by hand (for example over WhatsApp, which pre-fetches
 * links). GET only shows a button; the one-time token is spent when the button is pressed.
 */
export default function ConfirmPage({ searchParams }: { searchParams: Promise<{ [k: string]: string | string[] | undefined }> }) {
  return (
    <div className="landing flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center px-6 py-5">
        <Wordmark />
      </header>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 pb-[12vh]">
        <Suspense fallback={null}>
          <Confirm searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

async function Confirm({ searchParams }: { searchParams: Promise<{ [k: string]: string | string[] | undefined }> }) {
  const [{ locale }, sp] = await Promise.all([getDictionary(), searchParams]);
  const c = COPY[locale === "es" ? "es" : "en"];
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  return (
    <>
      <HtmlLang lang={locale} />
      <div className="flex flex-col gap-3">
        <h1 className="text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.03em]">{c.title}</h1>
        <p className="text-base leading-relaxed text-muted-foreground">{c.hint}</p>
      </div>
      <form action={confirmSignIn} className="flex flex-col gap-4">
        <input type="hidden" name="token_hash" value={one("token_hash")} />
        <input type="hidden" name="type" value={one("type") || "magiclink"} />
        <input type="hidden" name="next" value={one("next")} />
        <button className="inline-flex min-h-12 w-full items-center justify-center whitespace-nowrap rounded-full bg-white px-5 text-sm font-medium text-black transition-colors duration-200 hover:bg-white/85 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-foreground">
          {c.button}
        </button>
      </form>
    </>
  );
}
