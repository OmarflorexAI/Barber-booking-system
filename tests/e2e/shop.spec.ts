import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

/**
 * The Shop tab (/app/shop), on a phone: the Owner reaches it from the tab bar, sees the Shop
 * (name, address, booking link), the Barbers with their Services and prices and gallery
 * thumbnails, and the Services with length and price (a range across Barbers, a live special);
 * adds "Luis", opens his profile (the Shop tab stays marked) and comes back, then deletes him
 * behind the gray confirm. Settings no longer lists the pages that moved. Builds a throwaway
 * Shop with one Owner (also its Barber) and deletes both afterwards.
 */
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, onnotice: () => {} });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const shop = { id: "", slug: `e2e-shoptab-${randomUUID().slice(0, 8)}` };
let ownerEmail = "";
let ownerId = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const [s] = await sql<{ id: string }[]>`
    insert into public.shops (slug, name, phone, address) values (${shop.slug}, 'E2E Shop Tab', '+17185550195', '12 Test Ave, Bronx, NY') returning id`;
  shop.id = s.id;
  ownerEmail = `e2e-shoptab-owner-${randomUUID().slice(0, 8)}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email: ownerEmail, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  ownerId = data.user.id;
  await sql`insert into public.shop_members (shop_id, user_id, role) values (${shop.id}, ${ownerId}, 'owner')`;

  const [cut] = await sql<{ id: string }[]>`
    insert into public.services (shop_id, name_en, name_es, duration_min, buffer_min, sort_order)
    values (${shop.id}, 'Haircut', 'Corte', 30, 0, 0) returning id`;
  const [beard] = await sql<{ id: string }[]>`
    insert into public.services (shop_id, name_en, name_es, duration_min, buffer_min, sort_order)
    values (${shop.id}, 'Beard trim', 'Barba', 15, 0, 1) returning id`;
  const [o] = await sql<{ id: string }[]>`
    insert into public.barbers (shop_id, user_id, display_name, sort_order) values (${shop.id}, ${ownerId}, 'Carlos Owner', 0) returning id`;
  const [d] = await sql<{ id: string }[]>`
    insert into public.barbers (shop_id, display_name, sort_order) values (${shop.id}, 'Dre', 1) returning id`;
  // Haircut costs $30 with Carlos and $35 with Dre; Carlos's beard trim is on a special until next week.
  await sql`
    insert into public.barber_services (shop_id, barber_id, service_id, price_cents, special_price_cents, special_ends_at) values
      (${shop.id}, ${o.id}, ${cut.id}, 3000, null, null),
      (${shop.id}, ${d.id}, ${cut.id}, 3500, null, null),
      (${shop.id}, ${o.id}, ${beard.id}, 1500, 1000, now() + interval '7 days')`;
  for (const b of [o.id, d.id]) {
    for (let wd = 0; wd < 7; wd++) {
      await sql`insert into public.weekly_hours (shop_id, barber_id, weekday, start_time, end_time) values (${shop.id}, ${b}, ${wd}, '09:00', '19:00')`;
    }
  }
  for (let i = 0; i < 4; i++) {
    await sql`insert into public.barber_gallery (shop_id, barber_id, url, position) values (${shop.id}, ${d.id}, ${`https://example.com/dre-${i}.jpg`}, ${i})`;
  }
});

test.afterAll(async () => {
  if (shop.id) await sql`delete from public.shops where id = ${shop.id}`;
  if (ownerId) await admin.auth.admin.deleteUser(ownerId);
  await sql.end();
});

async function signIn(page: Page) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: ownerEmail });
  if (error) throw error;
  await page.goto(`/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&next=/app/day`);
  await expect(page).toHaveURL(/\/app\/day/);
}

const tabs = (page: Page, name = "Main") => page.getByRole("navigation", { name }).getByRole("link");
const barberRow = (page: Page, name: string) => page.getByRole("list", { name: "Barbers" }).getByRole("listitem").filter({ hasText: name });

async function noSideways(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
}

test("the Owner manages the Shop from its tab: add, open and delete a Barber", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 740 });
  await signIn(page);

  // The tab bar's third tab opens the Shop and marks itself.
  await tabs(page).filter({ hasText: "Shop" }).click();
  await expect(page).toHaveURL(/\/app\/shop$/);
  await expect(page.getByRole("heading", { name: "Shop", level: 1 })).toBeVisible();
  await expect(tabs(page).filter({ hasText: "Shop" })).toHaveAttribute("aria-current", "page");

  // The Shop itself.
  await expect(page.getByRole("heading", { name: "E2E Shop Tab", level: 2 })).toBeVisible();
  await expect(page.getByText("12 Test Ave, Bronx, NY")).toBeVisible();
  await expect(page.getByTestId("shop-booking-url")).toHaveText(new RegExp(`/b/${shop.slug}$`));
  await expect(page.getByRole("link", { name: "Edit Shop profile" })).toHaveAttribute("href", "/app/settings/shop");

  // Barbers: their Services and prices, and gallery thumbnails (three, then "+1").
  await expect(page.getByTestId("barber-count")).toContainText("2 of 6");
  await expect(barberRow(page, "Carlos Owner")).toContainText("Haircut $30 · Beard trim $10");
  await expect(barberRow(page, "Carlos Owner").getByText("You", { exact: true })).toBeVisible();
  await expect(barberRow(page, "Carlos Owner").getByRole("button")).toHaveCount(0);
  await expect(barberRow(page, "Dre")).toContainText("Haircut $35");
  await expect(barberRow(page, "Dre").getByTestId("barber-thumbs").locator("img")).toHaveCount(3);
  await expect(barberRow(page, "Dre").getByTestId("barber-thumbs")).toContainText("+1");

  // Services: length and price, a range across Barbers, a live special.
  const services = page.getByRole("list", { name: "Services and prices" }).getByRole("listitem");
  await expect(services).toHaveCount(2);
  await expect(services.filter({ hasText: "Haircut" })).toContainText("30 min");
  await expect(services.filter({ hasText: "Haircut" })).toContainText("$30–$35");
  await expect(services.filter({ hasText: "Beard trim" })).toContainText("$15");
  await expect(services.filter({ hasText: "Beard trim" })).toContainText("Special $10");
  await noSideways(page);

  // Add Luis.
  await page.getByRole("button", { name: "Add Barber" }).click();
  const sheet = page.getByRole("dialog", { name: "New Barber" });
  await sheet.getByLabel("Name").fill("Luis");
  await sheet.getByRole("button", { name: "Add Barber" }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByText("Luis added.", { exact: false })).toBeVisible();
  await expect(barberRow(page, "Luis")).toContainText("Not bookable yet");
  await expect(page.getByTestId("barber-count")).toContainText("3 of 6");
  const [luis] = await sql<{ id: string }[]>`select id from public.barbers where shop_id = ${shop.id} and display_name = 'Luis'`;

  // His profile opens; the Shop tab stays marked, and the way back leads to the Shop.
  await barberRow(page, "Luis").getByRole("link", { name: /Luis/ }).click();
  await expect(page).toHaveURL(new RegExp(`/app/settings/barbers/${luis.id}$`));
  await expect(page.getByRole("heading", { name: "Luis", level: 1 })).toBeVisible();
  await expect(tabs(page).filter({ hasText: "Shop" })).toHaveAttribute("aria-current", "page");
  await expect(tabs(page).filter({ hasText: "Settings" })).not.toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Shop", exact: true }).first().click();
  await expect(page).toHaveURL(/\/app\/shop$/);

  // Delete Luis behind the confirm; its buttons are gray, never red.
  await barberRow(page, "Luis").getByRole("button", { name: "Delete Luis" }).click();
  const confirm = page.getByRole("dialog", { name: "Delete Luis?" });
  await expect(confirm).toContainText("It can't be undone.");
  const yes = confirm.getByRole("button", { name: "Delete", exact: true });
  const [r, g, b] = await yes.evaluate((el) => getComputedStyle(el).backgroundColor.match(/[\d.]+/g)!.slice(0, 3).map(Number));
  expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThan(20); // a gray, not a hue
  await yes.click();
  await expect(confirm).toBeHidden();
  await expect(page.getByText("Luis deleted.")).toBeVisible();
  await expect(barberRow(page, "Luis")).toHaveCount(0);
  await expect(page.getByTestId("barber-count")).toContainText("2 of 6");
  expect(await sql`select 1 from public.barbers where id = ${luis.id}`).toHaveLength(0);
});

test("Settings no longer lists the pages that moved, and the old Barbers page lands on the Shop", async ({ page }) => {
  await signIn(page);
  await page.goto("/app/settings");
  await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
  for (const name of [/Shop profile/, /Services & prices/, /^Barbers/]) await expect(page.getByRole("link", { name })).toHaveCount(0);
  await page.goto("/app/settings/barbers");
  await expect(page).toHaveURL(/\/app\/shop$/);
});

test("in Spanish the tab is “Barbería”, on the desktop sidebar too", async ({ page, context }) => {
  await context.addCookies([{ name: "lang", value: "es", url: "http://localhost:3000" }]);
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page);
  await expect(tabs(page, "Principal")).toHaveText(["Hoy", "Resumen", "Barbería", "Ajustes"]);
  await tabs(page, "Principal").filter({ hasText: "Barbería" }).click();
  await expect(page.getByRole("heading", { name: "Barbería", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Barberos", level: 2 })).toBeVisible();
  await expect(page.getByRole("list", { name: "Servicios y precios" }).getByRole("listitem").filter({ hasText: "Corte" })).toContainText("$30–$35");
});
