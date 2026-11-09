import { randomBytes } from "node:crypto";
import type { Sql } from "postgres";
import { authorizeForBarber } from "@/server/booking-engine/access";
import { notFound } from "@/server/booking-engine/errors";
import { hashToken as hash } from "@/server/booking-engine";
import { addDays, toLocal, type LocalDate } from "@/server/booking-engine/time";
import type { BarberAlert, RefundFailure } from "@/server/dispatch";
import { formatMoney } from "@/lib/i18n/dictionaries";
import { createReporting } from "@/server/reporting";

/**
 * Barber and Owner alerts (B4). A Booking alert goes to the Barber's Telegram;
 * if they haven't linked it, or Telegram fails, it goes by email (to the Barber's
 * login, or to the Owner when the Barber has none). Also: linking Telegram with a
 * single-use link, and the Owner's daily summary email.
 */

export type ChatProvider = { send(m: { chatId: number; text: string }): Promise<void> };
export type EmailProvider = { send(m: { to: string[]; subject: string; text: string }): Promise<void> };

export type AlertsConfig = {
  siteUrl: string;
  /** The bot's @username without the @, for t.me links. */
  botUsername: string;
};

/** The part of a Telegram update we read. */
export type TelegramUpdate = { message?: { chat?: { id?: number }; text?: string } };

