import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createBookingEngine, type BookingEngine } from "./booking-engine";
import { requireManageLinkSecret } from "./booking-engine/manage-token";
import { getSql } from "./db";
import { createMedia, MEDIA_BUCKET, type Media } from "./media";
import { createPlatformAdmin, type PlatformAdmin } from "./platform-admin";
import { createReporting, type Reporting } from "./reporting";
import { createShopAdmin, type ShopAdmin } from "./shop-admin";
import { createSignup, type Signup } from "./signup";

let engine: BookingEngine | undefined;
let admin: ShopAdmin | undefined;
let reports: Reporting | undefined;
let platform: PlatformAdmin | undefined;
let mediaTools: Media | undefined;
let signupTools: Signup | undefined;

/** The app-wide booking engine, bound to the server's Postgres pool. */
export function bookingEngine(): BookingEngine {
  engine ??= createBookingEngine(getSql(), { manageLinkSecret: requireManageLinkSecret(process.env.MANAGE_LINK_SECRET) });
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

/** Self sign-up: an Owner sets up their own Shop (one per login). */
export function signup(): Signup {
  signupTools ??= createSignup(getSql());
  return signupTools;
}

/** Shop pictures (M1): signed uploads into the public `shop-media` bucket, via the service role. */
export function media(): Media {
  if (!mediaTools) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const bucket = admin.storage.from(MEDIA_BUCKET);
    mediaTools = createMedia(getSql(), {
      async createSignedUploadUrl(path) {
        const { data, error } = await bucket.createSignedUploadUrl(path);
        if (error || !data) throw new Error(`Could not sign the upload: ${error?.message ?? "unknown error"}`);
        return { token: data.token };
      },
      async remove(paths) {
        const { error } = await bucket.remove(paths);
        if (error) throw new Error(`Could not delete the picture: ${error.message}`);
      },
      publicUrl: (path) => bucket.getPublicUrl(path).data.publicUrl,
    });
  }
  return mediaTools;
}
