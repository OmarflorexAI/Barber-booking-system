"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isBookingError } from "@/server/booking-engine";
import { localDayRange, toLocal } from "@/server/booking-engine/time";
import { shopAdmin } from "@/server/engine";

export type PriceResult = { ok: true } | { ok: false; code: string };

const Cents = z.number().int().min(0).max(1_000_000);

const SaveInput = z.object({
  shopId: z.uuid(),
  barberId: z.uuid(),
  serviceId: z.uuid(),
  priceCents: Cents,
  durationOverrideMin: z.number().int().min(15).max(240).refine((n) => n % 15 === 0).nullable(),
  special: z.object({ cents: Cents, endDate: z.iso.date() }).nullable(),
});

const Ids = z.object({ shopId: z.uuid(), barberId: z.uuid(), serviceId: z.uuid() });

async function userId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function run(label: string, fn: (userId: string) => Promise<PriceResult>): Promise<PriceResult> {
  const uid = await userId();
  if (!uid) return { ok: false, code: "FORBIDDEN" };
  try {
    return await fn(uid);
  } catch (e) {
    if (isBookingError(e)) return { ok: false, code: e.code };
    console.error(`${label} failed`, e);
    return { ok: false, code: "UNKNOWN" };
  }
}

/**
 * Save one Service for this Barber: the price, their own duration (null = the Shop's) and the
 * special price, which runs until the end of its last day in the Shop's time zone. The engine
 * checks the Owner on each call.
 */
export async function savePriceAction(input: z.input<typeof SaveInput>): Promise<PriceResult> {
  const parsed = SaveInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const { shopId, barberId, serviceId, priceCents, durationOverrideMin, special } = parsed.data;

  let endsAt: Date | null = null;
  if (special) {
    const supabase = await createClient();
    const { data: shop } = await supabase.from("shops").select("timezone").eq("id", shopId).maybeSingle<{ timezone: string }>();
    if (!shop) return { ok: false, code: "FORBIDDEN" };
    if (special.endDate < toLocal(new Date(), shop.timezone).date) return { ok: false, code: "SPECIAL_PAST" };
    endsAt = localDayRange(special.endDate, shop.timezone).end;
  }

  return run("save barber price", async (uid) => {
    const admin = shopAdmin();
    await admin.setBarberPrice({ userId: uid, shopId, barberId, serviceId, priceCents, durationOverrideMin });
    await admin.setSpecialPrice({
      userId: uid,
      shopId,
      serviceId,
      barberId,
      specialPriceCents: special ? special.cents : null,
      endsAt,
    });
    return { ok: true };
  });
}

/** The Barber stops offering the Service (its special price goes with it). */
export async function removePriceAction(input: z.input<typeof Ids>): Promise<PriceResult> {
  const parsed = Ids.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  return run("remove barber price", async (uid) => {
    await shopAdmin().removeBarberPrice({ userId: uid, ...parsed.data });
    return { ok: true };
  });
}
