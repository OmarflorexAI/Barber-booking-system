import { afterAll, afterEach, describe, expect, it } from "vitest";
import { createAlerts, type ChatProvider, type EmailProvider } from "@/server/alerts";
import { isBookingError, type BookingErrorCode } from "@/server/booking-engine";
import { createPayments, type PaymentProvider } from "@/server/payments";
import { createPlatformAdmin } from "@/server/platform-admin";
import { book, dropShop, dropUser, engine, makePlatformAdmin, makeShop, makeUser, NOW, outboxTypes, sql, type TestShop } from "./fixtures";

/**
 * Plans Free and Pro (M7). Pro = online card payments, Telegram alerts, Client texts.
 * The server refuses them on Free (PRO_ONLY) or treats them as switched off.
 */

const SITE = "https://app.test";
const platform = createPlatformAdmin(sql);

const shops: TestShop[] = [];
const admins: string[] = [];
async function shopOn(plan: "free" | "pro") {
  const s = await makeShop({ plan, smsEnabled: true, onlinePayments: true });
  shops.push(s);
  return s;
}
afterEach(async () => {
  for (const s of shops.splice(0)) await dropShop(s);
  for (const a of admins.splice(0)) await dropUser(a);
});
afterAll(async () => {
  await sql.end();
});

async function expectCode(p: Promise<unknown>, code: BookingErrorCode) {
  const e = await p.then(
    () => null,
    (err: unknown) => err,
  );
  expect(isBookingError(e, code), `expected ${code}, got ${String(e)}`).toBe(true);
}

const calls: string[] = [];
const provider: PaymentProvider = {
  async createAccountLink(args) {
    calls.push("accountLink");
    return { accountId: args.accountId ?? "acct_new", url: "https://pay.test/onboard" };
  },
  async accountReady() {
    return true;
  },
  async createCheckout(args) {
    calls.push("checkout");
    return { checkoutRef: `cs_${args.bookingId}`, url: `https://pay.test/c/${args.bookingId}` };
  },
  async expireCheckout() {},
  async refund() {},
  parseWebhook() {
    return { id: "x", kind: "ignored" };
  },
};
const payments = createPayments({ sql, engine, provider, config: { siteUrl: SITE }, clock: () => NOW });

function fakeAlerts() {
  const chats: number[] = [];
  const emails: string[][] = [];
  const chat: ChatProvider = { async send(m) { chats.push(m.chatId); } };
  const email: EmailProvider = { async send(m) { emails.push(m.to); } };
  const alerts = createAlerts({ sql, chat, email, config: { siteUrl: SITE, botUsername: "barbermaster_bot" }, clock: () => NOW });
  return { alerts, chats, emails };
}

const setPlanRaw = (s: TestShop, plan: "free" | "pro") => sql`update public.shops set plan = ${plan} where id = ${s.shopId}`;

describe("online card payments", () => {
  it("a Free Shop's catalog offers no online payment and booking online is PRO_ONLY", async () => {
    const shop = await shopOn("free");
    const catalog = (await engine.getShopCatalog(shop.slug, NOW))!;
    expect(catalog.shop).toMatchObject({ plan: "free", onlinePayments: false, smsEnabled: false });
    await expectCode(book(shop, { paymentMethod: "online" }), "PRO_ONLY");
    const { booking } = await book(shop); // pay in person still works
    expect(booking).toMatchObject({ status: "confirmed", paymentMethod: "in_person" });
  });

  it("a hold made on Pro can't start checkout once the Shop is on Free", async () => {
    const shop = await shopOn("pro");
    const { booking, manageToken } = await book(shop, { paymentMethod: "online" });
    await setPlanRaw(shop, "free");
    calls.length = 0;
    await expectCode(payments.startCheckout({ bookingId: booking.id, manageToken }), "PRO_ONLY");
    expect(calls).toEqual([]);
  });

  it("an Owner on Free can't start connecting a payment account", async () => {
    const shop = await shopOn("free");
    const owner = await makeUser(shop.shopId, "owner");
    calls.length = 0;
    await expectCode(payments.startOnboarding({ userId: owner, shopId: shop.shopId }), "PRO_ONLY");
    expect(calls).toEqual([]);
  });

  it("a Pro Shop behaves as before: catalog offers it and checkout starts", async () => {
    const shop = await shopOn("pro");
    expect((await engine.getShopCatalog(shop.slug, NOW))!.shop).toMatchObject({ plan: "pro", onlinePayments: true, smsEnabled: true });
    const { booking, manageToken } = await book(shop, { paymentMethod: "online" });
    const { url } = await payments.startCheckout({ bookingId: booking.id, manageToken });
    expect(url).toBe(`https://pay.test/c/${booking.id}`);
  });
});

