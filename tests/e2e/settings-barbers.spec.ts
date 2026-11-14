import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

/**
 * PLAN.md M3, Settings → Barbers on a phone: add "Luis" with a photo and a phone ("Not bookable
 * yet"), give him a price and hours in SQL so he shows on /b, delete him behind the confirm (gone
 * from the list, /b and storage); a Barber with a Booking tomorrow can't be deleted and the
 * Booking shows with Cancel / Move; the Owner's own row has no Delete; at 6 Barbers, Add shows
 * the limit notice. Builds a throwaway Shop and deletes it, its users and its stored files.
 */
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, onnotice: () => {} });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const BUCKET = "shop-media";

const shop = { id: "", slug: `e2e-team-${randomUUID().slice(0, 8)}`, cut: "", owner: "", marco: "" };
let ownerEmail = "";
const userIds: string[] = [];

test.describe.configure({ mode: "serial" });

async function bookable(barberId: string) {
  await sql`insert into public.barber_services (shop_id, barber_id, service_id, price_cents) values (${shop.id}, ${barberId}, ${shop.cut}, 3000)`;
  for (let wd = 0; wd < 7; wd++) {
    await sql`
      insert into public.weekly_hours (shop_id, barber_id, weekday, start_time, end_time)
      values (${shop.id}, ${barberId}, ${wd}, '09:00', '19:00')`;
  }
}

