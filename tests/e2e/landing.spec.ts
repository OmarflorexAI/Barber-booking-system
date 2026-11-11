import { config } from "dotenv";
import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { landingDictionaries } from "../../src/lib/i18n/landing";

config({ path: ".env.local", quiet: true });

/** The landing page that sells Barber Master to Shop Owners: language, the free-month form, the demo link. */
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
const TAG = `E2E Lead ${Date.now()}`;
const en = landingDictionaries.en;
const es = landingDictionaries.es;

test.afterAll(async () => {
  await sql`delete from public.leads where shop_name like ${`${TAG}%`}`;
  await sql.end();
});

test("opens in English for an English phone", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.heroTitle);
});

test.describe("Spanish phone", () => {
  test.use({ locale: "es-US" });

  test("opens in Spanish", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(es.heroTitle);
  });
});

test("the language toggle switches to the other language", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.heroTitle);
  await page.getByRole("button", { name: en.otherLang }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(es.heroTitle);
  await page.getByRole("button", { name: es.otherLang }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.heroTitle);
});

test("an Owner leaves their number and the lead is saved", async ({ page }) => {
  const shop = `${TAG} Fresh Cuts`;
  // A new number each run: the same phone within a short window counts as a repeat and isn't saved twice.
  const phone = `(718) 555-01${String(Math.floor(Math.random() * 100)).padStart(2, "0")}`;
  await page.goto("/");
  const form = page.locator("#free-month");
  await form.getByLabel(en.shopName).fill(shop);
  await form.getByLabel(en.ownerName).fill("E2E Owner");
  await form.getByLabel(en.phone).fill(phone);
  const send = form.getByRole("button", { name: en.send, exact: true });
  await expect(send).toBeEnabled(); // waits for the bot check
  await send.click();

  await expect(page.getByRole("status")).toContainText(en.thanksTitle);
  const rows = await sql`select owner_name, locale from public.leads where shop_name = ${shop}`;
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ owner_name: "E2E Owner", locale: "en" });
});

test("'See a real booking page' opens the demo shop", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: en.heroDemo }).first().click();
  await expect(page).toHaveURL(/\/b\/demo-shop$/);
});