describe("Client texts", () => {
  it("a Free Shop writes no Client text rows; the Barber alert still goes out", async () => {
    const shop = await shopOn("free");
    const owner = await makeUser(shop.shopId, "owner");
    const { booking } = await book(shop);
    expect(await outboxTypes(booking.id)).toEqual(["barber_alert"]);
    await engine.cancelBooking({ actor: { kind: "staff", userId: owner }, bookingId: booking.id, now: NOW });
    expect(await outboxTypes(booking.id)).toEqual(["barber_alert", "barber_alert"]);
  });

  it("a Pro Shop writes them as before", async () => {
    const shop = await shopOn("pro");
    const owner = await makeUser(shop.shopId, "owner");
    const { booking } = await book(shop);
    expect(await outboxTypes(booking.id)).toEqual(["barber_alert", "sms_confirmation"]);
    await engine.cancelBooking({ actor: { kind: "staff", userId: owner }, bookingId: booking.id, now: NOW });
    expect((await outboxTypes(booking.id)).sort()).toEqual(["barber_alert", "barber_alert", "sms_cancelled", "sms_confirmation"]);
  });
});

describe("Telegram alerts", () => {
  it("refuses a link on Free", async () => {
    const shop = await shopOn("free");
    const owner = await makeUser(shop.shopId, "owner");
    const { alerts } = fakeAlerts();
    await expectCode(alerts.createTelegramLink({ userId: owner, shopId: shop.shopId, barberId: shop.alex }), "PRO_ONLY");
  });

  it("a link made on Pro can't be used, and a linked chat isn't used, once the Shop is on Free", async () => {
    const shop = await shopOn("pro");
    const owner = await makeUser(shop.shopId, "owner");
    const f = fakeAlerts();
    const { url } = await f.alerts.createTelegramLink({ userId: owner, shopId: shop.shopId, barberId: shop.alex });
    const token = new URL(url).searchParams.get("start")!;
    await setPlanRaw(shop, "free");
    expect(await f.alerts.handleTelegramUpdate({ message: { chat: { id: 77 }, text: `/start ${token}` } })).toBe("invalid");

    // Linked while on Pro, then moved to Free: the alert falls back to email.
    await sql`update public.barber_telegram set chat_id = 77, linked_at = ${NOW} where barber_id = ${shop.alex}`;
    const { booking } = await book(shop);
    f.chats.length = 0;
    await f.alerts.send({ shopId: shop.shopId, bookingId: booking.id, barberId: shop.alex, event: "created", details: {} });
    expect(f.chats).toEqual([]);
    expect(f.emails).toHaveLength(1);
  });
});

describe("setPlan", () => {
  it("needs a Platform admin, logs the change and lifts the gating", async () => {
    const shop = await shopOn("free");
    const owner = await makeUser(shop.shopId, "owner");
    await expectCode(platform.setPlan({ userId: owner, shopId: shop.shopId, plan: "pro" }), "FORBIDDEN");

    const admin = await makePlatformAdmin();
    admins.push(admin);
    await expectCode(platform.setPlan({ userId: admin, shopId: shop.shopId, plan: "gold" as "pro" }), "INVALID_INPUT");
    await platform.setPlan({ userId: admin, shopId: shop.shopId, plan: "pro" });
    await platform.setPlan({ userId: admin, shopId: shop.shopId, plan: "pro" }); // no change: not logged again

    const log = await platform.listSupportAccess({ userId: admin, shopId: shop.shopId });
    expect(log.map((l) => l.reason)).toEqual(["Plan changed from free to pro"]);
    expect(log[0].adminUserId).toBe(admin);
    expect((await engine.getShopCatalog(shop.slug, NOW))!.shop).toMatchObject({ plan: "pro", onlinePayments: true });
    expect((await platform.listShops({ userId: admin, now: NOW })).find((s) => s.id === shop.shopId)?.plan).toBe("pro");
  });
});