test.beforeAll(async () => {
  const [s] = await sql<{ id: string }[]>`
    insert into public.shops (slug, name, phone) values (${shop.slug}, 'E2E Team Shop', '+17185550196') returning id`;
  shop.id = s.id;
  ownerEmail = `e2e-team-owner-${randomUUID().slice(0, 8)}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email: ownerEmail, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  await sql`insert into public.shop_members (shop_id, user_id, role) values (${shop.id}, ${data.user.id}, 'owner')`;
  const [cut] = await sql<{ id: string }[]>`
    insert into public.services (shop_id, name_en, name_es, duration_min, buffer_min, sort_order)
    values (${shop.id}, 'Haircut', 'Corte', 30, 0, 0) returning id`;
  shop.cut = cut.id;
  // The Owner cuts hair too: their own Barber, tied to their login.
  const [o] = await sql<{ id: string }[]>`
    insert into public.barbers (shop_id, user_id, display_name, sort_order) values (${shop.id}, ${data.user.id}, 'Carlos Owner', 0) returning id`;
  shop.owner = o.id;
  await bookable(o.id);
});

test.afterAll(async () => {
  if (shop.id) {
    const prefix = `shops/${shop.id}/avatar`;
    const { data } = await admin.storage.from(BUCKET).list(prefix, { limit: 100 });
    const paths = (data ?? []).map((f) => `${prefix}/${f.name}`);
    if (paths.length) await admin.storage.from(BUCKET).remove(paths);
    await sql`delete from public.shops where id = ${shop.id}`;
  }
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
  await sql.end();
});

async function signIn(page: Page) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: ownerEmail });
  if (error) throw error;
  await page.goto(`/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&next=/app/day`);
  await expect(page).toHaveURL(/\/app\/day/);
}

async function noSideways(page: Page) {
  await page.setViewportSize({ width: 360, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
}

/** A 1200×900 JPEG drawn in the browser, like a phone photo. */
async function jpeg(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 1200;
    c.height = 900;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 1200, 900);
    g.addColorStop(0, "#303030");
    g.addColorStop(1, "#c0c0c0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1200, 900);
    const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.9));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  });
  return Buffer.from(b64, "base64");
}

const list = (page: Page) => page.getByRole("list", { name: "Barbers" });
const row = (page: Page, name: string) => list(page).getByRole("listitem").filter({ hasText: name });

async function avatarObjects() {
  const { data } = await admin.storage.from(BUCKET).list(`shops/${shop.id}/avatar`, { limit: 100 });
  return (data ?? []).map((f) => f.name);
}

/** Opens /b, picks Haircut and returns whether a Barber button with this name is offered. */
async function onBookingPage(page: Page, name: string) {
  await page.goto(`/b/${shop.slug}`);
  await page.getByRole("button", { name: /^Haircut\b/ }).first().click();
  await expect(page.getByRole("button", { name: /Carlos/ })).toBeVisible();
  return page.getByRole("button", { name: new RegExp(name) }).count();
}

test("the Owner adds Luis with a photo, he becomes bookable, then deletes him", async ({ page, browser }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await page.goto("/app/settings");
  await page.getByRole("link", { name: /Barbers/ }).click();
  await expect(page.getByRole("heading", { name: "Barbers", level: 1 })).toBeVisible();
  await expect(page.getByTestId("barber-count")).toContainText("1 of 6");

  // The Owner's own row says "You" and has no Delete.
  await expect(row(page, "Carlos Owner").getByText("You", { exact: true })).toBeVisible();
  await expect(row(page, "Carlos Owner").getByRole("button")).toHaveCount(0);

  // Add Luis: an empty name is refused calmly first.
  await page.getByRole("button", { name: "Add Barber" }).click();
  const sheet = page.getByRole("dialog", { name: "New Barber" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Add Barber" }).click();
  await expect(sheet.getByRole("alert")).toHaveText("Type the Barber's name.");
  await sheet.getByLabel("Name").fill("Luis");
  await sheet.getByTestId("photo-file-avatar").setInputFiles({ name: "luis.jpg", mimeType: "image/jpeg", buffer: await jpeg(page) });
  await expect(sheet.getByRole("group", { name: "Photo (optional)" }).getByRole("button", { name: "Change photo" })).toBeVisible({ timeout: 30_000 });
  const phone = sheet.getByLabel("Phone (optional)");
  await phone.fill("7185550123");
  await phone.blur();
  await expect(phone).toHaveValue("(718) 555-0123");
  await noSideways(page);
  await sheet.getByRole("button", { name: "Add Barber" }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByText("Luis added.", { exact: false })).toBeVisible();
  await expect(row(page, "Luis")).toContainText("Not bookable yet");
  await expect(row(page, "Luis").locator("img")).toHaveCount(1);
  await expect(page.getByTestId("barber-count")).toContainText("2 of 6");

  const [luis] = await sql<{ id: string; photo_url: string | null; phone_e164: string | null }[]>`
    select id, photo_url, phone_e164 from public.barbers where shop_id = ${shop.id} and display_name = 'Luis'`;
  expect(luis.phone_e164).toBe("+17185550123");
  expect(luis.photo_url).toContain(`/shops/${shop.id}/avatar/`);
  const file = luis.photo_url!.split("/").pop()!;
  expect(await avatarObjects()).toContain(file);

  // A price and hours (in SQL until the profile page): Luis is bookable and on /b, without his phone.
  await bookable(luis.id);
  await page.reload();
  await expect(row(page, "Luis")).not.toContainText("Not bookable yet");
  const client = await (await browser.newContext()).newPage();
  expect(await onBookingPage(client, "Luis")).toBe(1);
  const html = await client.content();
  expect(html).not.toContain("7185550123");
  expect(html).not.toContain("555-0123");

  // Delete Luis behind the confirm.
  await row(page, "Luis").getByRole("button", { name: "Delete Luis" }).click();
  const confirm = page.getByRole("dialog", { name: "Delete Luis?" });
  await expect(confirm).toContainText("all their past Bookings");
  await expect(confirm).toContainText("It can't be undone.");
  await confirm.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(confirm).toBeHidden();
  await expect(page.getByText("Luis deleted.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Barber" })).toBeFocused();
  await expect(row(page, "Luis")).toHaveCount(0);
  await expect(page.getByTestId("barber-count")).toContainText("1 of 6");
  expect(await sql`select 1 from public.barbers where id = ${luis.id}`).toHaveLength(0);
  await expect.poll(avatarObjects).not.toContain(file);
  expect(await onBookingPage(client, "Luis")).toBe(0);
  await client.context().close();
});

test("a Barber with a Booking tomorrow can't be deleted until it's cancelled", async ({ page }) => {
  const [m] = await sql<{ id: string }[]>`
    insert into public.barbers (shop_id, display_name, sort_order) values (${shop.id}, 'Marco', 1) returning id`;
  shop.marco = m.id;
  await bookable(m.id);
  const [c] = await sql<{ id: string }[]>`
    insert into public.clients (shop_id, name, phone_e164) values (${shop.id}, 'Ana Ruiz', '+13475551234') returning id`;
  const [{ at, day }] = await sql<{ at: Date; day: string }[]>`
    select (((now() at time zone 'America/New_York')::date + 1) + time '10:00') at time zone 'America/New_York' as at,
           ((now() at time zone 'America/New_York')::date + 1)::text as day`;
  const ends = new Date(at.getTime() + 30 * 60_000);
  await sql`
    insert into public.bookings (shop_id, barber_id, service_id, client_id, kind, status, starts_at, ends_at, blocked_until,
                                 price_cents, payment_method, payment_status)
    values (${shop.id}, ${m.id}, ${shop.cut}, ${c.id}, 'booking', 'confirmed', ${at}, ${ends}, ${ends}, 3000, 'in_person', 'unpaid')`;

  await signIn(page);
  await page.goto("/app/settings/barbers");
  await row(page, "Marco").getByRole("button", { name: "Delete Marco" }).click();
  await page.getByRole("dialog", { name: "Delete Marco?" }).getByRole("button", { name: "Delete", exact: true }).click();

  const blocked = page.getByRole("dialog", { name: "Marco has upcoming Bookings" });
  await expect(blocked).toBeVisible();
  const item = blocked.getByRole("list", { name: "Upcoming Bookings" }).getByRole("listitem");
  await expect(item).toHaveCount(1);
  await expect(item).toContainText("Ana Ruiz");
  await expect(item).toContainText("Haircut");
  await expect(item).toContainText("10:00");
  await expect(item.getByRole("link", { name: /^Move Ana Ruiz/ })).toHaveAttribute("href", `/app/day?date=${day}&barber=${m.id}`);
  await noSideways(page);

  // Cancel it with the Day view's confirm, then the delete goes through.
  await item.getByRole("button", { name: /^Cancel Ana Ruiz/ }).click();
  const cancel = page.getByRole("dialog", { name: "Cancel this booking?" });
  await expect(cancel).toContainText("nothing to refund");
  await cancel.getByRole("button", { name: "Cancel booking" }).click();
  const again = page.getByRole("dialog", { name: "Delete Marco?" });
  await expect(again).toContainText("No upcoming Bookings left.");
  await again.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(again).toBeHidden();
  await expect(row(page, "Marco")).toHaveCount(0);
});

test("at 6 Barbers, Add shows the limit instead of the sheet", async ({ page }) => {
  for (const name of ["Barber 2", "Barber 3", "Barber 4", "Barber 5", "Barber 6"]) {
    await sql`insert into public.barbers (shop_id, display_name, sort_order) values (${shop.id}, ${name}, 2)`;
  }
  await signIn(page);
  await page.goto("/app/settings/barbers");
  await expect(page.getByTestId("barber-count")).toContainText("6 of 6");
  await page.getByRole("button", { name: "Add Barber" }).click();
  await expect(page.getByText("A Shop can have up to 6 Barbers. Delete one to add someone new.")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "New Barber" })).toBeHidden();
  await noSideways(page);
});
