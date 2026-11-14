import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

/**
 * Plans (M7) on a phone. A throwaway Shop starts on Free: /b offers no "Pay online", Settings
 * shows "Free plan" with gray "Pro" tags, and a locked row opens the "Ask us to upgrade" sheet
 * ($50 a month, a link to our contact form). Switching the Shop to Pro in SQL (with payments on
 * and a payment account id, no Stripe call needed just to show the choice) brings back "Pay now
 * by card" on /b and drops the tags. The Shop and the Owner's login are deleted afterwards.
 */
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, onnotice: () => {} });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const axePath = require.resolve("axe-core/axe.min.js");

const shop = { id: "", slug: `e2e-plan-${randomUUID().slice(0, 8)}` };
let owner = { id: "", email: "" };

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const [s] = await sql<{ id: string }[]>`
    insert into public.shops (slug, name, phone) values (${shop.slug}, 'E2E Plans Shop', '+17185550197') returning id`;
  shop.id = s.id;
  const [b] = await sql<{ id: string }[]>`insert into public.barbers (shop_id, display_name, sort_order) values (${shop.id}, 'Dre', 0) returning id`;
  for (let wd = 0; wd < 7; wd++) {
    await sql`insert into public.weekly_hours (shop_id, barber_id, weekday, start_time, end_time) values (${shop.id}, ${b.id}, ${wd}, '08:00', '22:00')`;
  }
  const [sv] = await sql<{ id: string }[]>`
    insert into public.services (shop_id, name_en, name_es, duration_min, buffer_min, sort_order) values (${shop.id}, 'Haircut', 'Corte', 30, 0, 0) returning id`;
  await sql`insert into public.barber_services (shop_id, barber_id, service_id, price_cents) values (${shop.id}, ${b.id}, ${sv.id}, 3500)`;

  const email = `e2e-plans-owner-${randomUUID().slice(0, 8)}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  owner = { id: data.user.id, email };
  await sql`insert into public.shop_members (shop_id, user_id, role) values (${shop.id}, ${owner.id}, 'owner')`;
});

test.afterAll(async () => {
  if (shop.id) await sql`delete from public.shops where id = ${shop.id}`;
  if (owner.id) await admin.auth.admin.deleteUser(owner.id);
  await sql.end();
});

async function signIn(page: Page) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: owner.email });
  if (error) throw error;
  await page.goto(`/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&next=/app/day`);
  await expect(page).toHaveURL(/\/app\/day/);
}

/** /b up to the details step (Service, Barber, the first day with a free time). */
async function toDetails(page: Page) {
  await page.goto(`/b/${shop.slug}`);
  await page.getByRole("button", { name: /^Haircut\b/ }).first().click();
  await page.getByRole("button", { name: /Dre/ }).click();
  const days = page.getByRole("tab");
  for (let i = 1; i < 10; i++) {
    await days.nth(i).click();
    const slot = page.getByRole("button", { name: /^\d{1,2}:\d{2}\s?(AM|PM)$/ }).first();
    await expect(slot.or(page.getByText("No free times this day"))).toBeVisible();
    if (await slot.isVisible()) {
      await slot.click();
      await expect(page.getByLabel("Your name")).toBeVisible();
      return;
    }
  }
  throw new Error("no free day found");
}

async function axe(page: Page, rules?: string[]) {
  await page.addScriptTag({ path: axePath });
  return page.evaluate(async (only) => {
    // @ts-expect-error axe is injected above
    const r = await window.axe.run(document, only ? { runOnly: { type: "rule", values: only } } : undefined);
    return r.violations.map((v: { id: string; nodes: { target: string[] }[] }) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  }, rules ?? null);
}

test("a Free Shop: no online payment on /b, Pro tags and the upgrade sheet in Settings", async ({ page, context }) => {
  test.setTimeout(120_000);
  await toDetails(page);
  await expect(page.getByText("Pay now by card")).toHaveCount(0);
  await expect(page.getByText(/Payment:\s*Pay at the shop/)).toBeVisible();

  await signIn(page);
  await page.goto("/app/settings");
  await expect(page.getByTestId("plan-name")).toHaveText("Free plan");
  const tags = page.getByTestId("pro-tag");
  await expect(tags).toHaveCount(3);
  for (const name of [/Online payments/, /Texts to Clients/, /Telegram alerts/]) {
    await expect(page.getByRole("button", { name })).toBeVisible();
    await expect(page.getByRole("link", { name })).toHaveCount(0);
  }

  const row = page.getByRole("button", { name: /Online payments/ });
  await row.click();
  const sheet = page.getByRole("dialog", { name: "Ask us to upgrade" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Pro is $50 a month.")).toBeVisible();
  await expect(sheet.getByText("Online card payments")).toBeVisible();
  await expect(sheet.getByText("Texts to Clients")).toBeVisible();
  await expect(sheet.getByText("Telegram alerts for Barbers")).toBeVisible();
  await expect(sheet.getByRole("link", { name: "Talk to us" })).toHaveAttribute("href", "/#contact");
  expect(await axe(page)).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(row).toBeFocused();

  await page.setViewportSize({ width: 360, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  expect(await axe(page)).toEqual([]);

  // Spanish.
  await context.addCookies([{ name: "lang", value: "es", url: "http://localhost:3000" }]);
  await page.reload();
  await expect(page.getByTestId("plan-name")).toHaveText("Plan gratis");
  await page.getByRole("button", { name: /Avisos por Telegram/ }).click();
  const es = page.getByRole("dialog", { name: "Pídenos el plan Pro" });
  await expect(es.getByText("Pro cuesta $50 al mes.")).toBeVisible();
  await expect(es.getByRole("link", { name: "Habla con nosotros" })).toHaveAttribute("href", "/es#contact");
  await es.getByRole("button", { name: "Cerrar" }).click();
  await expect(es).toBeHidden();
  await context.addCookies([{ name: "lang", value: "en", url: "http://localhost:3000" }]);

  // The Dashboard's day bars: each accessible name starts with its visible text (WCAG 2.5.3).
  await page.goto("/app/dashboard");
  await expect(page.getByTestId("day-bar")).toHaveCount(7);
  expect(await axe(page, ["label-content-name-mismatch"])).toEqual([]);
});

test("switched to Pro: Settings shows the Pro plan with no tags, and /b offers card payment", async ({ page }) => {
  test.setTimeout(120_000);
  await sql`update public.shops set plan = 'pro', payments_enabled = true, payment_account_id = 'acct_e2e_plans' where id = ${shop.id}`;

  await toDetails(page);
  await expect(page.getByText("Pay now by card")).toBeVisible();

  await signIn(page);
  await page.goto("/app/settings");
  await expect(page.getByTestId("plan-name")).toHaveText("Pro plan");
  await expect(page.getByTestId("pro-tag")).toHaveCount(0);
  // Texts work on Pro, so the row shows their state (this test Shop has them off), not "Soon".
  await expect(page.getByTestId("row-state-texts")).toHaveText("Off");
  await expect(page.getByTestId("row-state-telegram")).toHaveText("Soon");
  await expect(page.getByRole("button", { name: /Online payments/ })).toHaveCount(0);
  await expect(page.getByText("Online payments")).toBeVisible();
});
