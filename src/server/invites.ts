import "server-only";
import { requireOwner, requirePlatformAdmin } from "./booking-engine/access";
import { getSql } from "./db";
import { platformAdmin, shopAdmin } from "./engine";
import { ensureLogin, signInUrl } from "./logins";
import { checkNewShop, type NewShop } from "./platform-admin";

/**
 * Give a Barber a login and connect it to the Barber.
 * A "you've been added" email is sent once Resend is connected (B4).
 */
export async function inviteBarber(args: { userId: string; shopId: string; barberId: string; email: string }) {
  await requireOwner(getSql(), args.userId, args.shopId); // before creating any account
  const login = await ensureLogin(args.email);
  await shopAdmin().linkBarberLogin({ userId: args.userId, shopId: args.shopId, barberId: args.barberId, loginUserId: login.id });
  return { email: login.email, signInUrl: signInUrl() };
}

/** Install visit: create the Owner's login (by email) and the whole Shop in one go. */
export async function onboardShop(args: Omit<NewShop, "ownerUserId"> & { ownerEmail: string }) {
  await requirePlatformAdmin(getSql(), args.userId); // before creating any account
  const { ownerEmail, ...shop } = args;
  checkNewShop(shop); // reject a bad form before creating a login
  const login = await ensureLogin(ownerEmail);
  const created = await platformAdmin().createShop({ ...shop, ownerUserId: login.id });
  return { ...created, ownerEmail: login.email, signInUrl: signInUrl() };
}
