import { config } from "dotenv";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

/**
 * Bug: on /b/demo-shop, clicking "Book now" did nothing for a real user.
 * A Client must always see an outcome after pressing it: the confirmation or a message.
 */
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
const TAG = `E2E BookNow ${Date.now()}`;

test.afterAll(async () => {
  await sql`delete from public.clients where name like ${`${TAG}%`}`;
  await sql.end();
});

async function toDetails(page: Page) {
  await page.goto("/b/demo-shop");
  await page.getByRole("button", { name: /^Haircut\b/ }).first().click();
  await page.getByRole("button", { name: /Dre/ }).click();
  const days = page.getByRole("tab");
  for (let i = 1; i < 10; i++) {
    await days.nth(i).click();
    const slot = page.getByRole("button", { name: /^\d{1,2}:\d{2}\s?(AM|PM)$/ }).first();
    const empty = page.getByText("No free times this day");
    await expect(slot.or(empty)).toBeVisible();
    if (await slot.isVisible()) {
      await slot.click();
      return;
    }
  }
  throw new Error("no free day found");
}

for (const [i, viewport] of ([null, { width: 1280, height: 800 }, { width: 360, height: 560 }] as const).entries()) {
  test(`pressing Book now right away always shows an outcome (${viewport ? `${viewport.width}x${viewport.height}` : "Pixel 7"})`, async ({ page }) => {
    if (viewport) await page.setViewportSize(viewport);
    const logs: string[] = [];
    page.on("console", (m) => m.type() === "error" && logs.push(`console: ${m.text()}`));
    page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));

    await toDetails(page);
    await page.getByLabel("Your name").fill(`${TAG} ${viewport ? "d" : "p"}`);
    await page.getByLabel("Mobile phone").fill(`(718) 555-01${70 + i}`);
    await page.getByRole("button", { name: "Book now" }).click(); // no waiting for the bot check

    const booked = page.getByText("You're booked!");
    const alert = page.locator("main p[role=alert]");
    await expect(booked.or(alert), `no outcome shown. ${logs.join(" | ")}`).toBeVisible({ timeout: 15_000 });
    // The user's symptom: the outcome must be on screen where they are looking, not scrolled away.
    await expect(booked.or(alert)).toBeInViewport();
    // A real Client who presses Book now as soon as the form is filled gets booked, not a bot-check error.
    await expect(booked).toBeVisible();
  });
}
