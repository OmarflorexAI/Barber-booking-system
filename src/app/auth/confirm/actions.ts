"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = ["magiclink", "email"];

/** Only same-site paths under /app; anything else falls back to /app/day. */
function safeNext(next: string): string {
  return /^\/app(\/[A-Za-z0-9\-._~/]*)?$/.test(next) && !next.includes("//") ? next : "/app/day";
}

/** Verify the one-time token. Runs only on button submit, so link previews never consume it. */
export async function confirmSignIn(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "magiclink") as EmailOtpType;
  const next = safeNext(String(formData.get("next") ?? ""));
  if (!tokenHash || !TYPES.includes(type)) redirect("/login?error=link");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) redirect("/login?error=link");
  redirect(next);
}
