import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { supabasePublicEnv } from "./env";

/**
 * Refreshes the Supabase session cookie before the page renders.
 * Called from src/proxy.ts (Next.js 16 renamed "middleware" to "proxy").
 */
export async function updateSession(request: NextRequest) {
  const { url, key } = supabasePublicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // Auth cookies must never be cached by a CDN and served to someone else.
        Object.entries(headers ?? {}).forEach(([h, v]) => response.headers.set(h, v));
      },
    },
  });

  // Do not remove: this call is what actually refreshes an expired session.
  // Nothing may run between createServerClient and getUser.
  await supabase.auth.getUser();

  return response;
}
