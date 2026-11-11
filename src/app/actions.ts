"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { leads } from "@/server/senders";
import { verifyTurnstile } from "@/server/turnstile";

const Input = z.object({
  shopName: z.string().max(200),
  ownerName: z.string().max(200),
  phone: z.string().max(40),
  neighborhood: z.string().max(200).optional(),
  barberCount: z.number().int().min(1).max(50).optional(),
  message: z.string().max(2000).optional(),
  locale: z.enum(["en", "es"]).default("en"),
  turnstileToken: z.string().optional(),
});

export type LeadActionResult = { ok: true } | { ok: false; code: string };

/** The landing page's "get your free month" form. Checks the bot test, then hands the lead on. */
export async function submitLeadAction(raw: z.input<typeof Input>): Promise<LeadActionResult> {
  const parsed = Input.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT" };
  const { turnstileToken, ...lead } = parsed.data;

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (!(await verifyTurnstile(turnstileToken, ip))) return { ok: false, code: "BOT_CHECK" };

  try {
    return await leads().submit(lead);
  } catch (e) {
    console.error("[leads] could not save a lead", String(e));
    return { ok: false, code: "UNKNOWN" };
  }
}
