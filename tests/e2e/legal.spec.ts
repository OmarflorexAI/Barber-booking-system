import { expect, test } from "@playwright/test";
import type { Locale } from "../../src/lib/i18n/dictionaries";
import { legalDictionaries, legalPaths, notFoundCopy, type LegalPageKey } from "../../src/lib/i18n/legal";

/** The privacy and terms pages (EN at /privacy, /terms; ES under /es) and the bilingual 404. */
const pages: { page: LegalPageKey; locale: Locale }[] = [
  { page: "privacy", locale: "en" },
  { page: "terms", locale: "en" },
  { page: "privacy", locale: "es" },
  { page: "terms", locale: "es" },
];

for (const { page: key, locale } of pages) {
  const path = legalPaths[key][locale];
  const other: Locale = locale === "en" ? "es" : "en";
  const t = legalDictionaries[locale];

  test.describe(`${path} without JavaScript`, () => {
    test.use({ javaScriptEnabled: false });

    test("renders its heading, description and language links", async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(t[key].title);
      await expect(page.locator(".landing")).toHaveAttribute("lang", locale);
      await expect(page.locator('head meta[name="description"]')).toHaveAttribute("content", t[key].metaDescription);
      await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${path}$`));
      await expect(page.locator('head link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", new RegExp(`${legalPaths[key].en}$`));
      await expect(page.locator('head link[rel="alternate"][hreflang="es"]')).toHaveAttribute("href", new RegExp(`${legalPaths[key].es}$`));
      const toOther = page.getByRole("link", { name: t.otherLang });
      await expect(toOther).toHaveAttribute("href", legalPaths[key][other]);
      await expect(toOther).toHaveAttribute("lang", other);
      for (const s of t[key].sections) await expect(page.getByRole("heading", { level: 2, name: s.heading })).toBeVisible();
    });
  });

  test(`${path} sets <html lang="${locale}"> and has no sideways scroll`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  });
}

test("the language link opens the same page in the other language", async ({ page }) => {
  await page.goto("/privacy");
  await page.getByRole("link", { name: legalDictionaries.en.otherLang }).click();
  await expect(page).toHaveURL(/\/es\/privacy$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(legalDictionaries.es.privacy.title);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
});

test.describe("404 without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("says it in both languages, with a home link for each", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist");
    expect(res?.status()).toBe(404);
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1.locator('[lang="en"]')).toHaveText(notFoundCopy.en.title);
    await expect(h1.locator('[lang="es"]')).toHaveText(notFoundCopy.es.title);
    await expect(page.getByRole("link", { name: notFoundCopy.en.home })).toHaveAttribute("href", "/?lang=en");
    await expect(page.getByRole("link", { name: notFoundCopy.es.home })).toHaveAttribute("href", "/es");
  });
});