const LINK_VALID_MS = 24 * 60 * 60_000;
/** The Owner's daily email goes out from this local hour on. */
const DAILY_EMAIL_HOUR = 7;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function shortWhen(d: Date, timezone: string) {
  return d
    .toLocaleString("en-US", { timeZone: timezone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    .replace(/[\u00a0\u202f]/g, " ");
}

export function createAlerts({ sql, chat, email, config, clock = () => new Date() }: {
  sql: Sql;
  chat: ChatProvider;
  email: EmailProvider;
  config: AlertsConfig;
  clock?: () => Date;
}) {
  const reporting = createReporting(sql);

  /** Login emails of a Shop's Owners. */
  async function ownerEmails(shopId: string): Promise<string[]> {
    const rows = await sql<{ email: string }[]>`
      select u.email from public.shop_members m join auth.users u on u.id = m.user_id
      where m.shop_id = ${shopId} and m.role = 'owner' and u.email is not null
      order by u.email
    `;
    return rows.map((r) => r.email);
  }

  async function send(a: BarberAlert): Promise<void> {
    const [b] = await sql<
      {
        starts_at: Date;
        timezone: string;
        service: string;
        client: string | null;
        barber_name: string;
        chat_id: string | null;
        barber_email: string | null;
      }[]
    >`
      select k.starts_at, s.timezone, sv.name_en as service, c.name as client, br.display_name as barber_name,
             t.chat_id::text, u.email as barber_email
      from public.bookings k
      join public.shops s on s.id = k.shop_id
      join public.services sv on sv.id = k.service_id
      join public.barbers br on br.id = ${a.barberId} and br.shop_id = k.shop_id
      left join public.clients c on c.id = k.client_id
      left join public.barber_telegram t on t.barber_id = br.id
      left join auth.users u on u.id = br.user_id
      where k.id = ${a.bookingId} and k.shop_id = ${a.shopId}
    `;
    if (!b) throw new Error(`booking ${a.bookingId} not found for alert`);

    const who = b.client ?? "Walk-in";
    const when = shortWhen(b.starts_at, b.timezone);
    const link = `${config.siteUrl}/app/day?date=${toLocal(b.starts_at, b.timezone).date}&barber=${a.barberId}`;
    const from = typeof a.details.from === "string" ? shortWhen(new Date(a.details.from), b.timezone) : null;
    const byShop = a.details.by && a.details.by !== "client";
    const headline = {
      created: `New booking: ${who}, ${b.service}, ${when}`,
      cancelled: `Cancelled${byShop ? " by the shop" : ""}: ${who}, ${b.service}, ${when}`,
      rescheduled: `Moved: ${who}, ${b.service}, ${from ? `${from} -> ` : ""}${when}`,
      paid: `Paid online: ${who}, ${b.service}, ${when}`,
    }[a.event];
    const text = `${headline}\n${link}`;

    if (b.chat_id) {
      try {
        await chat.send({ chatId: Number(b.chat_id), text });
        return;
      } catch (e) {
        console.warn("[alerts] Telegram failed, falling back to email", { barberId: a.barberId, error: String(e) });
      }
    }
    const to = b.barber_email ? [b.barber_email] : await ownerEmails(a.shopId);
    if (to.length === 0) throw new Error(`no Telegram or email to alert barber ${a.barberId}`);
    const subject = `Barber Master: ${headline}` + (b.barber_email ? "" : ` (for ${b.barber_name})`);
    await email.send({ to, subject, text });
  }

  async function requireBarberInShop(shopId: string, barberId: string) {
    const [row] = await sql`select 1 from public.barbers where id = ${barberId} and shop_id = ${shopId}`;
    if (!row) throw notFound("Barber");
  }

  /** A one-time t.me link (show it as a link and a QR code). Valid for a day; a new one replaces the old. */
  async function createTelegramLink(args: { userId: string; shopId: string; barberId: string }): Promise<{ url: string; expiresAt: Date }> {
    await authorizeForBarber(sql, args.userId, args.shopId, args.barberId);
    await requireBarberInShop(args.shopId, args.barberId);
    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(clock().getTime() + LINK_VALID_MS);
    await sql`
      insert into public.barber_telegram (barber_id, shop_id, link_token_hash, link_expires_at)
      values (${args.barberId}, ${args.shopId}, ${hash(token)}, ${expiresAt})
      on conflict (barber_id) do update set link_token_hash = excluded.link_token_hash, link_expires_at = excluded.link_expires_at
    `;
    return { url: `https://t.me/${config.botUsername}?start=${token}`, expiresAt };
  }

  async function unlinkTelegram(args: { userId: string; shopId: string; barberId: string }): Promise<void> {
    await authorizeForBarber(sql, args.userId, args.shopId, args.barberId);
    await sql`update public.barber_telegram set chat_id = null, linked_at = null where barber_id = ${args.barberId} and shop_id = ${args.shopId}`;
  }

  /** A message to the bot (webhook). "/start <token>" from a link connects that chat to the Barber. */
  async function handleTelegramUpdate(update: TelegramUpdate): Promise<"linked" | "invalid" | "ignored"> {
    const chatId = update.message?.chat?.id;
    const match = update.message?.text?.trim().match(/^\/start\s+([A-Za-z0-9_-]{16,64})$/);
    if (typeof chatId !== "number" || !match) return "ignored";

    const now = clock();
    const [linked] = await sql<{ barber_name: string; shop_name: string }[]>`
      with done as (
        update public.barber_telegram
        set chat_id = ${chatId}, linked_at = ${now}, link_token_hash = null, link_expires_at = null
        where link_token_hash = ${hash(match[1])} and link_expires_at > ${now}
        returning barber_id, shop_id
      )
      select br.display_name as barber_name, s.name as shop_name
      from done join public.barbers br on br.id = done.barber_id join public.shops s on s.id = done.shop_id
    `;
    if (!linked) {
      await chat.send({ chatId, text: "This link has expired or was already used. Open Barber Master and get a new one." });
      return "invalid";
    }
    await chat.send({ chatId, text: `Connected! Booking alerts for ${linked.barber_name} at ${linked.shop_name} will arrive here.` });
    return "linked";
  }

  /**
   * Scheduled job (no user): email each active Shop's Owners yesterday's numbers,
   * from 7:00 Shop time on. Each Shop is claimed per day first, so running the job
   * twice (or hourly) sends once. A Shop whose email fails is tried on the next run
   * and doesn't stop the others.
   */
  async function sendDailySummaries(args: { shopIds?: string[] } = {}): Promise<{ sent: number; failed: number }> {
    const now = clock();
    const shops = await sql<{ id: string; name: string; timezone: string }[]>`
      select id, name, timezone from public.shops
      where status = 'active' ${args.shopIds ? sql`and id in ${sql(args.shopIds)}` : sql``}
    `;
    let sent = 0;
    let failed = 0;
    for (const shop of shops) {
      const local = toLocal(now, shop.timezone);
      if (local.minutes < DAILY_EMAIL_HOUR * 60) continue;
      const yesterday: LocalDate = addDays(local.date, -1);
      const [claimed] = await sql<{ previous: string | null }[]>`
        update public.shops s set daily_email_last_date = ${yesterday}
        from (select id, daily_email_last_date::text as previous from public.shops where id = ${shop.id} for update) old
        where s.id = old.id and (old.previous is null or old.previous::date < ${yesterday}::date)
        returning old.previous
      `;
      if (!claimed) continue;
      try {
        const to = await ownerEmails(shop.id);
        if (to.length === 0) continue;
        const st = await reporting.dayStatsForScheduledJob({ shopId: shop.id, date: yesterday });
        const text = [
          `Yesterday at ${shop.name} (${yesterday}):`,
          `- ${plural(st.bookings, "online booking", "online bookings")}`,
          `- ${plural(st.walkIns, "walk-in", "walk-ins")}`,
          `- ${plural(st.noShows, "no-show", "no-shows")}`,
          `- ${plural(st.timeSavedMin, "minute", "minutes")} saved on the phone`,
          "",
          `Your day: ${config.siteUrl}/app/day`,
        ].join("\n");
        await email.send({ to, subject: `${shop.name}: yesterday in Barber Master`, text });
        sent++;
      } catch (e) {
        // Give the day back so the next run tries again.
        await sql`update public.shops set daily_email_last_date = ${claimed.previous} where id = ${shop.id}`;
        console.error("[alerts] daily email failed", { shopId: shop.id, error: String(e) });
        failed++;
      }
    }
    return { sent, failed };
  }

  /** An automatic refund gave up: the Owners get an email saying what to refund by hand. */
  async function refundFailed(f: RefundFailure): Promise<void> {
    const to = await ownerEmails(f.shopId);
    if (to.length === 0) throw new Error(`no owner email to report a failed refund for shop ${f.shopId}`);
    const [b] = await sql<{ starts_at: Date; timezone: string; service: string; client: string | null; phone: string | null }[]>`
      select k.starts_at, s.timezone, sv.name_en as service, c.name as client, c.phone_e164 as phone
      from public.bookings k
      join public.shops s on s.id = k.shop_id
      join public.services sv on sv.id = k.service_id
      left join public.clients c on c.id = k.client_id
      where k.id = ${f.bookingId} and k.shop_id = ${f.shopId}
    `;
    const amount = formatMoney(f.amountCents);
    const what = b ? `${b.client ?? "Walk-in"}${b.phone ? ` (${b.phone})` : ""}, ${b.service}, ${shortWhen(b.starts_at, b.timezone)}` : "a deleted booking";
    await email.send({
      to,
      subject: `Barber Master: a ${amount} refund needs you`,
      text: [
        `We could not refund ${amount} automatically for ${what}.`,
        "Please refund it by hand in your payment account so the client gets their money back.",
        "",
        `Reason from the payment provider: ${f.error}`,
      ].join("\n"),
    });
  }

  return { send, createTelegramLink, unlinkTelegram, handleTelegramUpdate, sendDailySummaries, refundFailed };
}

export type Alerts = ReturnType<typeof createAlerts>;
