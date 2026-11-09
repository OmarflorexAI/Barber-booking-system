import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireOwner } from "./booking-engine/access";
import { invalid } from "./booking-engine/errors";
import { getSql } from "./db";
import { shopAdmin } from "./engine";

/**
 * Give a Barber a login: create the account if it doesn't exist (no password;
 * they sign in with an email link at /login), then connect it to the Barber.
 * A "you've been added" email is sent once Resend is connected (B4).
 */
export async function inviteBarber(args: { userId: string; shopId: string; barberId: string; email: string }) {
  const sql = getSql();
  await requireOwner(sql, args.userId, args.shopId); // before creating any account
  const email = args.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw invalid("That email doesn't look right.");

  let [user] = await sql<{ id: string }[]>`select id from auth.users where lower(email) = ${email}`;
  if (!user) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (error || !data.user) throw new Error(`Could not create the login: ${error?.message ?? "unknown error"}`);
    user = { id: data.user.id };
  }

  await shopAdmin().linkBarberLogin({ userId: args.userId, shopId: args.shopId, barberId: args.barberId, loginUserId: user.id });
  return { email, signInUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/login` };
}
