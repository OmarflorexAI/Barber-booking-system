import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

/**
 * Owner Settings on a phone: the index rows, the booking link page with its QR code, the
 * Clients CSV download, and a Barber kept out of both. Builds a throwaway Shop (random slug)
 * with its own sign-ins (magic links minted with the service role) and deletes it afterwards.
 */
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, onnotice: () => {} });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const shop = { id: "", slug: `e2e-set-${randomUUID().slice(0, 8)}` };
const emails = { owner: "", barber: "" };
const userIds: string[] = [];

async function staffUser(label: string) {
  const email = `e2e-settings-${label}-${randomUUID().slice(0, 8)}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  return { id: data.user.id, email };
}

test.beforeAll(async () => {
  const [s] = await sql<{ id: string }[]>`
    insert into public.shops (slug, name, phone) values (${shop.slug}, 'E2E Settings Shop', '+17185550198') returning id`;
  shop.id = s.id;
  const owner = await staffUser("owner");
  const barber = await staffUser("barber");
  emails.owner = owner.email;
  emails.barber = barber.email;
  await sql`insert into public.shop_members (shop_id, user_id, role) values (${shop.id}, ${owner.id}, 'owner'), (${shop.id}, ${barber.id}, 'barber')`;
  await sql`insert into public.clients (shop_id, name, phone_e164) values (${shop.id}, 'Maria Lopez', '+13475559001'), (${shop.id}, 'Kevin Diaz', '+13475559002')`;
});

test.afterAll(async () => {
  if (shop.id) await sql`delete from public.shops where id = ${shop.id}`;
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
  await sql.end();
});

async function signIn(page: Page, email: string) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  await page.goto(`/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&next=/app/day`);
  await expect(page).toHaveURL(/\/app\/day/);
}

test("the Owner opens the booking link page and sees the URL and QR code", async ({ page }) => {
  await signIn(page, emails.owner);
  await page.goto("/app/settings");
  // Built pages link; the rest are plain rows.
  await expect(page.getByRole("link", { name: /Booking link & QR code/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Export clients/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Services & prices/ })).toHaveCount(0);
  await expect(page.getByText("Services & prices")).toBeVisible();

  await page.getByRole("link", { name: /Booking link & QR code/ }).click();
  await expect(page.getByRole("heading", { name: "Booking link & QR code" })).toBeVisible();
  await expect(page.getByTestId("booking-url")).toHaveText(new RegExp(`^https?://[^/]+/b/${shop.slug}$`));
  const qr = page.getByRole("img", { name: "QR code for your booking link" }).first();
  await expect(qr).toBeVisible();
  await expect(qr.locator("svg")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Print QR code" })).toBeVisible();

  await page.setViewportSize({ width: 360, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test("the Owner downloads the Clients CSV", async ({ page }) => {
  await signIn(page, emails.owner);
  await page.goto("/app/settings/export");
  await expect(page.getByRole("link", { name: "Download CSV" })).toHaveAttribute("href", "/app/settings/export/download");
  const res = await page.request.get("/app/settings/export/download");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  expect(res.headers()["content-disposition"]).toMatch(/attachment; filename="clients-\d{4}-\d{2}-\d{2}\.csv"/);
  const lines = (await res.text()).trim().split(/\r\n/);
  expect(lines[0]).toBe("name,phone,bookings,no_shows,last_booking,texts_opted_out,blocked");
  expect(lines).toHaveLength(3);
  expect(lines[1]).toContain("Kevin Diaz,+13475559002");
});

test("a Barber is sent to their Day and can't download the CSV", async ({ page }) => {
  await signIn(page, emails.barber);
  await page.goto("/app/settings/link");
  await expect(page).toHaveURL(/\/app\/day/);
  const res = await page.request.get("/app/settings/export/download");
  expect(res.status()).toBe(403);
});

test("nobody signed in gets 403 from the CSV download", async ({ request }) => {
  const res = await request.get("/app/settings/export/download");
  expect(res.status()).toBe(403);
});
