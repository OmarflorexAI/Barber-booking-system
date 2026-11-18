import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { HtmlLang } from "@/app/_landing/html-lang";
import { getStaff } from "@/app/app/_shell/staff";
import { Wordmark } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/language-toggle";
import { getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Set up your Shop", robots: { index: false } };

/**
 * Self sign-up, step two: a signed-in login with no Shop sets up its own, in the login
 * page's frame. Anyone who already belongs to a Shop goes to the app instead.
 */
export default function SetupPage() {
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
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 pb-[8vh] sm:px-6">
        <Suspense fallback={null}>
          <Setup />
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

async function Setup() {
  const staff = await getStaff();
  if (!staff) redirect("/login?mode=signup");
  if (staff.membership || staff.retiredBarber) redirect("/app/day");

  const [{ locale }, supabase] = await Promise.all([getDictionary(), createClient()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Google gives us the person's name; an email-link sign-up starts empty.
  const meta = (user?.user_metadata ?? {}) as { full_name?: unknown; name?: unknown };
  const name = typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : "";
  return <SetupForm locale={locale} defaultName={name.slice(0, 60)} email={staff.email ?? ""} />;
}
