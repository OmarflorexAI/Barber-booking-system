import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStripePayments, stripeForm, stripeSignatureValid, toPaymentEvent } from "@/server/providers/stripe";

const secret = "whsec_test";
const now = new Date("2027-01-11T14:00:00Z");
const t = Math.floor(now.getTime() / 1000);
const body = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
// Signed the way Stripe documents it: HMAC-SHA256 of "<t>.<body>", hex.
const sign = (ts: number, payload = body) => `t=${ts},v1=${createHmac("sha256", secret).update(`${ts}.${payload}`).digest("hex")}`;

describe("Stripe webhook signature", () => {
  it("accepts a fresh event Stripe signed", () => {
    expect(stripeSignatureValid({ secret, rawBody: body, header: sign(t), now })).toBe(true);
  });
  it("rejects forged, altered, old or unsigned events", () => {
    expect(stripeSignatureValid({ secret: "other", rawBody: body, header: sign(t), now })).toBe(false);
    expect(stripeSignatureValid({ secret, rawBody: body.replace("evt_1", "evt_2"), header: sign(t), now })).toBe(false);
    expect(stripeSignatureValid({ secret, rawBody: body, header: sign(t - 600), now })).toBe(false);
    expect(stripeSignatureValid({ secret, rawBody: body, header: null, now })).toBe(false);
  });
});

describe("Stripe events", () => {
  it("maps a paid checkout to our event, and ignores unpaid ones and other types", () => {
    const paid = {
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", payment_status: "paid", payment_intent: "pi_1", amount_total: 3000, metadata: { booking_id: "b1" } } },
    };
    expect(toPaymentEvent(paid)).toEqual({ id: "evt_1", kind: "checkout_completed", bookingId: "b1", checkoutRef: "cs_1", paymentRef: "pi_1", amountCents: 3000 });
    expect(toPaymentEvent({ ...paid, data: { object: { ...paid.data.object, payment_status: "unpaid" } } }).kind).toBe("ignored");
    expect(toPaymentEvent({ id: "evt_2", type: "account.updated", data: { object: { id: "acct_1", charges_enabled: true } } })).toEqual({
      id: "evt_2",
      kind: "account_updated",
      accountId: "acct_1",
      ready: true,
    });
    expect(toPaymentEvent({ id: "evt_3", type: "charge.refunded", data: { object: {} } }).kind).toBe("ignored");
  });

  it("encodes nested parameters the way Stripe expects", () => {
    const form = stripeForm({ line_items: [{ quantity: 1, price_data: { unit_amount: 3000 } }], metadata: { booking_id: "b1" }, skip: undefined });
    expect(form.toString()).toBe(
      "line_items%5B0%5D%5Bquantity%5D=1&line_items%5B0%5D%5Bprice_data%5D%5Bunit_amount%5D=3000&metadata%5Bbooking_id%5D=b1",
    );
  });
});

describe("Stripe Checkout", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("offers cards only (wallets ride on card; no delayed methods that outlast the hold)", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "cs_1", url: "https://checkout.test/cs_1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const stripe = createStripePayments({ secretKey: "sk_test_x", webhookSecret: secret, clock: () => now });
    await stripe.createCheckout({
      accountId: "acct_1",
      bookingId: "b1",
      amountCents: 3000,
      description: "Cut",
      successUrl: "https://x.test/ok",
      cancelUrl: "https://x.test/back",
      holdExpiresAt: new Date(now.getTime() + 10 * 60_000),
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.stripe.com/v1/checkout/sessions");
    const form = init.body as URLSearchParams;
    expect(form.getAll("payment_method_types[0]")).toEqual(["card"]);
    expect(form.has("payment_method_types[1]")).toBe(false);
  });
});
