import type { Sql } from "postgres";
import type { Locale } from "@/lib/i18n/dictionaries";
import { normalizePhone } from "@/lib/phone";
import { manageTokenFor } from "@/server/booking-engine/manage-token";
import { addDays, localDayRange, toLocal } from "@/server/booking-engine/time";
import { RetryLater, type SmsMessage } from "@/server/dispatch";
import { renderText, smsSegments } from "./templates";

/**
 * Client texts (B3). Turns an outbox text into words (in the Client's language,
 * with their manage link), keeps each Shop under its daily carrier limit, sends it
 * through the SMS provider and logs it. Also records STOP/START replies.
 */

export type SmsProvider = {
  send(m: { from: string; to: string; body: string }): Promise<{ id: string }>;
};

export type TextingConfig = {
  /** Public site address used in links, e.g. https://barbermaster.app */
  siteUrl: string;
  /** The secret the booking engine signs manage links with (rebuilds the link for each text). */
  manageLinkSecret: string;
  /** The platform number used when a Shop has no number of its own. */
  defaultFrom: string;
  /** Segments per Shop per local day; above it texts wait (retry) instead of being dropped by carriers. */
  dailySegmentCap: number;
};

/** The Shop used its texts for today: the text waits for the Shop's next local day. */
export class TextLimitReached extends RetryLater {
  constructor(
    readonly shopId: string,
    retryAt: Date,
  ) {
    super("This shop reached its daily text limit; the text waits until tomorrow.", retryAt);
    this.name = "TextLimitReached";
  }
}

const OPT_OUT = new Set(["STOP", "STOPALL", "STOP ALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "OPTOUT", "REVOKE"]);
const OPT_IN = new Set(["START", "YES", "UNSTOP"]);
const HELP = new Set(["HELP", "INFO"]);

export function createTexting({ sql, provider, config, clock = () => new Date() }: {
  sql: Sql;
  provider: SmsProvider;
  config: TextingConfig;
  clock?: () => Date;
}) {
  async function send(m: SmsMessage): Promise<void> {
    const [b] = await sql<
      {
        locale: Locale;
        starts_at: Date;
        shop_name: string;
        shop_phone: string | null;
        slug: string;
        timezone: string;
        sms_from_number: string | null;
        barber_name: string;
        name_en: string;
        name_es: string;
      }[]
    >`
      select b.locale, b.starts_at, s.name as shop_name, s.phone as shop_phone, s.slug, s.timezone, s.sms_from_number,
             br.display_name as barber_name, sv.name_en, sv.name_es
      from public.bookings b
      join public.shops s on s.id = b.shop_id
      join public.barbers br on br.id = b.barber_id
      join public.services sv on sv.id = b.service_id
      where b.id = ${m.bookingId} and b.shop_id = ${m.shopId}
    `;
    if (!b) throw new Error(`booking ${m.bookingId} not found for text`);

    const body = renderText(m.template, {
      locale: b.locale,
      shopName: b.shop_name,
      shopPhone: b.shop_phone,
      serviceName: b.locale === "es" ? b.name_es : b.name_en,
      barberName: b.barber_name,
      startsAt: b.starts_at,
      timezone: b.timezone,
      manageUrl: `${config.siteUrl}/m/${manageTokenFor(m.bookingId, config.manageLinkSecret)}`,
      rebookUrl: `${config.siteUrl}/b/${b.slug}`,
    });
    const segments = smsSegments(body);

    const now = clock();
    const today = toLocal(now, b.timezone).date;
    const { start } = localDayRange(today, b.timezone);
    const [{ used }] = await sql<{ used: number }[]>`
      select coalesce(sum(segments), 0)::int as used from public.sms_log
      where shop_id = ${m.shopId} and sent_at >= ${start}
    `;
    if (used + segments > config.dailySegmentCap) {
      throw new TextLimitReached(m.shopId, localDayRange(addDays(today, 1), b.timezone).start);
    }
    const warnAt = Math.floor(config.dailySegmentCap * 0.8);
    if (used < warnAt && used + segments >= warnAt) {
      console.warn("[texting] shop reached 80% of its daily text limit", { shopId: m.shopId, used: used + segments, cap: config.dailySegmentCap });
    }

    const sent = await provider.send({ from: b.sms_from_number ?? config.defaultFrom, to: m.to, body });
    await sql`
      insert into public.sms_log (shop_id, booking_id, template, segments, provider_message_id, sent_at)
      values (${m.shopId}, ${m.bookingId}, ${m.template}, ${segments}, ${sent.id}, ${now})
    `;
  }

  /**
   * A reply from a Client (inbound webhook). STOP-type words opt the number out of
   * every Shop that texts from `to`; START-type words opt it back in. Twilio's
   * Advanced Opt-Out sends the required STOP/START/HELP replies itself (keep it on
   * for the number), so this only records the choice.
   */
  async function handleReply(args: { from: string; to: string; body: string }): Promise<"opted_out" | "opted_in" | "help" | "ignored"> {
    const word = args.body.trim().toUpperCase().replace(/[.!]+$/, "");
    const action = OPT_OUT.has(word) ? "opted_out" : OPT_IN.has(word) ? "opted_in" : HELP.has(word) ? "help" : "ignored";
    if (action !== "opted_out" && action !== "opted_in") return action;

    const phone = normalizePhone(args.from);
    if (!phone) return "ignored";
    await sql`
      update public.clients c set sms_opt_out = ${action === "opted_out"}
      from public.shops s
      where c.shop_id = s.id and c.phone_e164 = ${phone}
        and coalesce(s.sms_from_number, ${config.defaultFrom}) = ${args.to}
    `;
    return action;
  }

  return { send, handleReply };
}

export type Texting = ReturnType<typeof createTexting>;
