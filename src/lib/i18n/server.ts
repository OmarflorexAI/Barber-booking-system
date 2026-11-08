import "server-only";
import { cookies, headers } from "next/headers";
import { dictionaries, LOCALE_COOKIE, pickLocale, type Locale } from "./dictionaries";

/** The visitor's language: their saved choice, else their phone's language. */
export async function getLocale(): Promise<Locale> {
  const [c, h] = await Promise.all([cookies(), headers()]);
  return pickLocale(c.get(LOCALE_COOKIE)?.value, h.get("accept-language"));
}

export async function getDictionary() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}
