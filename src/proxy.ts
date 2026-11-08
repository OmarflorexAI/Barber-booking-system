import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Only signed-in areas need the session refresh. The public booking pages
// (/b/..., /m/...) skip it so Clients get the fastest possible load.
export const config = {
  matcher: ["/app/:path*", "/login", "/auth/:path*"],
};
