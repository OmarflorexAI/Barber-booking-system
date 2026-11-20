import { type NextRequest, NextResponse } from "next/server";
import { LOCALE_COOKIE } from "@/lib/i18n/dictionaries";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // The landing is English only (browsers offer a translation), so "/" isn't handled here.
  // "/login?lang=en|es" (old links) saves the language as the cookie and drops the parameter
  // (keeping ?mode); the login page's own EN/ES switch works the same way.
  if (request.nextUrl.pathname === "/login") {
    const asked = request.nextUrl.searchParams.get("lang");
    if (asked === "en" || asked === "es") {
      const url = request.nextUrl.clone();
      url.searchParams.delete("lang");
      const res = NextResponse.redirect(url, 307);
      res.cookies.set(LOCALE_COOKIE, asked, { path: "/", maxAge: 31536000, sameSite: "lax" });
      return res;
    }
  }
  return updateSession(request);
}

// Only signed-in areas need the session refresh. The public booking pages
// (/b/..., /m/...) and the static landing skip it so they load as fast as possible.
export const config = {
  matcher: ["/app/:path*", "/login", "/setup", "/auth/:path*"],
};
