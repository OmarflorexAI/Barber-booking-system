import { type NextRequest, NextResponse } from "next/server";
import { LOCALE_COOKIE, pickLocale } from "@/lib/i18n/dictionaries";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // The landing page: English lives at /, Spanish at /es (both static). Send Spanish
  // visitors (saved choice, else their phone's language) to /es. /es never redirects back.
  if (request.nextUrl.pathname === "/") {
    // "?lang=en" (the landing's English link) saves the choice as a cookie and drops the
    // parameter, so a Spanish phone can reach English even with JavaScript off.
    const asked = request.nextUrl.searchParams.get("lang");
    if (asked === "en" || asked === "es") {
      const url = request.nextUrl.clone();
      url.searchParams.delete("lang");
      url.pathname = asked === "es" ? "/es" : "/";
      const res = NextResponse.redirect(url, 307);
      res.cookies.set(LOCALE_COOKIE, asked, { path: "/", maxAge: 31536000, sameSite: "lax" });
      return res;
    }
    const locale = pickLocale(request.cookies.get(LOCALE_COOKIE)?.value, request.headers.get("accept-language"));
    if (locale === "es") {
      const url = request.nextUrl.clone();
      url.pathname = "/es";
      return NextResponse.redirect(url, 307);
    }
    return NextResponse.next();
  }
  return updateSession(request);
}

// Only signed-in areas need the session refresh. The public booking pages
// (/b/..., /m/...) skip it so Clients get the fastest possible load. "/" is here only
// for the language redirect above.
export const config = {
  matcher: ["/", "/app/:path*", "/login", "/auth/:path*"],
};
