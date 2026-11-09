import type { Sql } from "postgres";
import { hashToken, type BookingEngine } from "@/server/booking-engine";
import { requireOwner } from "@/server/booking-engine/access";
import { BookingError, notFound } from "@/server/booking-engine/errors";
import type { RefundRequest } from "@/server/dispatch";

/**
 * Online payments (B2), provider-neutral. Stripe (test mode) is only a placeholder,
 * so everything the provider does sits behind `PaymentProvider`; only its adapter
 * knows the provider's API. Payments go straight to the Shop's own account.
 *
 * Decisions: an online Booking holds its time for 10 minutes while the Client pays;
 * refunds are always in full; a moved Booking keeps its payment.
 */

/** A webhook whose signature doesn't check out: answer 400, never act on it. */
export class InvalidWebhook extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidWebhook";
  }
}

/** What the app needs from a payment provider. */
export type PaymentProvider = {
  /** Create (or continue) the Shop's account setup and return the provider's page for it. */
  createAccountLink(args: { accountId: string | null; shopId: string; returnUrl: string; refreshUrl: string }): Promise<{ accountId: string; url: string }>;
  /** Whether the account can take card payments yet. */
  accountReady(accountId: string): Promise<boolean>;
  createCheckout(args: {
    accountId: string;
    bookingId: string;
    amountCents: number;
    description: string;
    successUrl: string;
    cancelUrl: string;
    /** When the hold runs out; the provider may keep its page open longer, so we close it ourselves. */
    holdExpiresAt: Date;
  }): Promise<{ checkoutRef: string; url: string }>;
  expireCheckout(args: { accountId: string; checkoutRef: string }): Promise<void>;
  /** Full refund. The idempotency key makes a repeated call refund only once. */
  refund(args: { accountId: string; paymentRef: string; amountCents: number; idempotencyKey: string }): Promise<void>;
  /** Check the provider's signature and turn its event into ours. Throws on a bad signature. */
  parseWebhook(rawBody: string, signature: string | null): PaymentEvent;
};

export type PaymentEvent =
  | { id: string; kind: "checkout_completed"; bookingId: string; checkoutRef: string; paymentRef: string; amountCents: number }
  | { id: string; kind: "account_updated"; accountId: string; ready: boolean }
  | { id: string; kind: "ignored" };

export type WebhookResult = "confirmed" | "refunding" | "already_paid" | "account_updated" | "duplicate" | "ignored";

