"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { normalizePhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { isBookingError } from "@/server/booking-engine";
import { signup } from "@/server/engine";
import { leads } from "@/server/senders";
import { verifyTurnstile } from "@/server/turnstile";

export type SetupField = "shopName" | "ownerName" | "phone" | "price" | "address";
/** On an error the form comes back with what was typed (React resets a form after its action). */
export type SetupState = { status: "idle" | "error"; code?: string; field?: SetupField; values?: Partial<Record<SetupField, string>> };

const text = (v: FormDataEntryValue | null) => String(v ?? "").trim().replace(/\s+/g, " ");

/** "$25", "25.50", "25,00" -> cents; null when it isn't a price. */
function cents(raw: string): number | null {
  const m = /^\$?\s*(\d{1,4})(?:[.,](\d{1,2}))?$/.exec(raw.replace(/\s/g, ""));
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0"));
}

/**
 * Create the signed-in person's own Shop. The login comes from the session, never the form.
 * Safe to send twice: the engine returns the Shop already made for this login.
 */
export async function createMyShop(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?mode=signup");

  const shopName = text(formData.get("shopName"));
  const ownerName = text(formData.get("ownerName"));
  const phone = text(formData.get("phone"));
  const address = text(formData.get("address"));
  const price = cents(text(formData.get("price")));
  const locale = formData.get("locale") === "es" ? "es" : "en";
  const values = { shopName, ownerName, phone, address, price: text(formData.get("price")) };
  const fail = (code: string, field?: SetupField): SetupState => ({ status: "error", code, field, values });

  if (!shopName || shopName.length > 80) return fail("NAME", "shopName");
  if (!ownerName || ownerName.length > 60) return fail("OWNER", "ownerName");
  if (!normalizePhone(phone)) return fail("PHONE", "phone");
  if (price === null || price > 100_000) return fail("PRICE", "price");

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (!(await verifyTurnstile(String(formData.get("turnstileToken") ?? "") || undefined, ip))) {
    return fail("BOT_CHECK");
  }

  let made: Awaited<ReturnType<ReturnType<typeof signup>["createOwnShop"]>>;
  try {
    made = await signup().createOwnShop({ userId: user.id, shopName, ownerName, phone, address: address.slice(0, 200) || null, haircutPriceCents: price });
  } catch (e) {
    if (isBookingError(e, "FORBIDDEN")) return fail("FORBIDDEN");
    if (isBookingError(e, "INVALID_INPUT")) return fail("UNKNOWN");
    console.error("[signup] could not create a Shop", String(e));
    return fail("UNKNOWN");
  }

  if (made.created) {
    // Tell our team, after the response (saved first, emailed with retries; never blocks sign-up).
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    after(async () => {
      try {
        await leads().submit({
          shopName,
          ownerName,
          phone,
          neighborhood: address.slice(0, 80) || undefined,
          barberCount: 1,
          message: `Signed up online as ${user.email ?? "(no email)"}. Booking page: ${site}/b/${made.slug}`,
          locale,
        });
      } catch (e) {
        console.error("[signup] could not tell the team", String(e));
      }
    });
  }
  redirect("/app/day");
}