describe("an Owner can't change what we sell them (RLS + guard trigger)", () => {
  /** Run an update as a signed-in user, the way Supabase's API does. Returns the error code, or "OK". */
  async function asUser(userId: string, q: (tx: typeof sql) => Promise<unknown>): Promise<string> {
    try {
      await sql.begin(async (tx) => {
        await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: "authenticated" })}, true)`;
        await tx`set local role authenticated`;
        await q(tx as unknown as typeof sql);
      });
      return "OK";
    } catch (e) {
      return (e as { code?: string }).code ?? "ERR";
    }
  }

  it("refuses plan, billing, status, payments and texts; still allows the Shop's own details", async () => {
    const shop = await shopOn("free");
    const owner = await makeUser(shop.shopId, "owner");
    const id = shop.shopId;
    const tries = [
      (tx: typeof sql) => tx`update public.shops set plan = 'pro' where id = ${id}`,
      (tx: typeof sql) => tx`update public.shops set billing_status = 'paid' where id = ${id}`,
      (tx: typeof sql) => tx`update public.shops set status = 'active', sms_enabled = false where id = ${id}`,
      (tx: typeof sql) => tx`update public.shops set sms_registration = 'approved' where id = ${id}`,
      (tx: typeof sql) => tx`update public.shops set payments_enabled = false where id = ${id}`,
      (tx: typeof sql) => tx`update public.shops set payment_account_id = 'acct_fake' where id = ${id}`,
    ];
    for (const t of tries) expect(await asUser(owner, t)).toBe("42501");
    const [row] = await sql<{ plan: string }[]>`select plan from public.shops where id = ${id}`;
    expect(row.plan).toBe("free");
    expect(await asUser(owner, (tx) => tx`update public.shops set name = 'Renamed' where id = ${id}`)).toBe("OK");
    // The server (DB owner) still can.
    await sql`update public.shops set plan = 'pro' where id = ${id}`;
  });

  it("refuses the booking link, the text sender and our bookkeeping fields (audit #3)", async () => {
    const shop = await shopOn("free");
    const owner = await makeUser(shop.shopId, "owner");
    const id = shop.shopId;
    const tries = [
      (tx: typeof sql) => tx`update public.shops set slug = ${`${shop.slug}-x`} where id = ${id}`,
      (tx: typeof sql) => tx`update public.shops set sms_from_number = '+12125550199' where id = ${id}`,
      (tx: typeof sql) => tx`update public.shops set cancelled_at = now() where id = ${id}`,
      (tx: typeof sql) => tx`update public.shops set daily_email_last_date = current_date where id = ${id}`,
      (tx: typeof sql) => tx`update public.shops set created_at = now() - interval '1 year' where id = ${id}`,
    ];
    for (const t of tries) expect(await asUser(owner, t)).toBe("42501");
    expect(await asUser(owner, (tx) => tx`update public.shops set address = '1 Main St' where id = ${id}`)).toBe("OK");
  });

  it("a Barber can't change their own Owner-only phone (audit #4)", async () => {
    const shop = await shopOn("free");
    const barber = await makeUser(shop.shopId, "barber", shop.blake);
    const owner = await makeUser(shop.shopId, "owner");
    const b = shop.blake;
    expect(await asUser(barber, (tx) => tx`update public.barbers set phone_e164 = '+12125550198' where id = ${b}`)).toBe("42501");
    expect(await asUser(barber, (tx) => tx`update public.barbers set bio = 'Fades' where id = ${b}`)).toBe("OK");
    expect(await asUser(owner, (tx) => tx`update public.barbers set phone_e164 = '+12125550198' where id = ${b}`)).toBe("OK");
  });

  it("nobody signed in turns texts back on for a Client who replied STOP (audit #5)", async () => {
    const shop = await shopOn("free");
    const owner = await makeUser(shop.shopId, "owner");
    const [c] = await sql<{ id: string }[]>`
      insert into public.clients (shop_id, name, phone_e164, sms_opt_out) values (${shop.shopId}, 'Stop', '+12125550197', true) returning id`;
    expect(await asUser(owner, (tx) => tx`update public.clients set sms_opt_out = false where id = ${c.id}`)).toBe("42501");
    expect(await asUser(owner, (tx) => tx`update public.clients set name = 'Renamed' where id = ${c.id}`)).toBe("OK");
    // The server (Twilio's START reply) still can.
    await sql`update public.clients set sms_opt_out = false where id = ${c.id}`;
  });
});
