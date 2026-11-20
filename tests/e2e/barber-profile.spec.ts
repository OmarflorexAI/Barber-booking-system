import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

/**
 * PLAN.md M4 "Done when", on a phone: the Owner opens Luis's profile page and sets an English
 * bio only, Instagram "@luis.cuts", 3 work photos, Haircut at $30 and Mon–Fri 10:00–18:00. A
 * Client reading Spanish on /b then sees the English bio (Q35 fallback), the Instagram link, the
 * 3 photos, $30 and next Monday's first time at 10:00; Luis's phone is nowhere in the page. An
 * Instagram URL is refused and not saved. Builds a throwaway Shop and deletes it, its user and
 * its stored files.
 */
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, onnotice: () => {} });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const BUCKET = "shop-media";
const TZ = "America/New_York";
const BIO = "Fades and clean beard lines since 2015. Ask me about the skin fade.";

const shop = { id: "", slug: `e2e-prof-${randomUUID().slice(0, 8)}`, luis: "" };
let ownerEmail = "";
const userIds: string[] = [];

test.beforeAll(async () => {
  const [s] = await sql<{ id: string }[]>`
    insert into public.shops (slug, name, phone) values (${shop.slug}, 'E2E Profile Shop', '+17185550197') returning id`;
  shop.id = s.id;
  ownerEmail = `e2e-prof-owner-${randomUUID().slice(0, 8)}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email: ownerEmail, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  await sql`insert into public.shop_members (shop_id, user_id, role) values (${shop.id}, ${data.user.id}, 'owner')`;
  await sql`
    insert into public.services (shop_id, name_en, name_es, duration_min, buffer_min, sort_order)
    values (${shop.id}, 'Haircut', 'Corte', 30, 0, 0)`;
  // Luis: no price, no hours yet; an Owner-only phone that must never reach /b.
  const [l] = await sql<{ id: string }[]>`
    insert into public.barbers (shop_id, display_name, sort_order, phone_e164)
    values (${shop.id}, 'Luis', 0, '+17185550142') returning id`;
  shop.luis = l.id;
});

test.afterAll(async () => {
  if (shop.id) {
    for (const kind of ["avatar", "gallery"]) {
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

/** A 1200×900 JPEG drawn in the browser, like a phone photo; `shade` keeps each one different. */
async function jpeg(page: Page, shade: number): Promise<Buffer> {
  const b64 = await page.evaluate(async (shade) => {
    const c = document.createElement("canvas");
    c.width = 1200;
    c.height = 900;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 1200, 900);
    g.addColorStop(0, `rgb(${shade},${shade},${shade})`);
    g.addColorStop(1, "#c0c0c0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1200, 900);
    const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.9));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }, shade);
  return Buffer.from(b64, "base64");
}

/** Days from today (New York) to the next Monday: 1–7, never today. */
function daysToNextMonday() {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const wd = new Date(`${today}T12:00:00Z`).getUTCDay();
  return (1 - wd + 7) % 7 || 7;
}

test("the Owner fills in Luis's profile and a Spanish-reading Client sees it on /b", async ({ page, browser }) => {
  test.setTimeout(180_000);
  await signIn(page);
  await page.goto("/app/shop");
  await page.getByRole("link", { name: /Luis/ }).click();
  await expect(page).toHaveURL(new RegExp(`/app/settings/barbers/${shop.luis}$`));
  await expect(page.getByRole("heading", { name: "Luis", level: 1 })).toBeVisible();

  // Profile: English bio only, Instagram typed with the @.
  const profile = page.getByRole("region", { name: "Profile" });
  await profile.getByLabel("Bio in English").fill(BIO);
  await profile.getByLabel("Instagram (optional)").fill("@luis.cuts");
  await profile.getByRole("button", { name: "Save profile" }).click();
  await expect(profile.getByRole("status").filter({ hasText: "Profile saved." })).toBeVisible();
  const [saved] = await sql<{ bio: string; bio_es: string; instagram: string | null; phone_e164: string | null }[]>`
    select bio, bio_es, instagram, phone_e164 from public.barbers where id = ${shop.luis}`;
  expect(saved).toEqual({ bio: BIO, bio_es: "", instagram: "luis.cuts", phone_e164: "+17185550142" });

  // An Instagram link is refused with the calm notice and nothing is saved.
  const ig = profile.getByLabel("Instagram (optional)");
  await ig.fill("https://instagram.com/x");
  await profile.getByRole("button", { name: "Save profile" }).click();
  await expect(profile.getByRole("alert")).toContainText("Type only the Instagram handle");
  await expect(ig).toHaveAttribute("aria-invalid", "true");
  const [still] = await sql<{ instagram: string | null }[]>`select instagram from public.barbers where id = ${shop.luis}`;
  expect(still.instagram).toBe("luis.cuts");
  await page.reload();
  await expect(page.getByRole("region", { name: "Profile" }).getByLabel("Instagram (optional)")).toHaveValue("luis.cuts");

  // Work photos: three, each saved as it lands.
  const gallery = page.getByRole("region", { name: "Work photos" });
  for (let n = 1; n <= 3; n++) {
    await gallery.getByTestId("photo-file-gallery").setInputFiles({ name: `cut-${n}.jpg`, mimeType: "image/jpeg", buffer: await jpeg(page, 40 * n) });
    await expect(gallery.getByTestId("gallery-count")).toHaveText(`${n} of 6`, { timeout: 30_000 });
    await expect(gallery.getByRole("list", { name: "Work photos" }).getByRole("img")).toHaveCount(n);
  }
  await expect(gallery).not.toContainText("Add at least 3");
  await expect
    .poll(async () => (await sql`select 1 from public.barber_gallery where barber_id = ${shop.luis}`).length)
    .toBe(3);

  // Services & prices: Haircut on at $30.
  const haircut = page.getByRole("list", { name: "Services this Barber can offer" }).getByRole("listitem").filter({ hasText: "Haircut" });
  await haircut.getByRole("switch").click();
  await expect(haircut.getByRole("switch")).toBeChecked();
  await haircut.getByRole("textbox", { name: "Price", exact: true }).fill("30");
  await haircut.getByRole("button", { name: "Save", exact: true }).click();
  await expect(haircut.getByRole("status")).toHaveText("Haircut saved.");

  // Hours: Monday to Friday, 10:00 to 18:00.
  const week = page.getByRole("form", { name: "Weekly hours" });
  for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]) {
    const row = week.getByRole("listitem").filter({ has: page.getByRole("switch", { name: `Works on ${day}` }) });
    await row.getByRole("switch").click();
    await row.getByRole("combobox", { name: "From", exact: true }).selectOption("10:00");
    await row.getByRole("combobox", { name: "To", exact: true }).selectOption("18:00");
  }
  await week.getByRole("button", { name: "Save hours" }).click();
  await expect(week.getByRole("status")).toHaveText("Hours saved.");
  const hours = await sql<{ weekday: number; start_time: string; end_time: string }[]>`
    select weekday, start_time::text, end_time::text from public.weekly_hours where barber_id = ${shop.luis} order by weekday`;
  expect(hours.map((h) => `${h.weekday} ${h.start_time.slice(0, 5)}-${h.end_time.slice(0, 5)}`)).toEqual([
    "1 10:00-18:00",
    "2 10:00-18:00",
    "3 10:00-18:00",
    "4 10:00-18:00",
    "5 10:00-18:00",
  ]);

  // A Client reading Spanish.
  const ctx = await browser.newContext({ locale: "es-US" });
  await ctx.addCookies([{ name: "lang", value: "es", url: "http://localhost:3000" }]);
  const client = await ctx.newPage();
  await client.goto(`/b/${shop.slug}`);
  await expect(client.locator("html")).toHaveAttribute("lang", "es");
  const html = await client.content();
  expect(html).not.toContain("7185550142");
  expect(html).not.toContain("555-0142");

  await client.getByRole("button", { name: /^Corte\b/ }).first().click();
  const luisRow = client.getByRole("listitem").filter({ has: client.getByRole("button", { name: /Luis/ }) });
  await expect(luisRow).toContainText("$30");
  await luisRow.getByRole("button", { name: "Ver trabajos" }).click();
  const sheet = client.getByRole("dialog", { name: "Luis" });
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText(BIO);
  await expect(sheet.getByRole("link", { name: /luis\.cuts/ })).toHaveAttribute("href", "https://instagram.com/luis.cuts");
  await expect(sheet.getByRole("listitem").getByRole("img")).toHaveCount(3);
  await expect(sheet.getByRole("img", { name: "Trabajo de Luis, foto 3" })).toBeVisible();
  const book = sheet.getByRole("button", { name: /^Reservar con Luis/ });
  await expect(book).toContainText("$30");
  expect(await client.content()).not.toContain("555-0142");

  // Next Monday's first free time is 10:00, written the way the page writes times in Spanish.
  await book.click();
  await client.getByRole("tablist").getByRole("tab").nth(daysToNextMonday()).click();
  const ten = await client.evaluate(() =>
    new Date(Date.UTC(2000, 0, 1, 10, 0)).toLocaleTimeString("es-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit" }),
  );
  // The first time pill under the day parts (Mañana / Tarde / Noche), skipping the theme toggle.
  const firstSlot = client.locator("section:has(> h3) button[aria-pressed]").first();
  await expect(firstSlot).toHaveText(ten);
  await ctx.close();
});
