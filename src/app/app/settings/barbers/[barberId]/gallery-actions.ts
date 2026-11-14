"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isBookingError } from "@/server/booking-engine";
import { shopAdmin } from "@/server/engine";

export type GalleryResult = { ok: true } | { ok: false; code: string };

const Input = z.object({
  shopId: z.uuid(),
  barberId: z.uuid(),
  urls: z.array(z.url().max(1000)).max(6),
});

/** Replace the Barber's work photos, in order (PLAN.md M4 · Gallery). The engine checks the Shop. */
export async function setGalleryAction(input: z.input<typeof Input>): Promise<GalleryResult> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return { ok: false, code: "FORBIDDEN" };
  try {
    await shopAdmin().setGallery({ userId, ...parsed.data });
    return { ok: true };
  } catch (e) {
    if (isBookingError(e)) return { ok: false, code: e.code };
    console.error("set gallery failed", e);
    return { ok: false, code: "UNKNOWN" };
  }
}
