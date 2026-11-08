import "server-only";
import { createBookingEngine, type BookingEngine } from "./booking-engine";
import { getSql } from "./db";

let engine: BookingEngine | undefined;

/** The app-wide booking engine, bound to the server's Postgres pool. */
export function bookingEngine(): BookingEngine {
  engine ??= createBookingEngine(getSql());
  return engine;
}
