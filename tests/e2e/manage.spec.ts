import { createHash, randomBytes, randomUUID } from "node:crypto";
import { config } from "dotenv";
import { expect, test } from "@playwright/test";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

/**
 * The Client's manage link (/m/<token>) on a phone: the confirmed state's two actions,
 * the cancel confirm step, and the "too late, call the Shop" state. Bookings are written
 * straight into a throwaway Shop (random slug) that is deleted afterwards.
 */
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, onnotice: () => {} });
const MIN = 60_000;
const SHOP_PHONE = "+17185550142";
let shopId = "";
let barberId = "";
let serviceId = "";
let phoneSeq = 0;

test.beforeAll(async () => {
  const [s] = await sql<{ id: string }[]>`
    insert into public.shops (slug, name, phone, cancel_cutoff_minutes)
    values (${`e2e-m-${randomUUID().slice(0, 8)}`}, 'E2E Manage Shop', ${SHOP_PHONE}, 60) returning id`;
  shopId = s.id;
  const [b] = await sql<{ id: string }[]>`insert into public.barbers (shop_id, display_name) values (${shopId}, 'Dre') returning id`;
  barberId = b.id;
  const [sv] = await sql<{ id: string }[]>`
    insert into public.services (shop_id, name_en, name_es, duration_min, buffer_min) values (${shopId}, 'Haircut', 'Corte', 30, 0) returning id`;
  serviceId = sv.id;
  await sql`insert into public.barber_services (shop_id, barber_id, service_id, price_cents) values (${shopId}, ${barberId}, ${serviceId}, 3500)`;
});

test.afterAll(async () => {
  if (shopId) await sql`delete from public.shops where id = ${shopId}`;
  await sql.end();
});

/** A confirmed Booking starting `inMinutes` from now; returns its manage token. */
async function booking(inMinutes: number, payment: { method: "in_person" | "online"; status: "unpaid" | "paid" } = { method: "in_person", status: "unpaid" }) {
  const token = randomBytes(16).toString("base64url");
  const [c] = await sql<{ id: string }[]>`
    insert into public.clients (shop_id, name, phone_e164) values (${shopId}, 'E2E Manage', ${`+1212555${String(100 + phoneSeq++).padStart(4, "0")}`}) returning id`;
  const startsAt = new Date(Math.floor((Date.now() + inMinutes * MIN) / (5 * MIN)) * 5 * MIN);
  const endsAt = new Date(startsAt.getTime() + 30 * MIN);
  await sql`
    insert into public.bookings (shop_id, barber_id, service_id, client_id, status, starts_at, ends_at, blocked_until,
                                 price_cents, payment_method, payment_status, manage_token_hash)
    values (${shopId}, ${barberId}, ${serviceId}, ${c.id}, 'confirmed', ${startsAt}, ${endsAt}, ${endsAt},
            3500, ${payment.method}, ${payment.status}, ${createHash("sha256").update(token).digest("hex")})`;
  return token;
}

test("a confirmed Booking shows the summary, the cutoff and its two actions", async ({ page }) => {
  const token = await booking(3 * 24 * 60);
  await page.goto(`/m/${token}`);
  await expect(page.getByRole("heading", { name: "You're booked" })).toBeVisible();
  await expect(page.getByText("Dre", { exact: true })).toBeVisible();
  await expect(page.getByText("$35")).toBeVisible();
  await expect(page.getByText("Pay at the shop")).toBeVisible();
  await expect(page.getByText(/You can change or cancel until .+ \(1 hour before\)\./)).toBeVisible();
  await expect(page.getByRole("button", { name: "Change time" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel booking" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  // No sideways scroll on a small phone.
  await page.setViewportSize({ width: 360, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test("Cancel asks first, says the refund, and then shows the cancelled state", async ({ page }) => {
  const token = await booking(3 * 24 * 60 + 60, { method: "online", status: "paid" });
  await page.goto(`/m/${token}`);
  await expect(page.getByText("Paid online")).toBeVisible();

  await page.getByRole("button", { name: "Cancel booking" }).click();
  const sheet = page.getByRole("dialog", { name: "Cancel this booking?" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("You'll get a full refund of $35 to your card.")).toBeVisible();
  // Escape closes it and nothing changed.
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(page.getByRole("heading", { name: "You're booked" })).toBeVisible();

  await page.getByRole("button", { name: "Cancel booking" }).click();
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Cancel booking" }).click();

  await expect(page.getByRole("heading", { name: "Cancelled" })).toBeVisible();
  await expect(page.getByText("You cancelled this booking.")).toBeVisible();
  await expect(page.getByText("Your full refund of $35 is on its way to your card.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Book again" })).toHaveAttribute("href", /^\/b\/e2e-m-/);
  await expect(page.getByRole("button", { name: "Change time" })).toHaveCount(0);
});

test("past the cutoff, the actions become a tap-to-call button", async ({ page }) => {
  const token = await booking(30); // the cutoff is 1 hour before
  await page.goto(`/m/${token}`);
  await expect(page.getByRole("heading", { name: "You're booked" })).toBeVisible();
  await expect(page.getByText("It's too late to change this online. Please call the shop.")).toBeVisible();
  const call = page.getByRole("link", { name: "Call (718) 555-0142" });
  await expect(call).toHaveAttribute("href", `tel:${SHOP_PHONE}`);
  const box = await call.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(48);
  await expect(page.getByRole("button", { name: "Change time" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cancel booking" })).toHaveCount(0);
});
