import { connection, type NextRequest } from "next/server";
import { twilioSignatureValid } from "@/server/providers/twilio";
import { texting } from "@/server/senders";

/**
 * Twilio calls this when a Client replies to a text (set it as the number's
 * "A message comes in" webhook). STOP/START update the Client's opt-out; Twilio
 * sends the carrier-required reply itself.
 */
export async function POST(request: NextRequest) {
  await connection();
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return new Response("Texting is not set up", { status: 503 });

  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form) if (typeof v === "string") params[k] = v;
  // Twilio signs the public URL it called, so build it from the configured site address.
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/api/twilio/inbound`;
  if (!twilioSignatureValid({ authToken, url, params, signature: request.headers.get("x-twilio-signature") })) {
    return new Response("Forbidden", { status: 403 });
  }

  await texting().handleReply({ from: params.From ?? "", to: params.To ?? "", body: params.Body ?? "" });
  return new Response("<Response/>", { headers: { "Content-Type": "text/xml" } });
}
