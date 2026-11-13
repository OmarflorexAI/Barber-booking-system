"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isBookingError } from "@/server/booking-engine";
import { shopAdmin } from "@/server/engine";

export type CutoffResult = { ok: true; warning: "REMINDER_AFTER_CUTOFF" | null } | { ok: false; code: string };

const Input = z.object({ shopId: z.uuid(), minutes: z.number().int().min(0).max(7 * 24 * 60) });

/** Save the cancel/change cutoff. The engine checks the Owner and says when the reminder lands after it. */
export async function setCutoffAction(shopId: string, minutes: number): Promise<CutoffResult> {
  if (!Input.safeParse({ shopId, minutes }).success) return { ok: false, code: "INVALID_INPUT" };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return { ok: false, code: "FORBIDDEN" };
  try {
    const { warning } = await shopAdmin().setCancelCutoff({ userId, shopId, minutes });
    return { ok: true, warning };
  } catch (e) {
    if (isBookingError(e)) return { ok: false, code: e.code };
    console.error("set cutoff failed", e);
    return { ok: false, code: "UNKNOWN" };
  }
}
