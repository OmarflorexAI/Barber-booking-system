import { connection, type NextRequest } from "next/server";
import { cronAuthorized } from "@/server/cron-auth";
import { platformAdmin } from "@/server/engine";

/**
 * Daily scheduled job: delete Shops cancelled 30+ days ago.
 * (The Owner's daily email joins this job in B4.)
 */
export async function GET(request: NextRequest) {
  await connection();
  if (!cronAuthorized(request)) return Response.json({ code: "UNAUTHORIZED" }, { status: 401 });
  const purged = await platformAdmin().purgeCancelledShops({ now: new Date() });
  return Response.json({ purged }, { headers: { "Cache-Control": "no-store" } });
}
