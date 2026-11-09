import { createHmac, timingSafeEqual } from "node:crypto";
import { InvalidWebhook, type PaymentEvent, type PaymentProvider } from "@/server/payments";

/**
 * Stripe (test mode) behind the provider-neutral PaymentProvider port, through
 * fetch (no SDK). Stripe Connect with direct charges: each payment is made on the
 * Shop's own account (the `Stripe-Account` header). Errors never include keys.
 */

const API = "https://api.stripe.com/v1";
/** Stripe accepts a signed event for this long after it was signed. */
const SIGNATURE_TOLERANCE_S = 300;
/**
 * Stripe won't close a checkout page sooner than 30 minutes, so its expiry is the hold's
 * end plus this (always over 30 minutes away, since the hold hasn't ended); we close it
 * at the hold's end ourselves. Derived from the hold, not the clock, so a second "Pay
 * now" sends the same parameters and the idempotency key returns the same page.
 */
const CHECKOUT_GRACE_S = 31 * 60;

type Params = Record<string, unknown>;

/** Stripe's form encoding: nested objects and arrays as a[b][0][c]=v. */
export function stripeForm(params: Params, prefix = "", out = new URLSearchParams()): URLSearchParams {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) value.forEach((v, i) => (typeof v === "object" ? stripeForm(v as Params, `${name}[${i}]`, out) : out.append(`${name}[${i}]`, String(v))));
    else if (typeof value === "object") stripeForm(value as Params, name, out);
    else out.append(name, String(value));
  }
  return out;
}

/**
 * Stripe-Signature: "t=<unix seconds>,v1=<hex HMAC-SHA256 of `${t}.${body}`>" (several v1 allowed).
 */
export function stripeSignatureValid(args: { secret: string; rawBody: string; header: string | null; now: Date }): boolean {
  if (!args.header) return false;
  const parts = args.header.split(",").map((p) => p.split("=") as [string, string]);
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  if (!Number.isFinite(t) || Math.abs(args.now.getTime() / 1000 - t) > SIGNATURE_TOLERANCE_S) return false;
  const want = Buffer.from(createHmac("sha256", args.secret).update(`${t}.${args.rawBody}`).digest("hex"));
  return parts
    .filter(([k]) => k === "v1")
    .some(([, v]) => {
      const got = Buffer.from(v ?? "");
      return got.length === want.length && timingSafeEqual(got, want);
    });
}

type StripeEvent = { id: string; type: string; account?: string; data: { object: Record<string, unknown> } };

/** Turn the Stripe events we use into ours; everything else is ignored. */
export function toPaymentEvent(e: StripeEvent): PaymentEvent {
  const o = e.data.object;
  if (e.type === "checkout.session.completed" || e.type === "checkout.session.async_payment_succeeded") {
    const bookingId = (o.metadata as Record<string, string> | undefined)?.booking_id;
    if (o.payment_status !== "paid" || !bookingId || typeof o.payment_intent !== "string") return { id: e.id, kind: "ignored" };
    return { id: e.id, kind: "checkout_completed", bookingId, checkoutRef: String(o.id), paymentRef: o.payment_intent, amountCents: Number(o.amount_total) };
  }
  if (e.type === "account.updated") return { id: e.id, kind: "account_updated", accountId: String(o.id), ready: o.charges_enabled === true };
  return { id: e.id, kind: "ignored" };
}

export function createStripePayments(cfg: { secretKey: string; webhookSecret: string; clock?: () => Date }): PaymentProvider {
  const clock = cfg.clock ?? (() => new Date());

  async function call<T>(method: "GET" | "POST", path: string, params: Params = {}, headers: Record<string, string> = {}): Promise<T> {
    const body = method === "POST" ? stripeForm(params) : undefined;
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${cfg.secretKey}`, "Content-Type": "application/x-www-form-urlencoded", ...headers },
      body,
    });
    const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; code?: string } };
    if (!res.ok) throw new Error(`Stripe ${method} ${path.split("/").slice(0, 3).join("/")} ${res.status}: ${json.error?.message ?? "failed"}`);
    return json;
  }
  const onAccount = (accountId: string) => ({ "Stripe-Account": accountId });

  return {
    async createAccountLink({ accountId, shopId, returnUrl, refreshUrl }) {
      let id = accountId;
      if (!id) {
        const account = await call<{ id: string }>("POST", "/accounts", {
          type: "express",
          country: "US",
          capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
          metadata: { shop_id: shopId },
        });
        id = account.id;
      }
      const link = await call<{ url: string }>("POST", "/account_links", {
        account: id,
        type: "account_onboarding",
        return_url: returnUrl,
        refresh_url: refreshUrl,
      });
      return { accountId: id, url: link.url };
    },

    async accountReady(accountId) {
      const account = await call<{ charges_enabled?: boolean }>("GET", `/accounts/${encodeURIComponent(accountId)}`);
      return account.charges_enabled === true;
    },

    async createCheckout(a) {
      const expiresAt = Math.floor(a.holdExpiresAt.getTime() / 1000) + CHECKOUT_GRACE_S;
      const session = await call<{ id: string; url: string }>(
        "POST",
        "/checkout/sessions",
        {
          mode: "payment",
          line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: a.amountCents, product_data: { name: a.description } } }],
          success_url: a.successUrl,
          cancel_url: a.cancelUrl,
          client_reference_id: a.bookingId,
          metadata: { booking_id: a.bookingId },
          payment_intent_data: { metadata: { booking_id: a.bookingId } },
          expires_at: expiresAt,
        },
        { ...onAccount(a.accountId), "Idempotency-Key": `checkout-${a.bookingId}` },
      );
      return { checkoutRef: session.id, url: session.url };
    },

    async expireCheckout({ accountId, checkoutRef }) {
      await call("POST", `/checkout/sessions/${encodeURIComponent(checkoutRef)}/expire`, {}, onAccount(accountId));
    },

    async refund({ accountId, paymentRef, amountCents, idempotencyKey }) {
      await call("POST", "/refunds", { payment_intent: paymentRef, amount: amountCents }, { ...onAccount(accountId), "Idempotency-Key": idempotencyKey });
    },

    parseWebhook(rawBody, signature) {
      if (!stripeSignatureValid({ secret: cfg.webhookSecret, rawBody, header: signature, now: clock() })) {
        throw new InvalidWebhook("Stripe signature check failed");
      }
      return toPaymentEvent(JSON.parse(rawBody) as StripeEvent);
    },
  };
}
