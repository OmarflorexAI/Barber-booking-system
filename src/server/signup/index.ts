import type { Sql, TransactionSql } from "postgres";
import { forbidden, invalid, PG_UNIQUE_VIOLATION, pgCode } from "@/server/booking-engine/errors";
import { checkNewShop, insertShop } from "@/server/platform-admin";
import type { DayHours } from "@/server/shop-admin";

/**
 * Self sign-up: a signed-in person with no Shop sets up their own, on the free month.
 *
 * No duplicates, ever:
 * - one login per email is Supabase's job (Google and email-link sign-ins for the same
 *   verified email become the same login);
 * - one Shop per login is ours. Every call takes a per-login advisory lock, then looks for an
 *   existing membership inside the same transaction. A double tap, a second tab or a retry
 *   waits for the first call and gets its Shop back (created: false) instead of a second Shop.
 * - Booking links stay unique: a taken link gets the next free number (kings-cuts-2).
 */

export type OwnShopInput = {
  /** The signed-in login (from Supabase auth, never from the form). */
  userId: string;
  shopName: string;
  /** The Owner's name, shown to Clients as the first Barber. */
  ownerName: string;
  phone: string;
  address?: string | null;
  haircutPriceCents: number;
};

export type OwnShop = { shopId: string; slug: string; created: boolean };

/** What a new Shop starts with. The Owner changes all of it in Settings. */
const START_SERVICE = { nameEn: "Haircut", nameEs: "Corte", durationMin: 30 };
/** Monday to Saturday, 9:00 to 19:00; Sunday closed. */
export const START_WEEK: DayHours[] = [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, start: "09:00", end: "19:00" }));
const MAX_PRICE_CENTS = 100_000;
const SLUG_TRIES = 5;

/** "Kings Cuts & Fades" -> "kings-cuts-fades"; "Peluquería Ñandú" -> "peluqueria-nandu". */
export function slugFromName(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 34)
    .replace(/-+$/g, "");
  if (base.length >= 3) return base;
  return base ? `${base}-shop` : "shop";
}

export function createSignup(sql: Sql) {
  /** The first free link for this base: the base itself, else base-2, base-3, ... */
  async function freeSlug(tx: TransactionSql, base: string): Promise<string> {
    const rows = await tx<{ slug: string }[]>`
      select slug from public.shops where slug = ${base} or slug ~ ${`^${base}-[0-9]+$`}
    `;
    const taken = new Set(rows.map((r) => r.slug));
    if (!taken.has(base)) return base;
    for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
  }

  async function createOwnShop(args: OwnShopInput): Promise<OwnShop> {
    const price = args.haircutPriceCents;
    if (!Number.isInteger(price) || price < 0 || price > MAX_PRICE_CENTS) throw invalid("Price must be between $0 and $1,000.");
    if (!args.phone?.trim()) throw invalid("The Shop's phone number is required.");
    const ownerName = args.ownerName.trim();
    if (!ownerName || ownerName.length > 60) throw invalid("Your name is required (max 60 characters).");

    const base = slugFromName(args.shopName);
    const shop = {
      slug: base,
      name: args.shopName,
      phone: args.phone,
      address: args.address ?? null,
      manualBookingMinutes: 0,
      ownerBarberName: ownerName,
      barbers: [],
      services: [{ ...START_SERVICE, priceCents: price }],
      weeklyHours: START_WEEK,
    };
    const checked = checkNewShop(shop); // a bad form fails before anything is locked or written

    return sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(hashtextextended(${`signup:${args.userId}`}, 0))`;

      const [member] = await tx<{ shop_id: string; role: string; slug: string }[]>`
        select m.shop_id, m.role, s.slug
        from public.shop_members m join public.shops s on s.id = m.shop_id
        where m.user_id = ${args.userId}
        order by (m.role = 'owner') desc, m.created_at
        limit 1
      `;
      if (member) {
        if (member.role !== "owner") throw forbidden(); // a Barber login: their Owner runs the Shop
        return { shopId: member.shop_id, slug: member.slug, created: false };
      }

      // Another sign-up can take the same link between our check and our insert; a savepoint
      // lets us try the next number without losing the transaction.
      for (let attempt = 0; ; attempt++) {
        const slug = await freeSlug(tx, base);
        try {
          const made = await tx.savepoint((sp) =>
            insertShop(sp, { ...checked, slug, ownerUserId: args.userId, manualBookingMinutes: 0, services: shop.services, weeklyHours: START_WEEK }),
          );
          return { ...made, created: true };
        } catch (e) {
          if (pgCode(e) !== PG_UNIQUE_VIOLATION || attempt >= SLUG_TRIES) throw e;
        }
      }
    });
  }

  return { createOwnShop };
}

export type Signup = ReturnType<typeof createSignup>;
