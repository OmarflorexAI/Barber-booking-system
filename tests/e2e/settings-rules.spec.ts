import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

/**
 * Owner Settings → Booking rules and Blocklist on a phone: saving a cutoff over 2 hours shows
 * the reminder warning, blocking then unblocking a number, and a Barber kept out. Builds a
 * throwaway Shop (random slug) with magic-link sign-ins and deletes it afterwards.
 */
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, onnotice: () => {} });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const shop = { id: "", slug: `e2e-rules-${randomUUID().slice(0, 8)}` };
const emails = { owner: "", barber: "" };
const userIds: string[] = [];

async function staffUser(label: string) {
  const email = `e2e-rules-${label}-${randomUUID().slice(0, 8)}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  return { id: data.user.id, email };
}

test.beforeAll(async () => {
  const [s] = await sql<{ id: string }[]>`
    insert into public.shops (slug, name, phone) values (${shop.slug}, 'E2E Rules Shop', '+17185550197') returning id`;
  shop.id = s.id;
  const owner = await staffUser("owner");
  const barber = await staffUser("barber");
  emails.owner = owner.email;
  emails.barber = barber.email;
  await sql`insert into public.shop_members (shop_id, user_id, role) values (${shop.id}, ${owner.id}, 'owner'), (${shop.id}, ${barber.id}, 'barber')`;
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

async function noSideways(page: Page) {
  await page.setViewportSize({ width: 360, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
}

test("the Owner saves a cutoff over 2 hours and sees the reminder warning", async ({ page }) => {
  await signIn(page, emails.owner);
  await page.goto("/app/settings");
  await page.getByRole("link", { name: /Booking rules/ }).click();
  await expect(page.getByRole("heading", { name: "Booking rules" })).toBeVisible();

  await page.getByText("3 h before", { exact: true }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  await expect(page.getByText("The reminder will arrive after the cutoff.")).toBeVisible();
  await expect(page.getByTestId("cutoff-current")).toHaveText("Now: 3 h before");
  const [row] = await sql<{ m: number }[]>`select cancel_cutoff_minutes m from public.shops where id = ${shop.id}`;
  expect(row.m).toBe(180);

  // Back to 2 h: saved, no warning.
  await page.getByText("2 h before", { exact: true }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  await expect(page.getByText("The reminder will arrive after the cutoff.")).toHaveCount(0);

  await page.reload();
  await expect(page.getByTestId("cutoff-current")).toHaveText("Now: 2 h before");
  await noSideways(page);
});

test("the Owner blocks then unblocks a phone number", async ({ page }) => {
  await signIn(page, emails.owner);
  await page.goto("/app/settings");
  await page.getByRole("link", { name: /Blocklist/ }).click();
  await expect(page.getByRole("heading", { name: "Blocklist" })).toBeVisible();
  await expect(page.getByText(/^No blocked numbers\./)).toBeVisible();

  const input = page.getByLabel("Block a phone number");
  await expect(input).toHaveAttribute("inputmode", "tel");
  await input.fill("555-12");
  await page.getByRole("button", { name: "Block number" }).click();
  await expect(page.locator("#block-phone-error")).toContainText("doesn't look right");
  await expect(input).toHaveValue("555-12");

  await input.fill("347 555 9011");
  await page.getByRole("button", { name: "Block number" }).click();
  await expect(page.getByText("(347) 555-9011")).toBeVisible();
  await expect(input).toHaveValue("");
  const [c] = await sql<{ blocked: boolean }[]>`select blocked from public.clients where shop_id = ${shop.id} and phone_e164 = '+13475559011'`;
  expect(c.blocked).toBe(true);
  await noSideways(page);

  await page.getByRole("button", { name: "Unblock (347) 555-9011" }).click();
  await expect(page.getByText("Unblock (347) 555-9011? They'll be able to book online again.")).toBeVisible();
  await page.getByRole("button", { name: "Unblock", exact: true }).click();
  await expect(page.getByText(/^No blocked numbers\./)).toBeVisible();
  const [u] = await sql<{ blocked: boolean }[]>`select blocked from public.clients where shop_id = ${shop.id} and phone_e164 = '+13475559011'`;
  expect(u.blocked).toBe(false);
});

test("a Barber is sent to their Day from both pages", async ({ page }) => {
  await signIn(page, emails.barber);
  await page.goto("/app/settings/rules");
  await expect(page).toHaveURL(/\/app\/day/);
  await page.goto("/app/settings/blocklist");
  await expect(page).toHaveURL(/\/app\/day/);
});