export function createPayments({ sql, engine, provider, config, clock = () => new Date() }: {
  sql: Sql;
  engine: BookingEngine;
  provider: PaymentProvider;
  config: { siteUrl: string };
  clock?: () => Date;
}) {
  /** Owner only: start (or continue) connecting the Shop's payment account. */
  async function startOnboarding(args: { userId: string; shopId: string }): Promise<{ url: string }> {
    await requireOwner(sql, args.userId, args.shopId);
    const [shop] = await sql<{ payment_account_id: string | null }[]>`select payment_account_id from public.shops where id = ${args.shopId}`;
    if (!shop) throw notFound("Shop");
    const link = await provider.createAccountLink({
      accountId: shop.payment_account_id,
      shopId: args.shopId,
      returnUrl: `${config.siteUrl}/api/payments/return?shop=${args.shopId}`,
      refreshUrl: `${config.siteUrl}/api/payments/onboard?shop=${args.shopId}`,
    });
    if (link.accountId !== shop.payment_account_id) {
      await sql`update public.shops set payment_account_id = ${link.accountId} where id = ${args.shopId}`;
    }
    return { url: link.url };
  }

  /** Owner only: after the provider's setup page, check whether the account can take payments. */
  async function finishOnboarding(args: { userId: string; shopId: string }): Promise<{ ready: boolean }> {
    await requireOwner(sql, args.userId, args.shopId);
    const [shop] = await sql<{ payment_account_id: string | null }[]>`select payment_account_id from public.shops where id = ${args.shopId}`;
    if (!shop?.payment_account_id) return { ready: false };
    const ready = await provider.accountReady(shop.payment_account_id);
    await sql`update public.shops set payments_enabled = ${ready} where id = ${args.shopId}`;
    return { ready };
  }

  /** The Client (holding their manage link) goes to pay for a held Booking. */
  async function startCheckout(args: { bookingId: string; manageToken: string }): Promise<{ url: string }> {
    const now = clock();
    const [b] = await sql<
      { status: string; hold_expires_at: Date | null; price_cents: number; account: string | null; shop_name: string; service: string }[]
    >`
      select b.status, b.hold_expires_at, b.price_cents, s.payment_account_id as account, s.name as shop_name, sv.name_en as service
      from public.bookings b
      join public.shops s on s.id = b.shop_id
      join public.services sv on sv.id = b.service_id
      where b.id = ${args.bookingId} and b.manage_token_hash = ${hashToken(args.manageToken)}
    `;
    if (!b) throw notFound("Booking");
    if (b.status !== "pending_payment" || !b.hold_expires_at || b.hold_expires_at <= now || !b.account) {
      throw new BookingError("BOOKING_NOT_ACTIVE", "This booking is no longer waiting for payment.");
    }
    const manageUrl = `${config.siteUrl}/m/${args.manageToken}`;
    const checkout = await provider.createCheckout({
      accountId: b.account,
      bookingId: args.bookingId,
      amountCents: b.price_cents,
      description: `${b.service} at ${b.shop_name}`,
      successUrl: `${manageUrl}?paid=1`,
      cancelUrl: manageUrl,
      holdExpiresAt: b.hold_expires_at,
    });
    await sql`update public.bookings set checkout_ref = ${checkout.checkoutRef} where id = ${args.bookingId}`;
    return { url: checkout.url };
  }

  /**
   * An event from the provider. The event id is recorded in the same transaction as
   * its effect, so a repeated event (providers retry) does nothing the second time,
   * and a failed one is retried by the provider.
   */
  async function handleWebhook(rawBody: string, signature: string | null): Promise<WebhookResult> {
    const event = provider.parseWebhook(rawBody, signature);
    if (event.kind === "ignored") return "ignored";
    const now = clock();
    return sql.begin(async (tx): Promise<WebhookResult> => {
      const [fresh] = await tx`
        insert into public.payment_events (id, type) values (${event.id}, ${event.kind})
        on conflict (id) do nothing returning id
      `;
      if (!fresh) return "duplicate";

      if (event.kind === "account_updated") {
        await tx`update public.shops set payments_enabled = ${event.ready} where payment_account_id = ${event.accountId}`;
        return "account_updated";
      }
      // The event is signed by the provider and the booking id is one we set on the checkout,
      // so any paid checkout for a Booking goes through recordOnlinePayment: confirmed, or
      // refunded in full. Never keep a payment silently.
      const [b] = await tx`select 1 from public.bookings where id = ${event.bookingId}`;
      if (!b) {
        console.error("[payments] payment for a booking that no longer exists; refund it by hand", {
          bookingId: event.bookingId,
          paymentRef: event.paymentRef,
        });
        return "ignored";
      }
      return engine.recordOnlinePayment({ bookingId: event.bookingId, paymentRef: event.paymentRef, now }, tx);
    });
  }

  /** Scheduled job (every minute): free the time of unpaid holds and close their checkout pages. */
  async function releaseExpiredHolds(): Promise<{ released: number }> {
    const released = await engine.releaseExpiredHolds({ now: clock() });
    for (const r of released) {
      if (!r.accountId || !r.checkoutRef) continue;
      try {
        await provider.expireCheckout({ accountId: r.accountId, checkoutRef: r.checkoutRef });
      } catch (e) {
        // A payment that still gets through is refunded when its event arrives.
        console.warn("[payments] could not close a checkout", { bookingId: r.bookingId, error: String(e) });
      }
    }
    return { released: released.length };
  }

  /** The sending worker's refund sender: full refund to the card, then mark the Booking refunded. */
  async function refund(r: RefundRequest): Promise<void> {
    const [b] = await sql<{ payment_ref: string | null; payment_status: string; account: string | null }[]>`
      select b.payment_ref, b.payment_status, s.payment_account_id as account
      from public.bookings b join public.shops s on s.id = b.shop_id
      where b.id = ${r.bookingId} and b.shop_id = ${r.shopId}
    `;
    if (!b) throw new Error(`booking ${r.bookingId} not found for refund`);
    if (b.payment_status === "refunded") return;
    if (!b.payment_ref || !b.account) throw new Error("no online payment to refund for this booking");
    await provider.refund({ accountId: b.account, paymentRef: b.payment_ref, amountCents: r.amountCents, idempotencyKey: `refund-${r.bookingId}` });
    await sql`update public.bookings set payment_status = 'refunded' where id = ${r.bookingId}`;
  }

  return { startOnboarding, finishOnboarding, startCheckout, handleWebhook, releaseExpiredHolds, refund };
}

export type Payments = ReturnType<typeof createPayments>;
