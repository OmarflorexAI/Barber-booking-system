"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isBookingError } from "@/server/booking-engine";
import { bookingEngine } from "@/server/engine";

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

export async function walkInAction(shopId: string, barberId: string, serviceId: string): Promise<StaffResult> {
  if (![shopId, barberId, serviceId].every((v) => Id.safeParse(v).success)) return { ok: false, code: "INVALID_INPUT" };
  return run((userId) => bookingEngine().logWalkIn({ userId, shopId, barberId, serviceId, now: new Date() }));
}
