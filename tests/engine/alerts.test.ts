import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAlerts, type ChatProvider, type EmailProvider } from "@/server/alerts";
import { at, book, dropShop, makeShop, makeUser, NOW, sql, TOMORROW, type TestShop } from "./fixtures";

/**
 * Barber and Owner alerts (B4). Real Postgres; fake Telegram and email providers.
 */

const SITE = "https://app.test";
const DAY = 24 * 60 * 60_000;

function fakes() {
  const chats: { chatId: number; text: string }[] = [];
  const emails: { to: string[]; subject: string; text: string }[] = [];
  let telegramDown = false;
  const chat: ChatProvider = {
    async send(m) {
      if (telegramDown) throw new Error("telegram down");
      chats.push(m);
    },
  };
  const email: EmailProvider = {
    async send(m) {
      emails.push(m);
    },
  };
  return { chat, email, chats, emails, setTelegramDown: (v: boolean) => (telegramDown = v) };
}

let shop: TestShop;
let f: ReturnType<typeof fakes>;
let owner: string;
const alerts = (now = NOW) =>
  createAlerts({ sql, chat: f.chat, email: f.email, config: { siteUrl: SITE, botUsername: "barbermaster_bot" }, clock: () => now });
const emailOf = async (userId: string) => (await sql<{ email: string }[]>`select email from auth.users where id = ${userId}`)[0].email;

beforeEach(async () => {
  shop = await makeShop();
  f = fakes();
  owner = await makeUser(shop.shopId, "owner");
});
afterEach(async () => {
  await dropShop(shop);
});
afterAll(async () => {
  await sql.end();
});

async function linkTelegram(barberId: string, chatId: number, userId = owner) {
  const { url } = await alerts().createTelegramLink({ userId, shopId: shop.shopId, barberId });
  const token = new URL(url).searchParams.get("start")!;
  return alerts().handleTelegramUpdate({ message: { chat: { id: chatId }, text: `/start ${token}` } });
}

describe("alerting a Barber", () => {
  it("sends a new Booking to the Barber's Telegram with a link to that day", async () => {
    expect(await linkTelegram(shop.alex, 4242)).toBe("linked");
    f.chats.length = 0; // drop the "you're connected" message
    const { booking } = await book(shop, { client: { name: "Ana Lopez", phone: "7185550101" } });

    await alerts().send({ shopId: shop.shopId, bookingId: booking.id, barberId: shop.alex, event: "created", details: {} });

    expect(f.emails).toHaveLength(0);
    expect(f.chats).toHaveLength(1);
    expect(f.chats[0].chatId).toBe(4242);
    expect(f.chats[0].text).toContain("Ana Lopez");
    expect(f.chats[0].text).toContain("Cut");
    expect(f.chats[0].text).toContain(`${SITE}/app/day?date=${TOMORROW}`);
  });

  it("emails the Barber when Telegram isn't linked or fails, and the Owner when the Barber has no login", async () => {
    const { booking } = await book(shop);
    const alert = { shopId: shop.shopId, bookingId: booking.id, barberId: shop.alex, event: "cancelled" as const, details: { by: "client" } };

    await alerts().send(alert); // Alex has no login: the Owner gets it
    expect(f.emails.at(-1)!.to).toEqual([await emailOf(owner)]);

    const alexLogin = await makeUser(shop.shopId, "barber", shop.alex);
    await alerts().send(alert);
    expect(f.emails.at(-1)!.to).toEqual([await emailOf(alexLogin)]);
    expect(f.emails.at(-1)!.subject).toMatch(/cancel/i);

    await linkTelegram(shop.alex, 777);
    f.setTelegramDown(true);
    await alerts().send(alert);
    expect(f.emails).toHaveLength(3);
  });
});

