import { timingSafeEqual } from "node:crypto";
import { connection, type NextRequest } from "next/server";
import { sendingWorker } from "@/server/senders";

/** Stop draining after this long so one run stays well inside the function time limit. */
const BUDGET_MS = 50_000;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed: no secret configured, no access
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/**
 * Scheduled job: queue due reminders and drain the outbox (texts, Barber alerts, refunds).
 * Called every minute by the scheduler with `Authorization: Bearer $CRON_SECRET`.
 * Safe to run twice at once: rows are claimed with SKIP LOCKED.
 */
export async function GET(request: NextRequest) {
  await connection();
  if (!authorized(request)) return Response.json({ code: "UNAUTHORIZED" }, { status: 401 });

  const started = Date.now();
  const total = { sent: 0, skipped: 0, retrying: 0, failed: 0 };
  for (;;) {
    const r = await sendingWorker().run({ now: new Date() });
    for (const k of Object.keys(total) as (keyof typeof total)[]) total[k] += r[k];
    const handled = r.sent + r.skipped + r.retrying + r.failed;
    if (handled === 0 || Date.now() - started > BUDGET_MS) break;
  }
  return Response.json(total, { headers: { "Cache-Control": "no-store" } });
}
