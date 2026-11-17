import "server-only";
import { after } from "next/server";
import { sendingWorker } from "./senders";

/**
 * Rows are stamped with the database clock but claimed against this server's clock, and the
 * drain starts within milliseconds of the insert. A server clock even slightly behind the
 * database would hide the fresh rows until the next cron, so look a little ahead.
 */
const SKEW_MS = 30_000;


/**
 * Send the outbox right after a booking change, once the response has gone out. On Vercel
 * Hobby the cron can run only once a day, so without this a Client email, a Barber alert or a
 * refund would wait up to a day. The daily cron stays as the backstop.
 *
 * Safe to run next to other drains (more after() calls, the cron): the dispatcher claims rows
 * with `for update skip locked` and a 5 minute lease. Never throws into the response.
 */
export function drainSoon(opts: { shopIds?: string[] } = {}): void {
  try {
    after(async () => {
      try {
        await sendingWorker().run({
          now: new Date(Date.now() + SKEW_MS),
          ...(opts.shopIds && opts.shopIds.length > 0 ? { shopIds: opts.shopIds } : {}),
        });
      } catch (e) {
        console.error("[drain-soon] drain failed", e instanceof Error ? e.message : String(e));
      }
    });
  } catch (e) {
    // after() itself can throw outside a request scope; the cron will pick the rows up.
    console.error("[drain-soon] could not schedule", e instanceof Error ? e.message : String(e));
  }
}
