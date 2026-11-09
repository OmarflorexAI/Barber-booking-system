import { connection, type NextRequest } from "next/server";
import { cronAuthorized } from "@/server/cron-auth";
import { platformAdmin } from "@/server/engine";
import { alerts } from "@/server/senders";

/**
 * Daily scheduled job: the Owners' email with yesterday's numbers, and deleting
 * Shops cancelled 30+ days ago. Schedule it at 11:00 and 12:00 UTC: the email goes
 * out from 7:00 Shop time (7:00 New York in summer and winter), once per day.
 */
export async function GET(request: NextRequest) {
  await connection();
  if (!cronAuthorized(request)) return Response.json({ code: "UNAUTHORIZED" }, { status: 401 });
  // The two jobs are independent: one failing must not skip the other.
  const [summaries, purged] = await Promise.allSettled([
    alerts().sendDailySummaries(),
    platformAdmin().purgeCancelledShops({ now: new Date() }),
  ]);
  const report = (r: PromiseSettledResult<unknown>) => (r.status === "fulfilled" ? r.value : { error: String(r.reason) });
  const ok = summaries.status === "fulfilled" && purged.status === "fulfilled";
  return Response.json(
    { summaries: report(summaries), purged: report(purged) },
    { status: ok ? 200 : 500, headers: { "Cache-Control": "no-store" } },
  );
}
