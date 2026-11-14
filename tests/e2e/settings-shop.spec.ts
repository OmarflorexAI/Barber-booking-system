import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

/**
 * PLAN.md M5 "Done when", on a phone: the Owner opens Settings → Shop profile, uploads a logo
 * and a cover, writes the About in English only and saves. A Client reading Spanish on /b then
 * sees the logo, the cover and the English About (Q35 fallback). The "This week" card's
 * Bookings number equals the Dashboard's. Replacing the cover deletes the old file. No
 * sideways scroll at 360px. Builds a throwaway Shop and deletes it, its user and its files.
 */
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, onnotice: () => {} });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const BUCKET = "shop-media";
const TZ = "America/New_York";
const ABOUT = "Family barbershop on Grand Concourse since 2009. Walk-ins welcome until 7.";

const shop = { id: "", slug: `e2e-shop-${randomUUID().slice(0, 8)}`, cut: "", barber: "" };
let ownerEmail = "";
const userIds: string[] = [];

function plusDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const thisMonday = plusDays(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7));

/** One Booking or Walk-in at `hour`:00 New York time on a local date. */
async function seed(date: string, hour: number, kind: "booking" | "walk_in", n: number) {
  let clientId: string | null = null;
  if (kind === "booking") {
    const [c] = await sql<{ id: string }[]>`
      insert into public.clients (shop_id, name, phone_e164)
      values (${shop.id}, ${`Client ${n}`}, ${`+1347557${String(1000 + n).padStart(4, "0")}`}) returning id`;
    clientId = c.id;
  }
  await sql`
    insert into public.bookings (shop_id, barber_id, service_id, client_id, kind, status, starts_at, ends_at, blocked_until,
                                 price_cents, payment_method, payment_status)
    select ${shop.id}, ${shop.barber}, ${shop.cut}, ${clientId}, ${kind}, 'confirmed', t, t + interval '30 minutes', t + interval '30 minutes',
           3500, 'in_person', 'unpaid'
    from (select (${date}::date + make_time(${hour}, 0, 0)) at time zone ${TZ} as t) x`;
}

