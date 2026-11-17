// Mint one-time Telegram links for dad-test's Barbers and print them.
//   npm run dadtest:telegram -- [barberName]
// With a name: one link for that Barber. Without: one link per active Barber. Open every
// link on the same phone and press Start in the bot each time: each "/start" links that
// Barber to the same chat, so that one chat gets every dad-test Barber alert (each alert
// then says which Barber it is for). Alerts come in the language of that Telegram app.
// Same token, hash and expiry as createTelegramLink in src/server/alerts (replicated here
// because that TypeScript module can't be imported from a plain .mjs script).
import { createHash, randomBytes } from "node:crypto";
import postgres from "postgres";

const SLUG = "dad-test";
const LINK_VALID_MS = 24 * 60 * 60_000;
const hashToken = (token) => createHash("sha256").update(token).digest("hex");

const bot = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
if (!bot) {
  console.error("TELEGRAM_BOT_USERNAME is not set in .env.local (the bot's @username, without the @).");
  process.exit(1);
}
const name = process.argv.slice(2).join(" ").trim();

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
try {
  const [shop] = await sql`select id, plan from public.shops where slug = ${SLUG}`;
  if (!shop) throw new Error(`No shop "${SLUG}". Run npm run dadtest:setup first.`);
  if (shop.plan !== "pro") throw new Error(`Shop "${SLUG}" is not on the pro plan; Telegram alerts need it.`);

  const barbers = await sql`
    select id, display_name from public.barbers
    where shop_id = ${shop.id} and active
      and (${name} = '' or lower(display_name) = lower(${name}))
    order by sort_order, id
  `;
  if (barbers.length === 0) throw new Error(name ? `No active Barber named "${name}" in ${SLUG}.` : `${SLUG} has no active Barbers.`);

  const expiresAt = new Date(Date.now() + LINK_VALID_MS);
  for (const b of barbers) {
    const token = randomBytes(24).toString("base64url");
    await sql`
      insert into public.barber_telegram (barber_id, shop_id, link_token_hash, link_expires_at)
      values (${b.id}, ${shop.id}, ${hashToken(token)}, ${expiresAt})
      on conflict (barber_id) do update set link_token_hash = excluded.link_token_hash, link_expires_at = excluded.link_expires_at
    `;
    console.log(`${b.display_name}: https://t.me/${bot}?start=${token}`);
  }
  console.log("Each link works once, for 24 hours. Open them all in the same Telegram account.");
} catch (e) {
  console.error("Failed:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
