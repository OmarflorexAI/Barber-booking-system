import type { ISql } from "postgres";
import { forbidden, notFound } from "./errors";

/**
 * Who a signed-in user is inside one Shop. Shared by the booking engine and the
 * Owner tools, which run as the database owner (RLS off) and check access here.
 */
type Db = ISql;

export type StaffRole = { owner: boolean; barberId: string | null };

export async function staffRole(db: Db, userId: string, shopId: string): Promise<StaffRole | null> {
  const [row] = await db<{ role: string; barber_id: string | null }[]>`
    select m.role, b.id as barber_id
    from public.shop_members m
    left join public.barbers b on b.shop_id = m.shop_id and b.user_id = m.user_id
    where m.shop_id = ${shopId} and m.user_id = ${userId}
  `;
  return row ? { owner: row.role === "owner", barberId: row.barber_id } : null;
}

/**
 * Owners may act on any Barber in their Shop; a Barber only on themselves.
 * The Barber must belong to `shopId` (NOT_FOUND otherwise), so an Owner of one
 * Shop can never reach another Shop's Barber by passing its id.
 */
export async function authorizeForBarber(db: Db, userId: string, shopId: string, barberId: string): Promise<StaffRole> {
  const role = await staffRole(db, userId, shopId);
  if (!role || (!role.owner && role.barberId !== barberId)) throw forbidden();
  // A Barber's own id comes from this Shop's barbers already; an Owner's pick must be checked.
  if (role.barberId !== barberId) await requireBarberInShop(db, shopId, barberId);
  return role;
}

/** NOT_FOUND unless the Barber exists in this Shop. */
export async function requireBarberInShop(db: Db, shopId: string, barberId: string): Promise<void> {
  if (!UUID.test(barberId)) throw notFound("Barber");
  const [row] = await db`select 1 from public.barbers where id = ${barberId} and shop_id = ${shopId}`;
  if (!row) throw notFound("Barber");
}

/** NOT_FOUND unless the Service exists in this Shop. */
export async function requireServiceInShop(db: Db, shopId: string, serviceId: string): Promise<void> {
  if (!UUID.test(serviceId)) throw notFound("Service");
  const [row] = await db`select 1 from public.services where id = ${serviceId} and shop_id = ${shopId}`;
  if (!row) throw notFound("Service");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Owner-only actions (prices, Services, Barbers, Shop settings). */
export async function requireOwner(db: Db, userId: string, shopId: string): Promise<StaffRole> {
  const role = await staffRole(db, userId, shopId);
  if (!role?.owner) throw forbidden();
  return role;
}

/** Our own team (Platform admins): create Shops, import clients, give support. */
export async function requirePlatformAdmin(db: Db, userId: string): Promise<void> {
  const [row] = await db`select 1 from public.platform_admins where user_id = ${userId}`;
  if (!row) throw forbidden();
}
