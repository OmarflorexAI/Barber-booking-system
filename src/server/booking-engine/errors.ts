/**
 * Errors the booking engine reports to its callers. Each has a stable `code`
 * the UI maps to a translated message; none carries internal details.
 */
export class BookingError extends Error {
  constructor(
    readonly code: BookingErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "BookingError";
  }
}

export type BookingErrorCode =
  | "SLOT_TAKEN" // the time is no longer free (race lost or not on the grid / in hours)
  | "OUTSIDE_WINDOW" // earlier than 30 min from now or later than 30 days ahead
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "SHOP_UNAVAILABLE"
  | "PHONE_BLOCKED"
  | "UNPAID_LIMIT" // already 2 active unpaid Bookings for this phone
  | "CUTOFF_PASSED" // too late for the Client to cancel or change online
  | "BOOKING_NOT_ACTIVE" // already cancelled or completed
  | "DAY_HAS_BOOKINGS" // day off / closed day over live Bookings
  | "FORBIDDEN";

export const slotTaken = () => new BookingError("SLOT_TAKEN", "That time was just taken. Please pick another.");
export const notFound = (what: string) => new BookingError("NOT_FOUND", `${what} not found`);
export const invalid = (message: string) => new BookingError("INVALID_INPUT", message);
export const forbidden = () => new BookingError("FORBIDDEN", "You are not allowed to do that.");

export function isBookingError(e: unknown, code?: BookingErrorCode): e is BookingError {
  return e instanceof BookingError && (code === undefined || e.code === code);
}

/** Postgres SQLSTATE for an exclusion-constraint violation (our no-double-booking rule). */
export const PG_EXCLUSION_VIOLATION = "23P01";
/** Raised by the day-off / closed-day guard triggers. */
export const PG_DAY_HAS_BOOKINGS = "BB001";

export function pgCode(e: unknown): string | undefined {
  return typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : undefined;
}
