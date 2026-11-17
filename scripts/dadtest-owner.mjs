// Make someone an Owner of dad-test and print a one-time sign-in link.
//   npm run dadtest:owner -- dad@example.com "Papa" [--site https://my-app.example.com]
// The link opens /auth/confirm, which only shows a button; the token is spent when it is pressed
// (WhatsApp previews cannot burn it). Works on any device (no PKCE verifier). Single use.
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const SLUG = "dad-test";
const args = process.argv.slice(2);
let site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const rest = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--site") site = args[++i];
  else rest.push(args[i]);
}
const [email, name] = rest;
if (!email || !site) {
  console.error("Usage: npm run dadtest:owner -- <email> [name] [--site <url>]");
  process.exit(1);
}
site = site.replace(/\/+$/, "");

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

try {
  const [shop] = await sql`select id, name from public.shops where slug = ${SLUG}`;
  if (!shop) throw new Error(`No shop "${SLUG}". Run npm run dadtest:setup first.`);

  const normalized = email.trim().toLowerCase();
  let [user] = await sql`select id from auth.users where lower(email) = ${normalized}`;
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: normalized,
      email_confirm: true,
      user_metadata: name ? { name } : undefined,
    });
    if (error) throw error;
    user = { id: data.user.id };
  }
  await sql`
    insert into public.shop_members (shop_id, user_id, role) values (${shop.id}, ${user.id}, 'owner')
    on conflict (shop_id, user_id) do update set role = 'owner'
  `;

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: normalized });
  if (error) throw error;
  const link = `${site}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=magiclink&next=${encodeURIComponent("/app/day")}`;
  console.log(link);
  console.log("Single use. Expires after the project's email OTP lifetime (Supabase default: 1 hour). Mint a new one if it fails.");
} catch (e) {
  console.error("Failed:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
