import "server-only";
import { redirect } from "next/navigation";
import { getShellContext } from "../_shell/staff";

/**
 * The Settings pages' guard: nobody signed in → /login; a Barber → /app/day. Returns null
 * when the person has no Shop (the shell already shows the "not linked to a Shop" page).
 */
export async function ownerContext() {
  const ctx = await getShellContext();
  const { staff } = ctx;
  if (!staff) redirect("/login");
  if (!staff.membership) return null;
  if (staff.membership.role !== "owner") redirect("/app/day");
  return { ...ctx, staff, membership: staff.membership };
}

export const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
