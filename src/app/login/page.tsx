import type { Metadata } from "next";
import { Suspense } from "react";
import { LanguageToggle } from "@/components/language-toggle";
import { getDictionary } from "@/lib/i18n/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-4">
      <Suspense fallback={null}>
        <Login />
      </Suspense>
    </main>
  );
}

async function Login() {
  const { locale, t } = await getDictionary();
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t.login}</h1>
        <LanguageToggle locale={locale} label={t.otherLang} />
      </div>
      <p className="text-muted">{t.loginHint}</p>
      <LoginForm locale={locale} />
    </>
  );
}
