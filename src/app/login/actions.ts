"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/server/turnstile";

export type AuthMode = "login" | "signup";
export type LoginState = { status: "idle" | "sent" | "error"; message?: string };

/** Where Supabase sends people back to. It must be on Supabase's redirect allow list. */
async function callbackUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origin = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
  // /app/day sends a login with no Shop on to /setup.
  return `${origin}/auth/callback?next=/app/day`;
}

/**
 * Email a sign-in link.
 * - Log in never creates a login (shouldCreateUser: false), and always says "sent", so the
 *   form doesn't reveal who has an account.
 * - Sign up may create one, behind the bot check. Supabase keeps one login per email, so
 *   signing up with an email that already has an account just signs that account in.
 */
export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const mode: AuthMode = formData.get("mode") === "signup" ? "signup" : "login";
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { status: "error", message: "INVALID_EMAIL" };

  if (mode === "signup") {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const token = String(formData.get("turnstileToken") ?? "") || undefined;
    if (!(await verifyTurnstile(token, ip))) return { status: "error", message: "BOT_CHECK" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { shouldCreateUser: mode === "signup", emailRedirectTo: await callbackUrl() },
  });
  if (error && error.status !== 422 && error.status !== 400) {
    console.error("[auth] email link failed", error.status, error.message);
    return { status: "error", message: error.status === 429 ? "RATE_LIMITED" : "UNKNOWN" };
  }
  return { status: "sent" };
}

/**
 * Sign in or sign up with Google (the same thing: Google's verified email is linked to any
 * login that already has it). Supabase sends the person back to /auth/callback with a code.
 */
export async function continueWithGoogle(): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: await callbackUrl(), queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) {
    console.error("[auth] google sign-in failed", error?.message);
    redirect("/login?error=google");
  }
  redirect(data.url);
}