test.beforeAll(async () => {
  const [s] = await sql<{ id: string }[]>`
    insert into public.shops (slug, name, phone, address, manual_booking_minutes)
    values (${shop.slug}, 'E2E Shop Profile', '+17185550198', '1 Test Ave, Bronx, NY', 4) returning id`;
  shop.id = s.id;
  ownerEmail = `e2e-shop-owner-${randomUUID().slice(0, 8)}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email: ownerEmail, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  await sql`insert into public.shop_members (shop_id, user_id, role) values (${shop.id}, ${data.user.id}, 'owner')`;
  const [svc] = await sql<{ id: string }[]>`
    insert into public.services (shop_id, name_en, name_es, duration_min, buffer_min, sort_order)
    values (${shop.id}, 'Haircut', 'Corte', 30, 0, 0) returning id`;
  shop.cut = svc.id;
  const [b] = await sql<{ id: string }[]>`
    insert into public.barbers (shop_id, display_name, sort_order) values (${shop.id}, 'Marisol', 0) returning id`;
  shop.barber = b.id;
  await seed(thisMonday, 10, "booking", 1);
  await seed(thisMonday, 11, "booking", 2);
  await seed(plusDays(thisMonday, 1), 10, "walk_in", 3);
});

test.afterAll(async () => {
  if (shop.id) {
    for (const kind of ["logo", "cover"]) {
      const prefix = `shops/${shop.id}/${kind}`;
      const { data } = await admin.storage.from(BUCKET).list(prefix, { limit: 100 });
      const paths = (data ?? []).map((f) => `${prefix}/${f.name}`);
      if (paths.length) await admin.storage.from(BUCKET).remove(paths);
    }
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

/** A 1600×900 JPEG drawn in the browser, like a phone photo; `shade` keeps each one different. */
async function jpeg(page: Page, shade: number): Promise<Buffer> {
  const b64 = await page.evaluate(async (shade) => {
    const c = document.createElement("canvas");
    c.width = 1600;
    c.height = 900;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 1600, 900);
    g.addColorStop(0, `rgb(${shade},${shade},${shade})`);
    g.addColorStop(1, "#c0c0c0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1600, 900);
    const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.9));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }, shade);
  return Buffer.from(b64, "base64");
}

async function storedCount(kind: "logo" | "cover") {
  const { data } = await admin.storage.from(BUCKET).list(`shops/${shop.id}/${kind}`, { limit: 100 });
  return (data ?? []).filter((f) => f.id).length;
}

test("the Owner sets the Shop's logo, cover and About, and a Spanish-reading Client sees them on /b", async ({ page, browser }) => {
  test.setTimeout(180_000);
  await signIn(page);
  await page.goto("/app/settings");
  await page.getByRole("link", { name: /Shop profile/ }).click();
  await expect(page).toHaveURL(/\/app\/settings\/shop$/);
  await expect(page.getByRole("heading", { name: "Shop profile", level: 1 })).toBeVisible();
  await expect(page.getByTestId("booking-url")).toContainText(`/b/${shop.slug}`);

  // Logo and cover, then the About in English only, saved with one button.
  await page.getByTestId("photo-file-logo").setInputFiles({ name: "logo.jpg", mimeType: "image/jpeg", buffer: await jpeg(page, 30) });
  await expect(page.getByRole("group", { name: "Logo" }).getByRole("img")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("photo-file-cover").setInputFiles({ name: "cover.jpg", mimeType: "image/jpeg", buffer: await jpeg(page, 80) });
  await expect(page.getByRole("group", { name: "Cover photo" }).getByRole("img")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Change photo" })).toHaveCount(2, { timeout: 30_000 });
  await page.getByLabel("About, in English").fill(ABOUT);
  await page.getByRole("button", { name: "Save Shop profile" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Shop profile saved." })).toBeVisible({ timeout: 15_000 });

  const [saved] = await sql<{ logo_url: string | null; cover_url: string | null; about_en: string; about_es: string; slug: string }[]>`
    select logo_url, cover_url, about_en, about_es, slug from public.shops where id = ${shop.id}`;
  expect(saved.about_en).toBe(ABOUT);
  expect(saved.about_es).toBe("");
  expect(saved.slug).toBe(shop.slug);
  expect(saved.logo_url).toMatch(/^https:\/\//);
  expect(saved.cover_url).toMatch(/^https:\/\//);

  // Replacing the cover and saving deletes the old file.
  await page.getByTestId("photo-file-cover").setInputFiles({ name: "cover2.jpg", mimeType: "image/jpeg", buffer: await jpeg(page, 140) });
  await expect.poll(() => storedCount("cover"), { timeout: 30_000 }).toBe(2);
  await page.getByRole("button", { name: "Save Shop profile" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Shop profile saved." })).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => storedCount("cover"), { timeout: 15_000 }).toBe(1);
  const [after] = await sql<{ cover_url: string }[]>`select cover_url from public.shops where id = ${shop.id}`;
  expect(after.cover_url).not.toBe(saved.cover_url);

  // "This week" Bookings equals the Dashboard's.
  await page.reload();
  const weekBookings = (await page.getByTestId("week-bookings").textContent())?.trim();
  expect(weekBookings).toBe("2");
  await expect(page.getByTestId("week-walkins")).toHaveText("1");

  // No sideways scroll at 360px.
  await page.setViewportSize({ width: 360, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

  await page.getByRole("link", { name: "Open Dashboard" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard$/);
  await expect(page.getByTestId("stat-bookings")).toHaveText(weekBookings!, { timeout: 10_000 });

  // A Client reading Spanish sees the logo, the cover and the English About on /b.
  const client = await browser.newContext({ ...test.info().project.use, locale: "es-US" });
  await client.addCookies([{ name: "lang", value: "es", url: test.info().project.use.baseURL ?? "http://localhost:3000" }]);
  const b = await client.newPage();
  await b.goto(`/b/${shop.slug}`);
  await expect(b.locator(`img[src="${saved.logo_url}"]`)).toHaveCount(1);
  await expect(b.locator(`img[src="${after.cover_url}"]`)).toHaveCount(1);
  await expect(b.getByText(ABOUT)).toBeVisible();
  await client.close();
});
