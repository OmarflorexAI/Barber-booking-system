import "server-only";
import { createDispatcher, type Senders } from "./dispatch";
import { getSql } from "./db";

/** Show only the last 4 digits of a phone number in logs. */
const maskPhone = (e164: string) => `***${e164.slice(-4)}`;

/**
 * Placeholder senders until the real providers are connected:
 * texts (Twilio) in B3, Barber alerts (Telegram + Resend) in B4, refunds (payment provider) in B2.
 * They log what would have been sent, so the full flow can be watched locally.
 */
const logSenders: Senders = {
  async sms(m) {
    console.info("[send:sms]", { shopId: m.shopId, bookingId: m.bookingId, to: maskPhone(m.to), template: m.template });
  },
  async barberAlert(m) {
    console.info("[send:barber-alert]", { shopId: m.shopId, bookingId: m.bookingId, barberId: m.barberId, event: m.event });
  },
  async refund(r) {
    console.info("[send:refund]", r);
  },
};

let dispatcher: ReturnType<typeof createDispatcher> | undefined;

/** The app-wide sending worker. */
export function sendingWorker() {
  dispatcher ??= createDispatcher({ sql: getSql(), senders: logSenders });
  return dispatcher;
}
