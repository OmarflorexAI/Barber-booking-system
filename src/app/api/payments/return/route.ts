import { connection, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { payments } from "@/server/senders";

/** Back from the payment provider's setup page: check the account, then go to the day view. */
export async function GET(request: NextRequest) {
  await connection();
  const shopId = request.nextUrl.searchParams.get("shop");
  const p = payments();
  const { data } = await (await createClient()).auth.getUser();
  let ready = false;
  if (p && data.user && z.uuid().safeParse(shopId).success) {
    try {
      ready = (await p.finishOnboarding({ userId: data.user.id, shopId: shopId! })).ready;
    } catch (e) {
      console.error("[payments] finishing onboarding failed", String(e));
    }
  }
  return Response.redirect(new URL(`/app/day?payments=${ready ? "ready" : "pending"}`, request.url), 303);
}
