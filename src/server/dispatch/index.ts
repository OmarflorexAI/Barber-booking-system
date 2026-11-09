import type { Sql } from "postgres";

/**
 * The sending worker. It drains the outbox that the booking engine writes in
 * the same transaction as each change, and hands every row to a sender.
 * Providers (Twilio, Telegram/Resend, the payment provider) live behind the
 * `Senders` port, so tests use fakes and providers can be swapped.
 */

export type SmsTemplate = "confirmation" | "reminder" | "cancelled" | "rescheduled";

export type SmsMessage = { shopId: string; bookingId: string; to: string; template: SmsTemplate };
export type BarberAlert = {
  shopId: string;
  bookingId: string;
  barberId: string;
  event: "created" | "cancelled" | "rescheduled" | "paid";
  details: Record<string, unknown>;
};
export type RefundRequest = { shopId: string; bookingId: string; amountCents: number; reason: string };

export type Senders = {
  sms(m: SmsMessage): Promise<void>;
  barberAlert(m: BarberAlert): Promise<void>;
  refund(r: RefundRequest): Promise<void>;
};

type OutboxRow = {
  id: string;
  shop_id: string;
  booking_id: string | null;
  type: string;
  payload: Record<string, unknown>;
  attempts: number;
};

export type DispatchResult = { sent: number; skipped: number; retrying: number; failed: number };

/** How long a claimed row stays invisible to other workers while it is being sent. */
const LEASE_MS = 5 * 60_000;
/** Wait before retry n (after the 1st, 2nd, 3rd failure). The 4th failure is final. */
const RETRY_DELAYS_MIN = [1, 5, 30];
export const MAX_ATTEMPTS = RETRY_DELAYS_MIN.length + 1;

export type Failure = {
  id: string;
  shopId: string;
  bookingId: string | null;
  type: string;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
};

