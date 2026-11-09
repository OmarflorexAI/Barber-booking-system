"use server";

import { z } from "zod";
import { isBookingError } from "@/server/booking-engine";
import { bookingEngine } from "@/server/engine";
import { payments } from "@/server/senders";

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

/** Go to the payment page for a Booking still waiting for its online payment. */
export async function payByTokenAction(token: string): Promise<{ ok: true; url: string } | { ok: false; code: string }> {
  if (!Token.safeParse(token).success) return { ok: false, code: "NOT_FOUND" };
  const p = payments();
  if (!p) return { ok: false, code: "PAYMENTS_OFF" };
  try {
    const data = await bookingEngine().getBookingByToken(token, new Date());
    if (!data) return { ok: false, code: "NOT_FOUND" };
    return { ok: true, url: (await p.startCheckout({ bookingId: data.booking.id, manageToken: token })).url };
  } catch (e) {
    if (isBookingError(e)) return { ok: false, code: e.code };
    console.error("pay failed", e);
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
