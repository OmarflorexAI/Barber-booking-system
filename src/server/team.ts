import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSql } from "./db";
import { media, shopAdmin } from "./engine";
import { MEDIA_BUCKET } from "./media";

/**
 * Remove a Barber from the Shop for good (M3, Q8/Q9/Q16/Q17). The database part
 * (profile, prices, hours, past Bookings) is one transaction in shopAdmin().deleteBarber;
 * what lives outside it is cleaned up here, best effort: the Barber's pictures in our
 * bucket, and a tied login that is no longer staff anywhere and isn't a Platform admin.
 */
export async function removeTeamMember(args: { userId: string; shopId: string; barberId: string; now: Date }): Promise<void> {
  const { photoUrls, loginUserId } = await shopAdmin().deleteBarber(args);

  const ours = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  for (const url of photoUrls) {
    if (!url.includes(ours)) continue; // an outside link: nothing of ours to delete
    try {
      await media().deleteMedia({ userId: args.userId, shopId: args.shopId, path: url });
    } catch (e) {
      console.warn("[team] could not delete a removed Barber's picture:", e instanceof Error ? e.message : e);
    }
  }

  if (loginUserId) {
    try {
      const sql = getSql();
      const [{ staff, admin }] = await sql<{ staff: boolean; admin: boolean }[]>`
        select exists (select 1 from public.shop_members where user_id = ${loginUserId}) staff,
               exists (select 1 from public.platform_admins where user_id = ${loginUserId}) admin
      `;
      if (!staff && !admin) {
        const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { error } = await client.auth.admin.deleteUser(loginUserId);
        if (error) console.warn("[team] could not delete a removed Barber's login:", error.message);
      }
    } catch (e) {
      console.warn("[team] could not delete a removed Barber's login:", e instanceof Error ? e.message : e);
    }
  }
}
