import { timingSafeEqual } from "node:crypto";
import { connection, type NextRequest } from "next/server";
import type { TelegramUpdate } from "@/server/alerts";
import { alerts } from "@/server/senders";

/**
 * Telegram calls this for every message to the bot. It must carry the secret
 * given to Telegram when the webhook was registered (npm run telegram:webhook).
 */
export async function POST(request: NextRequest) {
  await connection();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return new Response("Telegram is not set up", { status: 503 });
  const got = Buffer.from(request.headers.get("x-telegram-bot-api-secret-token") ?? "");
  const want = Buffer.from(secret);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return new Response("Forbidden", { status: 403 });

  const update = (await request.json().catch(() => ({}))) as TelegramUpdate;
  try {
    await alerts().handleTelegramUpdate(update);
  } catch (e) {
    // Answer 200 anyway: a re-sent "/start" would find its link already used.
    console.error("[telegram] update failed", String(e));
  }
  return Response.json({ ok: true });
}
