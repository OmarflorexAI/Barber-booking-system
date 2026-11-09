import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTexting, type SmsProvider } from "@/server/texting";
import { book, dropShop, engine, makeShop, MANAGE_LINK_SECRET, NOW, sql, type TestShop } from "./fixtures";

/**
 * Client texts (B3). Real Postgres; a fake SMS provider at the edge records what would be sent.
 */

const SITE = "https://app.test";

function fakeSms() {
  const sent: { from: string; to: string; body: string }[] = [];
  const provider: SmsProvider = {
    async send(m) {
      sent.push(m);
      return { id: `SM${sent.length}` };
    },
  };
  return { provider, sent };
}

let shop: TestShop;
let sms: ReturnType<typeof fakeSms>;
const texting = () =>
  createTexting({ sql, provider: sms.provider, config: { siteUrl: SITE, manageLinkSecret: MANAGE_LINK_SECRET, defaultFrom: "+15550000000", dailySegmentCap: 900 } });

beforeEach(async () => {
  shop = await makeShop({ smsEnabled: true });
  sms = fakeSms();
});
afterEach(async () => {
  await dropShop(shop);
});
afterAll(async () => {
  await sql.end();
});

describe("texting a Client", () => {
  it("confirms in the Client's language with a manage link that opens their Booking", async () => {
    const { booking } = await book(shop, { locale: "es", client: { name: "Ana", phone: "(718) 555-0101" } });

    await texting().send({ shopId: shop.shopId, bookingId: booking.id, to: "+17185550101", template: "confirmation" });

    expect(sms.sent).toHaveLength(1);
    const { from, to, body } = sms.sent[0];
    expect({ from, to }).toEqual({ from: "+15550000000", to: "+17185550101" });
    expect(body).toContain("Test Shop");
    expect(body).toContain("Cut con Alex");
    expect(body).toMatch(/STOP/);
    expect(body).not.toContain(".."); // "a.m." is not followed by a second period
    const link = body.match(/https:\/\/app\.test\/m\/(\S+)/);
    expect(link).not.toBeNull();
    const opened = await engine.getBookingByToken(link![1], NOW);
    expect(opened?.booking.id).toBe(booking.id);
  });
});

describe("every text", () => {
  it("fits in at most 2 segments in both languages and says what happened", async () => {
    const expected = {
      en: { confirmation: "booked!", reminder: "reminder", cancelled: "cancelled", rescheduled: "moved to" },
      es: { confirmation: "cita confirmada", reminder: "recordatorio", cancelled: "fue cancelada", rescheduled: "ahora es el" },
    } as const;
    for (const locale of ["en", "es"] as const) {
      const { booking } = await book(shop, { locale, barberId: locale === "en" ? shop.alex : shop.blake });
      for (const [template, words] of Object.entries(expected[locale])) {
        await texting().send({ shopId: shop.shopId, bookingId: booking.id, to: "+17185550101", template: template as never });
        expect(sms.sent.at(-1)!.body).toContain(words);
      }
    }
    const logged = await sql<{ segments: number }[]>`select segments from public.sms_log where shop_id = ${shop.shopId}`;
    expect(logged).toHaveLength(8);
    expect(Math.max(...logged.map((l) => l.segments))).toBeLessThanOrEqual(2);
  });

  it("waits instead of going over the Shop's daily limit", async () => {
    const { booking } = await book(shop);
    const capped = createTexting({
      sql,
      provider: sms.provider,
      config: { siteUrl: SITE, manageLinkSecret: MANAGE_LINK_SECRET, defaultFrom: "+15550000000", dailySegmentCap: 2 },
      clock: () => NOW,
    });
    const msg = { shopId: shop.shopId, bookingId: booking.id, to: "+17185550101", template: "confirmation" as const };
    await capped.send(msg); // 1 segment
    await capped.send(msg); // 2 segments
    await expect(capped.send(msg)).rejects.toMatchObject({ retryAt: new Date("2027-01-12T05:00:00Z") }); // next midnight, New York
    expect(sms.sent).toHaveLength(2);

    const nextDay = createTexting({
      sql,
      provider: sms.provider,
      config: { siteUrl: SITE, manageLinkSecret: MANAGE_LINK_SECRET, defaultFrom: "+15550000000", dailySegmentCap: 2 },
      clock: () => new Date(NOW.getTime() + 24 * 60 * 60_000),
    });
    await nextDay.send(msg);
    expect(sms.sent).toHaveLength(3);
  });
});

describe("Client replies", () => {
  it("STOP opts the number out of the Shop and START opts it back in", async () => {
    await book(shop, { client: { name: "Ana", phone: "7185550101" } });
    const optOut = async () =>
      (await sql<{ sms_opt_out: boolean }[]>`select sms_opt_out from public.clients where shop_id = ${shop.shopId} and phone_e164 = '+17185550101'`)[0]
        .sms_opt_out;

    expect(await texting().handleReply({ from: "+17185550101", to: "+15550000000", body: " stop " })).toBe("opted_out");
    expect(await optOut()).toBe(true);
    expect(await texting().handleReply({ from: "+17185550101", to: "+15559999999", body: "START" })).toBe("opted_in");
    expect(await optOut()).toBe(true); // a different number: not this Shop's texts
    expect(await texting().handleReply({ from: "+17185550101", to: "+15550000000", body: "Start" })).toBe("opted_in");
    expect(await optOut()).toBe(false);
    expect(await texting().handleReply({ from: "+17185550101", to: "+15550000000", body: "see you at 10" })).toBe("ignored");
  });
});
