import "server-only";
import { timingSafeEqual } from "node:crypto";

/** Scheduled jobs send `Authorization: Bearer $CRON_SECRET`. No secret configured means no access. */
export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}
