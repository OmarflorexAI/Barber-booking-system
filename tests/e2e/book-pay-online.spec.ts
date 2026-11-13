import { config } from "dotenv";
import { expect, test } from "@playwright/test";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

/**
 * Journey "book and pay online" (U1): a Client books at /b/demo-shop choosing "Pay now by card",
 * pays on Stripe's hosted Checkout (test mode, card 4242…), comes back to /m/<token>?paid=1
 * and sees the Booking confirmed once the webhook lands (needs `npm run stripe:listen`).
 * A random name and 212-555-01xx phone keep repeated runs clear of the 2-unpaid limit.
 */
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
const TAG = `E2E PayOnline ${Date.now()}`;

test.afterAll(async () => {
  // Outbox rows point at the Booking with "on delete set null": remove them first, or they
  // would be left behind with no Booking and could never be processed.
  await sql`
    delete from public.outbox where booking_id in (
      select b.id from public.bookings b join public.clients c on c.id = b.client_id where c.name like ${`${TAG}%`})`;
  await sql`delete from public.clients where name like ${`${TAG}%`}`;
  await sql.end();
});

test("book, pay online by card, and land confirmed", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/b/demo-shop");
  await page.getByRole("button", { name: /^Haircut\b/ }).first().click();
  await page.getByRole("button", { name: /Dre/ }).click();

  // A day a few days ahead that has free times.
  const days = page.getByRole("tab");
  let picked = false;
  for (let i = 3; i < 14 && !picked; i++) {
    await days.nth(i).click();
    const slot = page.getByRole("button", { name: /^\d{1,2}:\d{2}\s?(AM|PM)$/ }).first();
    await expect(slot.or(page.getByText("No free times this day"))).toBeVisible();
    if (await slot.isVisible()) {
      await slot.click();
      picked = true;
    }
  }
  expect(picked, "no free day found").toBe(true);

  await page.getByLabel("Your name").fill(`${TAG} ${Math.random().toString(36).slice(2, 7)}`);
  await page.getByLabel("Mobile phone").fill(`(212) 555-01${String(Math.floor(Math.random() * 100)).padStart(2, "0")}`);
  await page.getByText("Pay now by card").click();
  const go = page.getByRole("button", { name: "Continue to payment" });
  await expect(go).toBeEnabled({ timeout: 20_000 }); // waits for the bot check
  await go.click();

  // Stripe's hosted Checkout. Its form lives in one Elements iframe (the one with the email field).
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
  const form = page.frameLocator('iframe[src*="elements-inner"]:not([src*="payment-api"])').first();
  await form.locator("#linkAuthentication-emailInput").fill(`e2e+${Date.now()}@example.com`);
  await form.getByText("Card", { exact: true }).click();
  await form.locator("#payment-numberInput").fill("4242424242424242");
  await form.locator("#payment-expiryInput").fill("12 / 34");
  await form.locator("#payment-cvcInput").fill("123");
  const holder = form.locator("#payment-nameInput");
  if (await holder.isVisible().catch(() => false)) await holder.fill("E2E Client");
  const zip = form.locator("#payment-postalCodeInput");
  if (await zip.isVisible().catch(() => false)) await zip.fill("10451");
  // Stripe offers to save the card with Link; leave it off so it doesn't ask for a phone.
  const linkOptIn = form.locator("#payment-linkOptInInput");
  if (await linkOptIn.isChecked().catch(() => false)) await linkOptIn.evaluate((e: HTMLInputElement) => e.click());
  await expect(linkOptIn).not.toBeChecked();
  await form.getByTestId("payment-form-submit-button").click();

  // Back on the manage page.
  await page.waitForURL(/\/m\/[^/?]+\?paid=1/, { timeout: 60_000 });

  // The webhook (via `stripe listen`) marks the Booking paid and confirmed.
  const latest = async () =>
    (
      await sql<{ status: string; payment_status: string }[]>`
        select b.status, b.payment_status from public.bookings b join public.clients c on c.id = b.client_id
        where c.name like ${`${TAG}%`} order by b.created_at desc limit 1
      `
    )[0];
  await expect.poll(latest, { timeout: 45_000, intervals: [1_000, 2_000, 3_000] }).toMatchObject({ status: "confirmed", payment_status: "paid" });

  // The manage page shows it confirmed (it updates by itself; a reload is the fallback).
  const confirmedText = page.getByText(/You're booked|Confirmed/).first();
  await expect(async () => {
    if (!(await confirmedText.isVisible())) await page.reload();
    await expect(confirmedText).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 30_000 });
  // No cancel here: afterAll deletes the Booking and its outbox rows directly (no refund row left behind).
});
