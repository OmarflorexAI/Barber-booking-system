import { createHmac, timingSafeEqual } from "node:crypto";
import type { SmsProvider } from "@/server/texting";

/** Twilio's REST API through fetch (no SDK). Errors never include credentials. */
export function createTwilioSms(cfg: { accountSid: string; authToken: string }): SmsProvider {
  const auth = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64");
  return {
    async send({ from, to, body }) {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ From: from, To: to, Body: body }),
      });
      const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string; code?: number };
      if (!res.ok || !json.sid) throw new Error(`Twilio ${res.status}${json.code ? ` (${json.code})` : ""}: ${json.message ?? "send failed"}`);
      return { id: json.sid };
    },
  };
}

/**
 * Twilio signs each webhook: base64(HMAC-SHA1(auth token, full URL + every POST
 * field name and value, sorted by name)). Anything else is a forged request.
 */
export function twilioSignatureValid(args: { authToken: string; url: string; params: Record<string, string>; signature: string | null }): boolean {
  if (!args.signature) return false;
  const data = args.url + Object.keys(args.params).sort().map((k) => k + args.params[k]).join("");
  const want = Buffer.from(createHmac("sha1", args.authToken).update(data).digest("base64"));
  const got = Buffer.from(args.signature);
  return got.length === want.length && timingSafeEqual(got, want);
}