export function createDispatcher({ sql, senders }: { sql: Sql; senders: Senders }) {
  /** Claim due rows; SKIP LOCKED lets several workers run at once without sending a row twice. */
  async function claim(now: Date, limit: number, shopIds?: string[]) {
    const leaseUntil = new Date(now.getTime() + LEASE_MS);
    return sql<OutboxRow[]>`
      update public.outbox o
      set next_attempt_at = ${leaseUntil}, attempts = o.attempts + 1
      where o.id in (
        select id from public.outbox
        where status = 'pending' and next_attempt_at <= ${now}
          ${shopIds ? sql`and shop_id in ${sql(shopIds)}` : sql``}
        order by next_attempt_at
        limit ${limit}
        for update skip locked
      )
      returning o.id, o.shop_id, o.booking_id, o.type, o.payload, o.attempts
    `;
  }

  /**
   * Turn due reminders into outbox rows in one statement, so each reminder is
   * queued exactly once (SKIP LOCKED + sent_at) and then gets the outbox retries.
   */
  async function enqueueDueReminders(now: Date, limit: number, shopIds?: string[]) {
    await sql`
      with due as (
        update public.scheduled_messages sm set sent_at = ${now}
        where sm.id in (
          select id from public.scheduled_messages
          where sent_at is null and send_at <= ${now}
            ${shopIds ? sql`and shop_id in ${sql(shopIds)}` : sql``}
          order by send_at
          limit ${limit}
          for update skip locked
        )
        returning sm.shop_id, sm.booking_id
      )
      insert into public.outbox (shop_id, booking_id, type, next_attempt_at)
      select shop_id, booking_id, 'sms_reminder', ${now} from due
    `;
  }

  /**
   * Who to text, decided at send time, not when the row was written: the Client may
   * have replied STOP, the Shop may have turned texts off, or the Booking may be gone.
   * Returns null when the text should be skipped.
   */
  async function textRecipient(bookingId: string, template: SmsTemplate): Promise<string | null> {
    const [r] = await sql<{ status: string; phone_e164: string | null; sms_opt_out: boolean | null; sms_enabled: boolean }[]>`
      select b.status, c.phone_e164, c.sms_opt_out, s.sms_enabled
      from public.bookings b
      join public.shops s on s.id = b.shop_id
      left join public.clients c on c.id = b.client_id
      where b.id = ${bookingId}
    `;
    if (!r || !r.sms_enabled || !r.phone_e164 || r.sms_opt_out) return null;
    if (r.status === "cancelled" && template !== "cancelled") return null;
    return r.phone_e164;
  }

  async function deliver(row: OutboxRow): Promise<"sent" | "skipped"> {
    const p = row.payload;
    switch (row.type) {
      case "barber_alert": {
        const { event, barberId, ...details } = p as { event: BarberAlert["event"]; barberId: string };
        await senders.barberAlert({ shopId: row.shop_id, bookingId: row.booking_id!, barberId, event, details });
        return "sent";
      }
      case "sms_confirmation":
      case "sms_reminder":
      case "sms_cancelled":
      case "sms_rescheduled": {
        const template = row.type.slice("sms_".length) as SmsTemplate;
        const to = await textRecipient(row.booking_id!, template);
        if (!to) return "skipped";
        await senders.sms({ shopId: row.shop_id, bookingId: row.booking_id!, to, template });
        return "sent";
      }
      case "refund_requested": {
        // Refunds are always in full; the amount was fixed when the Booking was cancelled.
        const { amountCents, reason } = p as { amountCents: number; reason: string };
        await senders.refund({ shopId: row.shop_id, bookingId: row.booking_id!, amountCents, reason });
        return "sent";
      }
      default:
        throw new Error(`unknown outbox type ${row.type}`);
    }
  }

  /**
   * One pass over the due outbox rows. `shopIds` limits the pass to some Shops
   * (used by tests and by a Platform admin retrying one Shop).
   */
  async function run(args: { now: Date; limit?: number; shopIds?: string[] }): Promise<DispatchResult> {
    const result: DispatchResult = { sent: 0, skipped: 0, retrying: 0, failed: 0 };
    await enqueueDueReminders(args.now, args.limit ?? 50, args.shopIds);
    const rows = await claim(args.now, args.limit ?? 50, args.shopIds);
    for (const row of rows) {
      try {
        const outcome = await deliver(row);
        const status = outcome === "sent" ? "done" : "skipped";
        await sql`update public.outbox set status = ${status}, processed_at = ${args.now}, last_error = null where id = ${row.id}`;
        result[outcome] += 1;
      } catch (e) {
        const error = (e instanceof Error ? e.message : String(e)).slice(0, 500);
        if (row.attempts >= MAX_ATTEMPTS) {
          await sql`update public.outbox set status = 'failed', processed_at = ${args.now}, last_error = ${error} where id = ${row.id}`;
          result.failed += 1;
        } else {
          const retryAt = new Date(args.now.getTime() + RETRY_DELAYS_MIN[row.attempts - 1] * 60_000);
          await sql`update public.outbox set next_attempt_at = ${retryAt}, last_error = ${error} where id = ${row.id}`;
          result.retrying += 1;
        }
      }
    }
    return result;
  }

  /** Sends that gave up, newest first: what the Platform admin failures view shows. */
  async function failures(args: { shopIds?: string[]; limit?: number } = {}): Promise<Failure[]> {
    const rows = await sql<{ id: string; shop_id: string; booking_id: string | null; type: string; attempts: number; last_error: string | null; created_at: Date }[]>`
      select id, shop_id, booking_id, type, attempts, last_error, created_at
      from public.outbox
      where status = 'failed' ${args.shopIds ? sql`and shop_id in ${sql(args.shopIds)}` : sql``}
      order by created_at desc
      limit ${args.limit ?? 100}
    `;
    return rows.map((r) => ({
      id: r.id,
      shopId: r.shop_id,
      bookingId: r.booking_id,
      type: r.type,
      attempts: r.attempts,
      lastError: r.last_error,
      createdAt: r.created_at,
    }));
  }

  return { run, failures };
}
