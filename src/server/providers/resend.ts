import type { EmailProvider } from "@/server/alerts";

/** Resend's email API through fetch. */
export function createResendEmail(cfg: { apiKey: string; from: string }): EmailProvider {
  return {
    async send({ to, subject, text }) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: cfg.from, to, subject, text }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(`Resend ${res.status}: ${json.message ?? "send failed"}`);
      }
    },
  };
}
