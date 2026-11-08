"use server";

import { z } from "zod";
import { isBookingError } from "@/server/booking-engine";
import { bookingEngine } from "@/server/engine";

export type ManageResult = { ok: true } | { ok: false; code: string };

const Token = z.string().min(20).max(100);

/** The manage link's token is the Client's only credential; the engine checks it and the cutoff. */
export async function cancelByTokenAction(token: string): Promise<ManageResult> {
  if (!Token.safeParse(token).success) return { ok: false, code: "NOT_FOUND" };
  try {
    await bookingEngine().cancelBooking({ actor: { kind: "client", token }, now: new Date() });
    return { ok: true };
  } catch (e) {
    if (isBookingError(e)) return { ok: false, code: e.code };
    console.error("cancel failed", e);
    return { ok: false, code: "UNKNOWN" };
  }
}

export async function rescheduleByTokenAction(token: string, startsAt: string): Promise<ManageResult> {
  if (!Token.safeParse(token).success || !z.iso.datetime().safeParse(startsAt).success) return { ok: false, code: "INVALID_INPUT" };
  try {
    await bookingEngine().rescheduleBooking({ actor: { kind: "client", token }, newStartsAt: new Date(startsAt), now: new Date() });
    return { ok: true };
  } catch (e) {
    if (isBookingError(e)) return { ok: false, code: e.code };
    console.error("reschedule failed", e);
    return { ok: false, code: "UNKNOWN" };
  }
}
