import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import { cache } from "react";
import { getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export type StaffRole = "owner" | "barber";

/** Who is signed in to /app, read through row-level security as that person. */
export type Staff = {
  userId: string;
  email: string | null;
  /** The Shop they work at (the Owner role wins if they somehow have two Shops). */
  membership: { shopId: string; shopName: string; timezone: string; role: StaffRole } | null;
  /** Their own active Barber row in that Shop: set for every Barber and for an Owner who cuts hair. */
  barber: { id: string; displayName: string } | null;
  isPlatformAdmin: boolean;
};

/** Loads the signed-in person's Shop, role, Barber row and Platform admin flag. Null when nobody is signed in. */
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
      .maybeSingle<{ shop_id: string; role: StaffRole; shops: { name: string; timezone: string } }>(),
    supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);

  let barber: Staff["barber"] = null;
  if (member) {
    const { data } = await supabase
      .from("barbers")
      .select("id, display_name")
      .eq("shop_id", member.shop_id)
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle<{ id: string; display_name: string }>();
    if (data) barber = { id: data.id, displayName: data.display_name };
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    membership: member
      ? { shopId: member.shop_id, shopName: member.shops.name, timezone: member.shops.timezone, role: member.role }
      : null,
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
 * Barber → Day, Owner → Today (both /app/day), staff who are also Platform admins → /app/day.
 * A Platform admin with no Shop belongs on /admin, which isn't built yet (mission U4), so
 * they land on /app/day for now, where the shell shows them the link to /admin.
 */
export function landingPath(staff: Staff | null): string {
  if (staff && !staff.membership && staff.isPlatformAdmin) return "/app/day"; // U4: "/admin"
  return "/app/day";
}

/** The tabs (phone) and sidebar items (desktop) for this person, in order. */
export type NavKey = "day" | "today" | "dashboard" | "settings" | "me";
export function navFor(staff: Staff): { key: NavKey; href: string }[] {
  if (staff.membership?.role === "owner") {
    const items: { key: NavKey; href: string }[] = [
      { key: "today", href: "/app/day" },
      { key: "dashboard", href: "/app/dashboard" },
      { key: "settings", href: "/app/settings" },
    ];
    if (staff.barber) items.push({ key: "me", href: "/app/me" });
    return items;
  }
  return [
    { key: "day", href: "/app/day" },
    { key: "me", href: "/app/me" },
  ];
}
