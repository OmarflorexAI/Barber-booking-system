import { reporting } from "@/server/engine";
import { createClient } from "@/lib/supabase/server";
import { isBookingError } from "@/server/booking-engine/errors";
import { toLocal } from "@/server/booking-engine/time";
import { loadStaff } from "../../../_shell/staff";

/**
 * GET /app/settings/export/download: the Shop's Clients as a CSV file, for its Owner only.
 * Not signed in, not on a Shop or not its Owner → 403. The engine checks the Owner role
 * again (requireOwner) before it reads anything.
 */
export async function GET() {
  const staff = await loadStaff(await createClient());
  const m = staff?.membership;
  if (!staff || !m || m.role !== "owner") return forbidden();

  let csv: string;
  try {
    csv = await reporting().exportClientsCsv({ userId: staff.userId, shopId: m.shopId });
  } catch (e) {
    if (isBookingError(e, "FORBIDDEN")) return forbidden();
    throw e;
  }

  const date = toLocal(new Date(), m.timezone).date;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clients-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function forbidden() {
  return new Response("Forbidden", { status: 403, headers: { "Cache-Control": "private, no-store" } });
}
