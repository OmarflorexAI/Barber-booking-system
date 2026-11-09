import { connection, type NextRequest } from "next/server";
import { InvalidWebhook } from "@/server/payments";
import { payments } from "@/server/senders";

/**
 * The payment provider's events (Stripe: checkout paid, account updated). The raw
 * body is needed to check the signature. A failure answers 500 so the provider
 * sends the event again; a repeat is recognised by its id and does nothing.
 */
export async function POST(request: NextRequest) {
  await connection();
  const p = payments();
  if (!p) return new Response("Payments are not set up", { status: 503 });
  const raw = await request.text();
  try {
    const result = await p.handleWebhook(raw, request.headers.get("stripe-signature"));
    return Response.json({ received: true, result });
  } catch (e) {
    if (e instanceof InvalidWebhook) return new Response("Bad signature", { status: 400 });
    console.error("[payments] webhook failed", String(e));
    return new Response("Failed", { status: 500 });
  }
}
