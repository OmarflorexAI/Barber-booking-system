"use server";

import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { isBookingError } from "@/server/booking-engine";
import { shopAdmin } from "@/server/engine";

export type ProfileResult = { ok: true } | { ok: false; code: string };

const Input = z.object({
  shopId: z.uuid(),
  barberId: z.uuid(),
  displayName: z.string().trim().min(1).max(60),
  bio: z.string().max(500),
  bioEs: z.string().max(500),
  specialties: z.array(z.string().trim().min(1).max(40)).max(8),
  photoUrl: z.url().max(1000).nullable(),
  phone: z.string().trim().max(40),
  instagram: z.string().trim().max(40),
});

/**
 * Save what Clients see about a Barber (PLAN.md M4 · Profile), plus the Owner-only phone (Q27).
 * The engine checks the caller owns the Shop and the Barber is in it, and validates Instagram.
 */
export async function updateProfileAction(input: z.input<typeof Input>): Promise<ProfileResult> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const { phone, instagram, ...rest } = parsed.data;
  const phoneE164 = phone ? normalizePhone(phone) : null;
  if (phone && !phoneE164) return { ok: false, code: "PHONE_INVALID" };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return { ok: false, code: "FORBIDDEN" };
  try {
    await shopAdmin().updateBarberProfile({ userId, ...rest, phone: phoneE164, instagram: instagram || null });
    return { ok: true };
  } catch (e) {
    if (isBookingError(e)) return { ok: false, code: e.code };
    console.error("update barber profile failed", e);
    return { ok: false, code: "UNKNOWN" };
  }
}
