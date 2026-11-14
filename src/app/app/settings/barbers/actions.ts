"use server";

import { z } from "zod";
import { formatMoney } from "@/lib/i18n/dictionaries";
import { normalizePhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { isBookingError } from "@/server/booking-engine";
import { shopAdmin } from "@/server/engine";
import { removeTeamMember } from "@/server/team";

/** One of the Barber's upcoming Bookings, as the refused-delete sheet shows it. */
export type UpcomingItem = {
  bookingId: string;
  startsAt: string;
  kind: "booking" | "walk_in";
  status: string;
  clientName: string | null;
  serviceNameEn: string;
  serviceNameEs: string;
  paid: boolean;
  price: string;
};

export type BarberResult =
  | { ok: true; barberId?: string }
  | { ok: false; code: string; upcoming?: UpcomingItem[] };

const Ids = z.object({ shopId: z.uuid(), barberId: z.uuid() });

const AddInput = z.object({
  shopId: z.uuid(),
  displayName: z.string().trim().min(1).max(60),
  photoUrl: z.url().max(1000).nullable(),
  phone: z.string().trim().max(40),
});

async function userId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** The Barber's upcoming Bookings from the engine, plus whether each was paid online (for the refund line). */
async function upcoming(uid: string, shopId: string, barberId: string): Promise<UpcomingItem[]> {
  const rows = await shopAdmin().upcomingForBarber({ userId: uid, shopId, barberId, now: new Date() });
  if (rows.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("id, price_cents, payment_status")
    .eq("shop_id", shopId)
    .in("id", rows.map((r) => r.bookingId))
    .returns<{ id: string; price_cents: number; payment_status: string }[]>();
  const pay = new Map((data ?? []).map((b) => [b.id, b]));
  return rows.map((r) => {
    const p = pay.get(r.bookingId);
    return {
      bookingId: r.bookingId,
      startsAt: new Date(r.startsAt).toISOString(),
      kind: r.kind as UpcomingItem["kind"],
      status: r.status,
      clientName: r.clientName,
      serviceNameEn: r.serviceNameEn,
      serviceNameEs: r.serviceNameEs,
      paid: p?.payment_status === "paid",
      price: formatMoney(p?.price_cents ?? 0),
    };
  });
}

/** Add a Barber: only the name is needed (Q34). The 7th is refused by the engine (BARBER_LIMIT). */
export async function addBarberAction(input: z.input<typeof AddInput>): Promise<BarberResult> {
  const parsed = AddInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const { shopId, displayName, photoUrl, phone } = parsed.data;
  const phoneE164 = phone ? normalizePhone(phone) : null;
  if (phone && !phoneE164) return { ok: false, code: "PHONE_INVALID" };
  const uid = await userId();
  if (!uid) return { ok: false, code: "FORBIDDEN" };
  try {
    const { barberId } = await shopAdmin().addBarber({ userId: uid, shopId, displayName, photoUrl, phone: phoneE164 });
    return { ok: true, barberId };
  } catch (e) {
    if (isBookingError(e)) return { ok: false, code: e.code };
    console.error("add barber failed", e);
    return { ok: false, code: "UNKNOWN" };
  }
}

/**
 * Delete a Barber for good (Q9/Q16): profile, photos, prices, hours and past Bookings.
 * Refused while they have upcoming Bookings; those come back so the sheet can list them.
 */
export async function deleteBarberAction(shopId: string, barberId: string): Promise<BarberResult> {
  if (!Ids.safeParse({ shopId, barberId }).success) return { ok: false, code: "INVALID_INPUT" };
  const uid = await userId();
  if (!uid) return { ok: false, code: "FORBIDDEN" };
  try {
    await removeTeamMember({ userId: uid, shopId, barberId, now: new Date() });
    return { ok: true };
  } catch (e) {
    if (isBookingError(e)) {
      if (e.code === "BARBER_HAS_BOOKINGS") {
        try {
          return { ok: false, code: e.code, upcoming: await upcoming(uid, shopId, barberId) };
        } catch (inner) {
          console.error("upcoming for barber failed", inner);
        }
      }
      return { ok: false, code: e.code };
    }
    console.error("delete barber failed", e);
    return { ok: false, code: "UNKNOWN" };
  }
}

/** Re-read the Barber's upcoming Bookings after one was cancelled from the sheet. */
export async function upcomingAction(shopId: string, barberId: string): Promise<{ ok: true; upcoming: UpcomingItem[] } | { ok: false; code: string }> {
  if (!Ids.safeParse({ shopId, barberId }).success) return { ok: false, code: "INVALID_INPUT" };
  const uid = await userId();
  if (!uid) return { ok: false, code: "FORBIDDEN" };
  try {
    return { ok: true, upcoming: await upcoming(uid, shopId, barberId) };
  } catch (e) {
    if (isBookingError(e)) return { ok: false, code: e.code };
    console.error("upcoming for barber failed", e);
    return { ok: false, code: "UNKNOWN" };
  }
}
