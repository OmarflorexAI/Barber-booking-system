"use server";

import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { isBookingError } from "@/server/booking-engine";
import { shopAdmin } from "@/server/engine";

export type BlockResult = { ok: true } | { ok: false; code: string };

const Input = z.object({ shopId: z.uuid(), phone: z.string().max(40) });

async function run(shopId: string, raw: string, fn: (userId: string, phone: string) => Promise<void>): Promise<BlockResult> {
  if (!Input.safeParse({ shopId, phone: raw }).success) return { ok: false, code: "INVALID_PHONE" };
  const phone = normalizePhone(raw);
  if (!phone) return { ok: false, code: "INVALID_PHONE" };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return { ok: false, code: "FORBIDDEN" };
  try {
    await fn(userId, phone);
    return { ok: true };
  } catch (e) {
    if (isBookingError(e)) return { ok: false, code: e.code };
    console.error("blocklist action failed", e);
    return { ok: false, code: "UNKNOWN" };
  }
}

/** Stop a phone number from booking online in this Shop. */
export async function blockPhoneAction(shopId: string, phone: string): Promise<BlockResult> {
  return run(shopId, phone, (userId, p) => shopAdmin().blockPhone({ userId, shopId, phone: p }));
}

/** Let a blocked number book online again. */
export async function unblockPhoneAction(shopId: string, phone: string): Promise<BlockResult> {
  return run(shopId, phone, (userId, p) => shopAdmin().unblockPhone({ userId, shopId, phone: p }));
}
