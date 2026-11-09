import "server-only";
import { createBookingEngine, type BookingEngine } from "./booking-engine";
import { getSql } from "./db";
import { createPlatformAdmin, type PlatformAdmin } from "./platform-admin";
import { createReporting, type Reporting } from "./reporting";
import { createShopAdmin, type ShopAdmin } from "./shop-admin";

let engine: BookingEngine | undefined;
let admin: ShopAdmin | undefined;
let reports: Reporting | undefined;
let platform: PlatformAdmin | undefined;

/** The app-wide booking engine, bound to the server's Postgres pool. */
export function bookingEngine(): BookingEngine {
  engine ??= createBookingEngine(getSql());
  return engine;
}

/** The app-wide Owner tools (B5), bound to the same pool. */
export function shopAdmin(): ShopAdmin {
  admin ??= createShopAdmin(getSql());
  return admin;
}

/** The Owner's numbers and data export, bound to the same pool. */
export function reporting(): Reporting {
  reports ??= createReporting(getSql());
  return reports;
}

/** Our team's tools (B6): create, support and close Shops. */
export function platformAdmin(): PlatformAdmin {
  platform ??= createPlatformAdmin(getSql());
  return platform;
}
