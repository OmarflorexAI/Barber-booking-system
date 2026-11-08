"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string };

/**
 * Email a magic sign-in link. Only existing staff accounts can sign in
 * (shouldCreateUser: false); the platform team creates them.
 * We report "sent" either way so the form does not reveal who has an account.
 */
export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { status: "error", message: "INVALID_INPUT" };

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { shouldCreateUser: false, emailRedirectTo: `${site}/auth/callback?next=/app/day` },
  });
  if (error && error.status !== 422 && error.status !== 400) {
    console.error("magic link failed", error.message);
    return { status: "error", message: "UNKNOWN" };
  }
  return { status: "sent" };
}
