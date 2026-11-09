import { createHmac } from "node:crypto";

/**
 * The Client's manage-link token for a Booking: an HMAC of the Booking id with a
 * server secret. Only its hash is stored, yet any later text (the 2-hour reminder,
 * a time change) can rebuild the same link. Changing the secret breaks every
 * existing link, so treat it like a password.
 */
export function manageTokenFor(bookingId: string, secret: string): string {
  // 128 bits is plenty for an unguessable link and keeps texts short.
  return createHmac("sha256", secret).update(bookingId).digest().subarray(0, 16).toString("base64url");
}

/** Checked once where the app is wired up, so a missing secret fails at start, not mid-booking. */
export function requireManageLinkSecret(value: string | undefined): string {
  if (!value || value.length < 32) throw new Error("MANAGE_LINK_SECRET is missing or too short (32+ characters).");
  return value;
}
