// Give someone a staff login for a Shop (until the admin panel exists).
//
//   npm run staff:add -- owner@example.com demo-shop owner
//   npm run staff:add -- carlos@example.com demo-shop barber Carlos
//   npm run staff:add -- owner@example.com demo-shop owner Carlos   (Owner who also cuts hair)
//
// Creates the account if needed (no password; they sign in with an email link),
// adds them to the Shop, and links them to the named Barber profile.
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const [email, slug, role, barberName] = process.argv.slice(2);
if (!email || !slug || !["owner", "barber"].includes(role)) {
  console.error("Usage: npm run staff:add -- <email> <shop-slug> <owner|barber> [barber display name]");
  process.exit(1);
}
if (role === "barber" && !barberName) {
  console.error("A barber needs the Barber profile name, e.g. ... barber Carlos");
  process.exit(1);
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

try {
  const [shop] = await sql`select id, name from public.shops where slug = ${slug}`;
  if (!shop) throw new Error(`No shop with slug "${slug}"`);

  let barber;
  if (barberName) {
    [barber] = await sql`select id, user_id from public.barbers where shop_id = ${shop.id} and display_name = ${barberName}`;
    if (!barber) throw new Error(`No barber named "${barberName}" in ${shop.name}`);
  }

  const normalized = email.trim().toLowerCase();
  let [user] = await sql`select id from auth.users where lower(email) = ${normalized}`;
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({ email: normalized, email_confirm: true });
    if (error) throw error;
    user = { id: data.user.id };
    console.log(`Created account for ${normalized}`);
  }

  await sql`
    insert into public.shop_members (shop_id, user_id, role) values (${shop.id}, ${user.id}, ${role})
    on conflict (shop_id, user_id) do update set role = excluded.role
  `;
  if (barber) {
    if (barber.user_id && barber.user_id !== user.id) throw new Error(`${barberName} is already linked to another account`);
    await sql`update public.barbers set user_id = ${user.id} where id = ${barber.id}`;
  }
  console.log(`${normalized} is now ${role}${barber ? ` (${barberName})` : ""} at ${shop.name}. They can sign in at /login.`);
} catch (e) {
  console.error("Failed:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
