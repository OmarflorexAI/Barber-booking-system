import type { ISql } from "postgres";
import { notFound, proOnly } from "./errors";

/**
 * Plans (M7). Pro = online card payments, Telegram alerts and Client text messages;
 * Free = everything else. Checked on the server: the UI only hides what this refuses.
 * Queries that only need "may this Shop text / take card payments" fold the plan in
 * SQL instead (`sms_enabled and plan = 'pro'`), so Free behaves like texts or payments off.
 */
export const PLANS = ["free", "pro"] as const;
export type Plan = (typeof PLANS)[number];
export type ProFeature = "online_payments" | "client_texts" | "telegram_alerts";

export const isPlan = (v: unknown): v is Plan => typeof v === "string" && (PLANS as readonly string[]).includes(v);

/** PRO_ONLY unless the Shop is on Pro. */
export function requirePro(shop: { plan: string }, feature: ProFeature): void {
  if (shop.plan !== "pro") throw proOnly(feature);
}

export async function shopPlan(db: ISql, shopId: string): Promise<Plan> {
  const [row] = await db<{ plan: Plan }[]>`select plan from public.shops where id = ${shopId}`;
  if (!row) throw notFound("Shop");
  return row.plan;
}

/** Loads the Shop's plan, then `requirePro`. */
export async function requireProShop(db: ISql, shopId: string, feature: ProFeature): Promise<void> {
  requirePro({ plan: await shopPlan(db, shopId) }, feature);
}
