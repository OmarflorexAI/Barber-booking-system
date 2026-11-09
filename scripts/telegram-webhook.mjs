// Point the Telegram bot at this app, once per public address (and again if it changes).
//
//   npm run telegram:webhook -- https://your-public-address
//
// Uses TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET from .env.local. Telegram needs a
// public https address: the deployed site, or a tunnel to localhost while testing.
// Also prints the bot's @username so you can set TELEGRAM_BOT_USERNAME.

const base = process.argv[2]?.replace(/\/+$/, "");
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
if (!base?.startsWith("https://")) {
  console.error("Usage: npm run telegram:webhook -- https://your-public-address");
  process.exit(1);
}
if (!token || !secret) {
  console.error("Set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET in .env.local first.");
  process.exit(1);
}

async function call(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method} failed: ${json.description}`);
  return json.result;
}

const me = await call("getMe");
await call("setWebhook", { url: `${base}/api/telegram/webhook`, secret_token: secret, allowed_updates: ["message"] });
console.log(`Webhook set to ${base}/api/telegram/webhook`);
console.log(`Bot username: ${me.username}  (put TELEGRAM_BOT_USERNAME=${me.username} in .env.local)`);
