import type { Sql } from "postgres";
import type { EmailProvider } from "@/server/alerts";
import { formatPhone, normalizePhone } from "@/lib/phone";

/**
 * Shop Owners who ask about Barber Master on the landing page. A lead is saved
 * first and emailed to the Platform admins after, so a failed email never loses it:
 * the daily job sends whatever is still waiting.
 */

export type LeadInput = {
  shopName: string;
  ownerName: string;
  phone: string;
  neighborhood?: string;
  barberCount?: number;
  message?: string;
  locale: "en" | "es";
};

export type LeadResult = { ok: true } | { ok: false; code: "INVALID_INPUT" | "INVALID_PHONE" };

/** The same phone within this window is treated as a repeat (double taps, impatience, spam). */
const REPEAT_WINDOW_MS = 24 * 60 * 60_000;

type LeadRow = {
  id: string;
  shop_name: string;
  owner_name: string;
  phone_e164: string;
  neighborhood: string | null;
  barber_count: number | null;
  message: string | null;
  locale: string;
  created_at: Date;
};

const clean = (s: string | undefined, max: number) => {
  const t = (s ?? "").trim().replace(/\s+/g, " ");
  return t.length > max ? null : t;
};

export function createLeads({ sql, email, clock = () => new Date() }: {
  sql: Sql;
  email: EmailProvider;
  clock?: () => Date;
}) {
  async function adminEmails(): Promise<string[]> {
    const rows = await sql<{ email: string }[]>`
      select u.email from public.platform_admins a join auth.users u on u.id = a.user_id
      where u.email is not null order by u.email
    `;
    return rows.map((r) => r.email);
  }

  function describe(l: LeadRow): { subject: string; text: string } {
    const lines = [
      `Shop: ${l.shop_name}`,
      `Owner: ${l.owner_name}`,
      `Phone: ${formatPhone(l.phone_e164)}`,
      l.neighborhood && `Neighborhood: ${l.neighborhood}`,
      l.barber_count && `Barbers: ${l.barber_count}`,
      `Language: ${l.locale === "es" ? "Spanish" : "English"}`,
      l.message && `\nMessage:\n${l.message}`,
      `\nSent ${l.created_at.toISOString()}`,
    ];
    return { subject: `New lead: ${l.shop_name}`, text: lines.filter(Boolean).join("\n") };
  }

  /** Email the given waiting leads; returns how many were sent. Stops at the first failure. */
  async function notify(rows: LeadRow[]): Promise<number> {
    if (!rows.length) return 0;
    const to = await adminEmails();
    if (!to.length) return 0; // nobody to tell yet: they stay waiting
    let sent = 0;
    for (const l of rows) {
      try {
        await email.send({ to, ...describe(l) });
      } catch (e) {
        console.warn("[leads] email failed, will retry", String(e));
        return sent;
      }
      await sql`update public.leads set notified_at = ${clock()} where id = ${l.id}`;
      sent += 1;
    }
    return sent;
  }

  return {
    async submit(input: LeadInput): Promise<LeadResult> {
      const shopName = clean(input.shopName, 80);
      const ownerName = clean(input.ownerName, 80);
      const neighborhood = clean(input.neighborhood, 80);
      const message = (input.message ?? "").trim();
      const barberCount = input.barberCount;
      if (!shopName || !ownerName || neighborhood === null || message.length > 1000) return { ok: false, code: "INVALID_INPUT" };
      if (barberCount !== undefined && !(Number.isInteger(barberCount) && barberCount >= 1 && barberCount <= 50)) {
        return { ok: false, code: "INVALID_INPUT" };
      }
      const phone = normalizePhone(input.phone);
      if (!phone) return { ok: false, code: "INVALID_PHONE" };

      const now = clock();
      const since = new Date(now.getTime() - REPEAT_WINDOW_MS);
      const [repeat] = await sql`
        select 1 from public.leads where phone_e164 = ${phone} and created_at > ${since} and created_at <= ${now} limit 1
      `;
      if (repeat) return { ok: true };

      const rows = await sql<LeadRow[]>`
        insert into public.leads (shop_name, owner_name, phone_e164, neighborhood, barber_count, message, locale, created_at)
        values (${shopName}, ${ownerName}, ${phone}, ${neighborhood || null}, ${barberCount ?? null}, ${message || null},
                ${input.locale === "es" ? "es" : "en"}, ${now})
        returning id, shop_name, owner_name, phone_e164, neighborhood, barber_count, message, locale, created_at
      `;
      await notify(rows);
      return { ok: true };
    },

    /** Email every lead still waiting (oldest first). Run by the daily job. */
    async notifyPending(): Promise<{ sent: number; waiting: number }> {
      const rows = await sql<LeadRow[]>`
        select id, shop_name, owner_name, phone_e164, neighborhood, barber_count, message, locale, created_at
        from public.leads where notified_at is null order by created_at limit 50
      `;
      const sent = await notify(rows);
      return { sent, waiting: rows.length - sent };
    },
  };
}

export type Leads = ReturnType<typeof createLeads>;
