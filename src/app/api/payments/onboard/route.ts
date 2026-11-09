import { connection, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isBookingError } from "@/server/booking-engine";
import { payments } from "@/server/senders";

/** Owner: go to the payment provider to connect (or finish connecting) the Shop's account. */
export async function GET(request: NextRequest) {
  await connection();
  const shopId = request.nextUrl.searchParams.get("shop");
  if (!z.uuid().safeParse(shopId).success) return new Response("Missing shop", { status: 400 });
  const p = payments();
  if (!p) return new Response("Payments are not set up", { status: 503 });
  const { data } = await (await createClient()).auth.getUser();
  if (!data.user) return Response.redirect(new URL("/login", request.url), 303);
  try {
    const { url } = await p.startOnboarding({ userId: data.user.id, shopId: shopId! });
    return Response.redirect(url, 303);
  } catch (e) {
    if (isBookingError(e, "FORBIDDEN")) return new Response("Only the Shop's Owner can do this", { status: 403 });
    console.error("[payments] onboarding failed", String(e));
    return new Response("Could not start the payment setup", { status: 502 });
  }
}
