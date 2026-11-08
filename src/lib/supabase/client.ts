import { createBrowserClient } from "@supabase/ssr";
import { supabasePublicEnv } from "./env";

/** Supabase client for Client Components (runs in the browser as the signed-in user). */
export function createClient() {
  const { url, key } = supabasePublicEnv();
  return createBrowserClient(url, key);
}
