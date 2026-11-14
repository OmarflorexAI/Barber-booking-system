import "server-only";
import { redirect } from "next/navigation";
import { getShellContext } from "../_shell/staff";

/**
 * The Owner pages' guard: nobody signed in → /login. Returns null when the person owns no
 * Shop (the shell already shows the "not linked to a Shop" or "Ask your Shop's Owner" page).
 */
export async function ownerContext() {
  const ctx = await getShellContext();
  const { staff } = ctx;
  if (!staff) redirect("/login");
  if (!staff.membership) return null;
  return { ...ctx, staff, membership: staff.membership };
}

export const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
