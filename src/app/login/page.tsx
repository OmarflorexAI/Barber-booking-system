import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Wordmark } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/language-toggle";
import { HtmlLang } from "@/app/_landing/html-lang";
import { getDictionary } from "@/lib/i18n/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

/*
 * Staff sign-in: always dark, in the landing's look (.landing scope and its --l-* tokens),
 * the bridge between the marketing page and the app. No theme toggle here.
 */
export default function LoginPage() {
  return (
    <div className="landing flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-5">
        <Link
          href="/"
          className="-mx-1 inline-flex min-h-11 items-center rounded-md px-1 text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          <Wordmark />
        </Link>
        <Suspense fallback={null}>
          <Toggle />
        </Suspense>
      </header>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 pb-[12vh]">
        <Suspense fallback={null}>
          <Login />
        </Suspense>
      </main>
    </div>
  );
}

async function Toggle() {
  const { locale, t } = await getDictionary();
  return (
    <>
      <HtmlLang lang={locale} />
      <LanguageToggle locale={locale} label={t.otherLang} />
    </>
  );
}

async function Login() {
  const { locale, t } = await getDictionary();
  return (
    <>
      <div className="flex flex-col gap-3">
        <h1 className="text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.03em]">{t.login}</h1>
        <p className="text-base leading-relaxed text-muted-foreground">{t.loginHint}</p>
      </div>
      <LoginForm locale={locale} />
    </>
  );
}
