import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { landingPath, loadStaff } from "@/app/app/_shell/staff";
import { createClient } from "@/lib/supabase/server";

/**
 * Where the emailed magic link lands. Starts the session, then goes to `next` when it's a
 * same-site path, else to the person's landing screen (Barber → Day, Owner → Today; see
 * landingPath).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = url.searchParams.get("next");
  // Only same-site relative paths; never an open redirect ("//evil.com", "/\evil.com" resolve off-site).
  const safeNext = next && next.startsWith("/") && new URL(next, url.origin).origin === url.origin ? next : null;

  const supabase = await createClient();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing code") };

  if (error) return NextResponse.redirect(new URL("/login?error=link", url.origin));
  const target = safeNext ?? landingPath(await loadStaff(supabase));
  return NextResponse.redirect(new URL(target, url.origin));
}
