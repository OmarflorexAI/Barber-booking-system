// Screenshots of the demo Shop's booking page for the landing page (public/landing/).
// Needs `npm run dev` running. Re-run when the booking screens change:
//   npm run landing:shots
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const base = process.env.SITE ?? "http://localhost:3000";
const out = fileURLToPath(new URL("../public/landing/", import.meta.url));
await mkdir(out, { recursive: true });

// The Next.js dev badge (bottom left) must not end up in the pictures.
const hideDevBadge = (page) => page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => e.remove()));

const browser = await chromium.launch();
for (const locale of ["en", "es"]) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 780 },
    deviceScaleFactor: 2,
    locale: locale === "es" ? "es-US" : "en-US",
    colorScheme: "light",
  });
  const page = await ctx.newPage();
  await page.goto(`${base}/b/demo-shop`);
  await page.getByRole("button").nth(1).waitFor();
  await hideDevBadge(page);
  await page.screenshot({ path: `${out}booking-services-${locale}.png` });

  // The time picker: first service, Dre, first day with free times.
  await page.locator("main button").filter({ hasText: /\$/ }).first().click();
  await page.getByRole("button", { name: /Dre/ }).click();
  const days = page.getByRole("tab");
  for (let i = 1; i < 10; i++) {
    await days.nth(i).click();
    const slot = page.getByRole("button", { name: /^\d{1,2}:\d{2}\s?(AM|PM|a\. ?m\.|p\. ?m\.)$/i }).first();
    await slot.or(page.locator("main p").filter({ hasText: /(No free times|No hay horas)/ })).first().waitFor();
    if (await slot.isVisible()) break;
  }
  await hideDevBadge(page);
  await page.screenshot({ path: `${out}booking-times-${locale}.png` });
  await ctx.close();
}
await browser.close();
console.log("saved to public/landing/");
