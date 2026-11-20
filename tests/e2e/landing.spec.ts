import { config } from "dotenv";
import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { landingText as en } from "../../src/lib/i18n/landing";

config({ path: ".env.local", quiet: true });

/** The landing page that sells Barber Master to Shop Owners: English only, the free-month form, the demo link. */
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
const TAG = `E2E Lead ${Date.now()}`;

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

  // The browser, not the page, offers Spanish: the page must say it is English, carry no
  // language switch and never opt out of translation.
  test("stays on / in English, so the browser can offer a translation", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.heroTitle);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("link", { name: /español/i })).toHaveCount(0);
    await expect(page.locator('[translate="no"], .notranslate, meta[name="google"][content="notranslate"]')).toHaveCount(0);
  });

  test("Log in opens the login page in Spanish (from the phone's language)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("footer").getByRole("link", { name: en.staffSignIn })).toHaveAttribute("href", "/login");
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
  });
});

test("old Spanish addresses forward to the English pages", async ({ page }) => {
  for (const [from, to] of [["/es", /\/$/], ["/es/privacy", /\/privacy$/], ["/es/terms", /\/terms$/]] as const) {
    await page.goto(from);
    await expect(page).toHaveURL(to);
  }
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("the footer links to the legal pages", async ({ page }) => {
  await page.goto("/");
  const footer = page.locator("footer");
  await expect(footer.getByRole("link", { name: en.privacy })).toHaveAttribute("href", "/privacy");
  await expect(footer.getByRole("link", { name: en.terms })).toHaveAttribute("href", "/terms");
});

test("/ has its language, description and canonical in the head, and no hreflang", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".landing")).toHaveAttribute("lang", "en");
  await expect(page.locator('head meta[name="description"]')).toHaveAttribute("content", en.metaDescription);
  await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute("href", /^https?:\/\/[^/]+\/?$/);
  await expect(page.locator('head link[rel="alternate"][hreflang]')).toHaveCount(0);
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
  const types = (ld["@graph"] as { "@type": string }[]).map((n) => n["@type"]);
  expect(types).toEqual(expect.arrayContaining(["Organization", "WebSite"]));
  expect(JSON.stringify(ld)).not.toMatch(/aggregateRating|review|offers|price/i);
});

test.describe("JavaScript off", () => {
  test.use({ javaScriptEnabled: false });

  test("/ still shows the page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.heroTitle);
    await expect(page.locator('head meta[name="description"]')).toHaveCount(1);
  });
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

test("'See a real booking page' opens the demo shop, with a way back", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: en.heroDemo }).first().click();
  await expect(page).toHaveURL(/\/b\/demo-shop\?from=site$/);
  await page.getByRole("link", { name: "Back to Barber Master" }).click();
  await expect(page).toHaveURL(/localhost:\d+\/$/);
});

test("the hero phone books a pretend cut", async ({ page }) => {
  const p = en.heroPhone;
  await page.goto("/");
  const phone = page.getByRole("group", { name: p.label });
  await phone.getByRole("button", { name: p.services[3].name }).click();
  await phone.getByRole("button", { name: p.barbers[2] }).click();
  // The day strip opens on today's date in New York, chosen.
  const today = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric" }).format(new Date());
  await expect(phone.getByRole("button", { name: today, exact: true })).toHaveAttribute("aria-pressed", "true");
  // Like the real picker, taken times aren't shown.
  await expect(phone.getByRole("button", { name: p.times[p.taken[0]], exact: true })).toHaveCount(0);
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