describe("linking Telegram", () => {
  it("each link works once and expires after a day", async () => {
    const { url } = await alerts().createTelegramLink({ userId: owner, shopId: shop.shopId, barberId: shop.alex });
    expect(url).toMatch(/^https:\/\/t\.me\/barbermaster_bot\?start=[A-Za-z0-9_-]+$/);
    const token = new URL(url).searchParams.get("start")!;
    const start = (chatId: number, a = alerts()) => a.handleTelegramUpdate({ message: { chat: { id: chatId }, text: `/start ${token}` } });

    expect(await start(1)).toBe("linked");
    expect(f.chats.at(-1)!.text).toMatch(/Alex/);
    expect(await start(2)).toBe("invalid"); // used already
    expect(f.chats.at(-1)!.chatId).toBe(2);

    const late = (await alerts().createTelegramLink({ userId: owner, shopId: shop.shopId, barberId: shop.blake })).url;
    const lateToken = new URL(late).searchParams.get("start")!;
    const tomorrow = alerts(new Date(NOW.getTime() + DAY + 60_000));
    expect(await tomorrow.handleTelegramUpdate({ message: { chat: { id: 3 }, text: `/start ${lateToken}` } })).toBe("invalid");
  });

  it("a Barber links only themselves, and can unlink", async () => {
    const alexLogin = await makeUser(shop.shopId, "barber", shop.alex);
    await expect(alerts().createTelegramLink({ userId: alexLogin, shopId: shop.shopId, barberId: shop.blake })).rejects.toThrow(/not allowed/);
    await linkTelegram(shop.alex, 99, alexLogin);
    await alerts().unlinkTelegram({ userId: alexLogin, shopId: shop.shopId, barberId: shop.alex });

    const { booking } = await book(shop);
    f.chats.length = 0;
    await alerts().send({ shopId: shop.shopId, bookingId: booking.id, barberId: shop.alex, event: "created", details: {} });
    expect(f.chats).toHaveLength(0);
    expect(f.emails).toHaveLength(1);
  });
});

describe("the Owner's daily email", () => {
  it("sends yesterday's numbers once, however often the job runs", async () => {
    await sql`update public.shops set manual_booking_minutes = 5 where id = ${shop.shopId}`;
    const yesterday = "2027-01-10";
    const earlier = new Date(NOW.getTime() - 3 * DAY);
    await book(shop, { startsAt: at(yesterday, 10), now: earlier });
    await book(shop, { startsAt: at(yesterday, 11), now: earlier });
    const { booking: missed } = await book(shop, { startsAt: at(yesterday, 12), now: earlier });
    await sql`update public.bookings set status = 'no_show' where id = ${missed.id}`;

    const first = await alerts().sendDailySummaries({ shopIds: [shop.shopId] });
    expect(first).toEqual({ sent: 1, failed: 0 });
    expect(f.emails).toHaveLength(1);
    expect(f.emails[0].to).toEqual([await emailOf(owner)]);
    expect(f.emails[0].text).toContain("3 online bookings");
    expect(f.emails[0].text).toContain("1 no-show");
    expect(f.emails[0].text).toContain("15 minutes saved");

    expect(await alerts().sendDailySummaries({ shopIds: [shop.shopId] })).toEqual({ sent: 0, failed: 0 });
    expect(f.emails).toHaveLength(1);
  });
});

describe("the daily job", () => {
  it("waits until 7:00 shop time, and one Shop's failure doesn't stop the others", async () => {
    const other = await makeShop();
    const otherOwner = await makeUser(other.shopId, "owner");
    try {
      const sixAm = new Date("2027-01-11T11:00:00Z"); // 06:00 New York
      expect(await alerts(sixAm).sendDailySummaries({ shopIds: [shop.shopId, other.shopId] })).toEqual({ sent: 0, failed: 0 });

      const failFor = await emailOf(owner);
      const flaky: EmailProvider = {
        async send(m) {
          if (m.to.includes(failFor)) throw new Error("email down");
          f.emails.push(m);
        },
      };
      const a = createAlerts({ sql, chat: f.chat, email: flaky, config: { siteUrl: SITE, botUsername: "b" }, clock: () => NOW });
      expect(await a.sendDailySummaries({ shopIds: [shop.shopId, other.shopId] })).toEqual({ sent: 1, failed: 1 });
      expect(f.emails.map((e) => e.to)).toEqual([[await emailOf(otherOwner)]]);

      // The failed Shop is tried again on the next run.
      expect(await alerts().sendDailySummaries({ shopIds: [shop.shopId, other.shopId] })).toEqual({ sent: 1, failed: 0 });
    } finally {
      await dropShop(other);
    }
  });
});
