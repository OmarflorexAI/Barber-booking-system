import "server-only";
import { requirePlatformAdmin } from "./booking-engine/access";
import { getSql } from "./db";
import { platformAdmin } from "./engine";
import { ensureLogin, signInUrl } from "./logins";
import { checkNewShop, type NewShop } from "./platform-admin";

/** Install visit: create the Owner's login (by email) and the whole Shop in one go. */
export async function onboardShop(args: Omit<NewShop, "ownerUserId"> & { ownerEmail: string }) {
  await requirePlatformAdmin(getSql(), args.userId); // before creating any account
  const { ownerEmail, ...shop } = args;
  checkNewShop(shop); // reject a bad form before creating a login
  const login = await ensureLogin(ownerEmail);
  const created = await platformAdmin().createShop({ ...shop, ownerUserId: login.id });
  return { ...created, ownerEmail: login.email, signInUrl: signInUrl() };
}
