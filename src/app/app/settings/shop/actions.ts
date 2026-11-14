"use server";

import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { isBookingError } from "@/server/booking-engine";
import { shopAdmin } from "@/server/engine";
import { loadStaff } from "../../_shell/staff";

export type ShopProfileResult = { ok: true } | { ok: false; code: string };

const Input = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(40),
  address: z.string().trim().max(200),
  aboutEn: z.string().max(600),
  aboutEs: z.string().max(600),
  logoUrl: z.url().max(1000).nullable(),
  coverUrl: z.url().max(1000).nullable(),
});

/**
 * Save how the Shop looks to Clients at the top of /b (PLAN.md M5). The engine checks the
 * caller owns the Shop. The booking link (slug) is not part of this on purpose.
 */
export async function updateShopProfileAction(input: z.input<typeof Input>): Promise<ShopProfileResult> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const { phone, address, ...rest } = parsed.data;
  const phoneE164 = phone ? normalizePhone(phone) : null;
  if (phone && !phoneE164) return { ok: false, code: "PHONE_INVALID" };
  // The Shop comes from the signed-in Owner's membership, never from the request.
  const staff = await loadStaff(await createClient());
  if (!staff?.membership) return { ok: false, code: "FORBIDDEN" };
  const { userId } = staff;
  const shopId = staff.membership.shopId;
  try {
    await shopAdmin().updateShopProfile({ userId, shopId, ...rest, phone: phoneE164, address: address || null });
    return { ok: true };
  } catch (e) {
    if (isBookingError(e)) return { ok: false, code: e.code };
    console.error("update shop profile failed", e);
    return { ok: false, code: "UNKNOWN" };
  }
}
