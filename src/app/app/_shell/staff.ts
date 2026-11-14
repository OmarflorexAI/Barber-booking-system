import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import { cache } from "react";
import { getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

/** The roles a `shop_members` row can hold. Only Owners use /app (PLAN.md Q11: Barbers never sign in). */
type MemberRole = "owner" | "barber";

/** Who is signed in to /app, read through row-level security as that person. */
export type Staff = {
  userId: string;
  email: string | null;
  /** The Shop they own. Null for anyone who isn't an Owner (a legacy Barber login included). */
  membership: { shopId: string; shopName: string; timezone: string; role: "owner" } | null;
  /**
   * A login left over from when Barbers could sign in: on a Shop's staff as a Barber, not as
   * its Owner. The shell shows them "Ask your Shop's Owner" instead of any screen.
   */
  retiredBarber: boolean;
  /** The Owner's own active Barber row, when the Owner also cuts hair. */
  barber: { id: string; displayName: string } | null;
  isPlatformAdmin: boolean;
};

/** Loads the signed-in person's Shop, Barber row and Platform admin flag. Null when nobody is signed in. */
export async function loadStaff(supabase: SupabaseClient): Promise<Staff | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const [{ data: member }, { data: admin }] = await Promise.all([
    supabase
      .from("shop_members")
      .select("shop_id, role, shops(name, timezone)")
      .eq("user_id", user.id)
      .order("role", { ascending: false }) // "owner" before "barber"
      .limit(1)
      .maybeSingle<{ shop_id: string; role: MemberRole; shops: { name: string; timezone: string } }>(),
    supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  const owner = member?.role === "owner" ? member : null;

  let barber: Staff["barber"] = null;
  if (owner) {
    const { data } = await supabase
      .from("barbers")
      .select("id, display_name")
      .eq("shop_id", owner.shop_id)
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle<{ id: string; display_name: string }>();
    if (data) barber = { id: data.id, displayName: data.display_name };
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    membership: owner
      ? { shopId: owner.shop_id, shopName: owner.shops.name, timezone: owner.shops.timezone, role: "owner" }
      : null,
    retiredBarber: member?.role === "barber",
    barber,
    isPlatformAdmin: Boolean(admin),
  };
}

/**
 * The signed-in staff member for this request, shared by the /app layout and its pages
 * (React `cache` runs it once per request). Request-time data, so call it inside <Suspense>.
 */
export const getStaff = cache(async () => {
  // Request time only: supabase-js reads the clock (Date.now) to check the session, which
  // isn't allowed while Next prerenders the cookie-aware prefetch shell.
  await connection();
  return loadStaff(await createClient());
});

/** The shell's data in one call: the person plus their language. */
export const getShellContext = cache(async () => {
  const [staff, dict] = await Promise.all([getStaff(), getDictionary()]);
  return { staff, ...dict };
});

/**
 * Where a person lands after signing in (DESIGN.md → "Navigation per role"):
 * Owner → Today (/app/day), an Owner who is also a Platform admin → /app/day.
 * A Platform admin with no Shop belongs on /admin, which isn't built yet (mission U4), so
 * they land on /app/day for now, where the shell shows them the link to /admin.
 */
export function landingPath(staff: Staff | null): string {
  if (staff && !staff.membership && staff.isPlatformAdmin) return "/app/day"; // U4: "/admin"
  return "/app/day";
}

/**
 * Whether /admin exists yet (mission U4). Until it does, every link to it stays hidden: the
 * sidebar row, the Settings row and the no-Shop screen's button. Flip to true with U4.
 */
export const ADMIN_PANEL_READY = false;

/** The tabs (phone) and sidebar items (desktop): the Owner's three, in order. */
export type NavKey = "today" | "dashboard" | "settings";
export const NAV: readonly { key: NavKey; href: string }[] = [
  { key: "today", href: "/app/day" },
  { key: "dashboard", href: "/app/dashboard" },
  { key: "settings", href: "/app/settings" },
];
