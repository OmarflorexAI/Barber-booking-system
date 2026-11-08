import { config } from "dotenv";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

/**
 * Journey 3 from the PRD: two Clients race for the same Slot.
 * Exactly one is booked; the other is told the time was taken and sees fresh times.
 * Runs against the demo Shop (supabase/seed.sql) and removes its own Bookings afterwards.
 */
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
const TAG = `E2E Race ${Date.now()}`;

test.afterAll(async () => {
  await sql`delete from public.clients where name like ${`${TAG}%`}`;
  await sql.end();
});

async function goToFirstFreeSlot(page: Page) {
  await page.goto("/b/demo-shop");
  await page.getByRole("button", { name: /^Haircut\b/ }).first().click();
  await page.getByRole("button", { name: /Carlos/ }).click();
  // Skip today (it may be late or Sunday); take the first later day that has times.
  const days = page.getByRole("tab");
  for (let i = 1; i < 10; i++) {
    await days.nth(i).click();
    const slot = page.getByRole("button", { name: /^\d{1,2}:\d{2}\s?(AM|PM)$/ }).first();
    const empty = page.getByText("No free times this day");
    await expect(slot.or(empty)).toBeVisible();
    if (await slot.isVisible()) return (await slot.textContent())!.trim();
  }
  throw new Error("no free day found");
}

test("two Clients race for one Slot: exactly one gets it", async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();

  const timeA = await goToFirstFreeSlot(a);
  const timeB = await goToFirstFreeSlot(b);
  expect(timeB).toBe(timeA);

  for (const [page, n] of [[a, 1], [b, 2]] as const) {
    await page.getByRole("button", { name: timeA, exact: true }).click();
    await page.getByLabel("Your name").fill(`${TAG} ${n}`);
    await page.getByLabel("Mobile phone").fill(`(718) 555-0${100 + n}`);
  }
  // Let the bot check (Cloudflare's always-pass test key) issue its tokens.
  await a.waitForTimeout(3000);

  await Promise.all([a.getByRole("button", { name: "Book now" }).click(), b.getByRole("button", { name: "Book now" }).click()]);

  const booked = (p: Page) => p.getByText("You're booked!");
  const taken = (p: Page) => p.getByText("That time was just taken. Please pick another.");
  await expect(booked(a).or(taken(a))).toBeVisible();
  await expect(booked(b).or(taken(b))).toBeVisible();

  const results = [await booked(a).isVisible(), await booked(b).isVisible()];
  expect(results.filter(Boolean)).toHaveLength(1);

  // The loser is back on the time step and the taken time is gone.
  const loser = results[0] ? b : a;
  await expect(loser.getByRole("button", { name: timeA, exact: true })).toHaveCount(0);
});
