import { expect, test } from "@playwright/test";
import { legalPaths, legalText as t, notFoundCopy, type LegalPageKey } from "../../src/lib/i18n/legal";

/** The privacy and terms pages (English only; the old /es pages forward) and the bilingual 404. */
for (const key of ["privacy", "terms"] as LegalPageKey[]) {
  const path = legalPaths[key];

  test.describe(`${path} without JavaScript`, () => {
    test.use({ javaScriptEnabled: false });

    test("renders its heading, description and sections, with no language switch", async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(t[key].title);
      await expect(page.locator(".landing")).toHaveAttribute("lang", "en");
      await expect(page.locator('head meta[name="description"]')).toHaveAttribute("content", t[key].metaDescription);
      await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${path}$`));
      await expect(page.locator('head link[rel="alternate"][hreflang]')).toHaveCount(0);
      await expect(page.getByRole("link", { name: /español/i })).toHaveCount(0);
      for (const s of t[key].sections) await expect(page.getByRole("heading", { level: 2, name: s.heading })).toBeVisible();
    });
  });

  test(`${path} sets <html lang="en"> and has no sideways scroll`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  });
}

test.describe("404 without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("says it in both languages, each with a link home", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist");
    expect(res?.status()).toBe(404);
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1.locator('[lang="en"]')).toHaveText(notFoundCopy.en.title);
    await expect(h1.locator('[lang="es"]')).toHaveText(notFoundCopy.es.title);
    await expect(page.getByRole("link", { name: notFoundCopy.en.home })).toHaveAttribute("href", "/");
    await expect(page.getByRole("link", { name: notFoundCopy.es.home })).toHaveAttribute("href", "/");
  });
});
