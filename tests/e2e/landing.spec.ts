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
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.heroTitle);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test.describe("Spanish phone", () => {
  test.use({ locale: "es-US" });

  test("visiting / ends on /es, in Spanish", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/es$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(es.heroTitle);
  });

  test("a saved English choice wins over the phone's language", async ({ page, context }) => {
    await context.addCookies([{ name: "lang", value: "en", url: "http://localhost:3000" }]);
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.heroTitle);
  });
});

test("the language toggle moves between / and /es, and the choice sticks", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.heroTitle);
  await page.getByRole("link", { name: en.otherLang }).first().click();
  await expect(page).toHaveURL(/\/es$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(es.heroTitle);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  // The choice is saved: / now sends this English phone to /es.
  await page.goto("/");
  await expect(page).toHaveURL(/\/es$/);
  await page.getByRole("link", { name: es.otherLang }).first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.heroTitle);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("the Spanish footer links to the Spanish legal pages", async ({ page }) => {
  await page.goto("/es");
  const footer = page.locator("footer");
  await expect(footer.getByRole("link", { name: es.privacy })).toHaveAttribute("href", "/es/privacy");
  await expect(footer.getByRole("link", { name: es.terms })).toHaveAttribute("href", "/es/terms");
  await page.goto("/");
  await expect(page.locator("footer").getByRole("link", { name: en.privacy })).toHaveAttribute("href", "/privacy");
});

test("/es has its language, description, canonical and hreflang in the head", async ({ page }) => {
  await page.goto("/es");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.locator(".landing")).toHaveAttribute("lang", "es");
  await expect(page.locator('head meta[name="description"]')).toHaveAttribute("content", es.metaDescription);
  await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute("href", /\/es$/);
  await expect(page.locator('head link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", /^https?:\/\/[^/]+\/?$/);
  await expect(page.locator('head link[rel="alternate"][hreflang="es"]')).toHaveAttribute("href", /\/es$/);
  await expect(page.locator('head link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
  const types = (ld["@graph"] as { "@type": string }[]).map((n) => n["@type"]);
  expect(types).toEqual(expect.arrayContaining(["Organization", "WebSite"]));
  expect(JSON.stringify(ld)).not.toMatch(/aggregateRating|review|offers|price/i);
});

test.describe("JavaScript off", () => {
  test.use({ javaScriptEnabled: false });

  for (const [path, title] of [["/", en.heroTitle], ["/es", es.heroTitle]] as const) {
    test(`${path} still shows the page`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      await expect(page.locator('head meta[name="description"]')).toHaveCount(1);
    });
  }
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

test("the hero phone books a pretend cut", async ({ page }) => {
  const p = en.heroPhone;
  await page.goto("/");
  const phone = page.getByRole("group", { name: p.label });
  await phone.getByRole("button", { name: p.services[3].name }).click();
  await phone.getByRole("button", { name: p.barbers[2] }).click();
  await expect(phone.getByRole("button", { name: p.times[p.taken[0]] })).toBeDisabled();
  await phone.getByRole("button", { name: p.times[6] }).click();
  await expect(phone.getByText(p.bookedTitle)).toBeVisible();
  await phone.getByRole("button", { name: p.again }).click();
  await expect(phone.getByText(p.chooseService)).toBeVisible();
});

test("the questions open one at a time", async ({ page }) => {
  await page.goto("/");
  const [first, second] = [en.faq[0].q, en.faq[1].q].map((q) => page.locator("details", { has: page.getByText(q, { exact: true }) }));
  await expect(first).toHaveAttribute("open", "");
  await second.locator("summary").click();
  await expect(second).toHaveAttribute("open", "");
  await expect(first).not.toHaveAttribute("open", "");
});
