import type { Sql } from "postgres";
import type { Locale } from "@/lib/i18n/dictionaries";
import type { EmailProvider } from "@/server/alerts";
import { manageTokenFor } from "@/server/booking-engine/manage-token";
import type { ClientEmailMessage } from "@/server/dispatch";
import { renderClientEmail } from "./templates";

/**
 * Client emails: turns an outbox email row into words (in the language the Client
 * booked in, with their manage link) and sends it through the email provider. The
 * sending worker has already decided the recipient (and whether to send at all).
 */

export type ClientEmailConfig = {
  /** Public site address used in links, e.g. https://barbermaster.app */
  siteUrl: string;
  /** The secret the booking engine signs manage links with. */
  manageLinkSecret: string;
};

export function createClientEmail({ sql, email, config }: { sql: Sql; email: EmailProvider; config: ClientEmailConfig }) {
  async function send(m: ClientEmailMessage): Promise<void> {
    const [b] = await sql<
      {
        locale: Locale;
        starts_at: Date;
        shop_name: string;
        shop_phone: string | null;
        slug: string;
        timezone: string;
        barber_name: string;
        name_en: string;
        name_es: string;
      }[]
    >`
      select b.locale, b.starts_at, s.name as shop_name, s.phone as shop_phone, s.slug, s.timezone,
             br.display_name as barber_name, sv.name_en, sv.name_es
      from public.bookings b
      join public.shops s on s.id = b.shop_id
      join public.barbers br on br.id = b.barber_id
      join public.services sv on sv.id = b.service_id
      where b.id = ${m.bookingId} and b.shop_id = ${m.shopId}
    `;
    if (!b) throw new Error(`booking ${m.bookingId} not found for email`);

    const previous = m.from ? new Date(m.from) : null;
    const rendered = renderClientEmail({
      locale: b.locale,
      kind: m.kind,
      shopName: b.shop_name,
      shopPhone: b.shop_phone,
      serviceName: b.locale === "es" ? b.name_es : b.name_en,
      barberName: b.barber_name,
      startsAt: b.starts_at,
      previousStartsAt: previous && !Number.isNaN(previous.getTime()) ? previous : null,
      by: m.by ?? null,
      timezone: b.timezone,
      manageUrl: `${config.siteUrl}/m/${manageTokenFor(m.bookingId, config.manageLinkSecret)}`,
      rebookUrl: `${config.siteUrl}/b/${b.slug}`,
    });
    await email.send({ to: [m.to], ...rendered });
  }

  return { send };
}

export type ClientEmail = ReturnType<typeof createClientEmail>;
