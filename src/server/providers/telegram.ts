import type { ChatProvider } from "@/server/alerts";

/** Telegram Bot API through fetch. The bot token is never put in error messages. */
export function createTelegramChat(cfg: { botToken: string }): ChatProvider {
  async function call(method: string, body: Record<string, unknown>) {
    const res = await fetch(`https://api.telegram.org/bot${cfg.botToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    if (!res.ok || !json.ok) throw new Error(`Telegram ${method} ${res.status}: ${json.description ?? "failed"}`);
  }
  return {
    send: ({ chatId, text }) => call("sendMessage", { chat_id: chatId, text, link_preview_options: { is_disabled: true } }),
  };
}
