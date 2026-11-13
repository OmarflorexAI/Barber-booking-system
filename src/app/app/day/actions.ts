"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isBookingError } from "@/server/booking-engine";
import { bookingEngine } from "@/server/engine";
import { alerts } from "@/server/senders";

export type StaffResult = { ok: true } | { ok: false; code: string };

/** Every staff action re-checks the session here; the engine then checks Shop/Barber rights. */
async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function run(fn: (userId: string) => Promise<unknown>): Promise<StaffResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, code: "FORBIDDEN" };
  try {
    await fn(userId);
    return { ok: true };
  } catch (e) {
    if (isBookingError(e)) return { ok: false, code: e.code };
    console.error("staff action failed", e);
    return { ok: false, code: "UNKNOWN" };
  }
}

const Id = z.uuid();

export async function setAttendanceAction(bookingId: string, status: "arrived" | "no_show"): Promise<StaffResult> {
  if (!Id.safeParse(bookingId).success || !["arrived", "no_show"].includes(status)) return { ok: false, code: "INVALID_INPUT" };
  return run((userId) => bookingEngine().setAttendance({ userId, bookingId, status }));
}

export async function cancelAsStaffAction(bookingId: string): Promise<StaffResult> {
  if (!Id.safeParse(bookingId).success) return { ok: false, code: "INVALID_INPUT" };
  return run((userId) => bookingEngine().cancelBooking({ actor: { kind: "staff", userId }, bookingId, now: new Date() }));
}

/** Move a Booking to a new time for the same Barber and Service (the payment stays with it). */
export async function moveAsStaffAction(bookingId: string, newStartsAt: string): Promise<StaffResult> {
  const when = new Date(newStartsAt);
  if (!Id.safeParse(bookingId).success || Number.isNaN(when.getTime())) return { ok: false, code: "INVALID_INPUT" };
  return run((userId) => bookingEngine().rescheduleBooking({ actor: { kind: "staff", userId }, bookingId, newStartsAt: when, now: new Date() }));
}

export async function walkInAction(shopId: string, barberId: string, serviceId: string): Promise<StaffResult> {
  if (![shopId, barberId, serviceId].every((v) => Id.safeParse(v).success)) return { ok: false, code: "INVALID_INPUT" };
  return run((userId) => bookingEngine().logWalkIn({ userId, shopId, barberId, serviceId, now: new Date() }));
}

/** A one-time Telegram link for the Barber's booking alerts (a Barber for themselves; the Owner for anyone). */
export async function telegramLinkAction(shopId: string, barberId: string): Promise<{ ok: true; url: string } | { ok: false; code: string }> {
  if (![shopId, barberId].every((v) => Id.safeParse(v).success)) return { ok: false, code: "INVALID_INPUT" };
  const userId = await currentUserId();
  if (!userId) return { ok: false, code: "FORBIDDEN" };
  try {
    return { ok: true, url: (await alerts().createTelegramLink({ userId, shopId, barberId })).url };
  } catch (e) {
    if (isBookingError(e)) return { ok: false, code: e.code };
    console.error("telegram link failed", e);
    return { ok: false, code: "UNKNOWN" };
  }
}

/** Stop Telegram alerts for a Barber (they then come by email). */
export async function telegramUnlinkAction(shopId: string, barberId: string): Promise<StaffResult> {
  if (![shopId, barberId].every((v) => Id.safeParse(v).success)) return { ok: false, code: "INVALID_INPUT" };
  return run((userId) => alerts().unlinkTelegram({ userId, shopId, barberId }));
}
