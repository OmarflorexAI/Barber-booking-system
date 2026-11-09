import "server-only";
import { createClient } from "@supabase/supabase-js";
import { invalid } from "./booking-engine/errors";
import { getSql } from "./db";

/**
 * Find or create the login for an email. New logins have no password: people
 * sign in with an email link at /login. Uses the Supabase admin API (service role).
 */
export async function ensureLogin(rawEmail: string): Promise<{ id: string; email: string }> {
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw invalid("That email doesn't look right.");

  const [existing] = await getSql()<{ id: string }[]>`select id from auth.users where lower(email) = ${email}`;
  if (existing) return { id: existing.id, email };

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw new Error(`Could not create the login: ${error?.message ?? "unknown error"}`);
  return { id: data.user.id, email };
}

export const signInUrl = () => `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/login`;
