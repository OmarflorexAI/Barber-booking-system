import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

/**
 * Owner Settings → Services & prices on a phone: add "Fade" 45 min, give the Barber a price
 * (straight in SQL until the Barber profile has prices) so it shows on /b, edit it to 30 min,
 * an off-grid duration refused with a notice, reorder, archive behind a confirm. Builds a
 * throwaway Shop (random slug) with one Owner sign-in and one Barber, and deletes it afterwards.
 */
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, onnotice: () => {} });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const shop = { id: "", slug: `e2e-svc-${randomUUID().slice(0, 8)}`, barber: "" };
let ownerEmail = "";
const userIds: string[] = [];

test.beforeAll(async () => {
  const [s] = await sql<{ id: string }[]>`
    insert into public.shops (slug, name, phone) values (${shop.slug}, 'E2E Services Shop', '+17185550197') returning id`;
  shop.id = s.id;
  ownerEmail = `e2e-svc-owner-${randomUUID().slice(0, 8)}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email: ownerEmail, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  await sql`insert into public.shop_members (shop_id, user_id, role) values (${shop.id}, ${data.user.id}, 'owner')`;
  const [b] = await sql<{ id: string }[]>`
    insert into public.barbers (shop_id, display_name, sort_order) values (${shop.id}, 'Dre Santos', 0) returning id`;
  shop.barber = b.id;
  for (let wd = 0; wd < 7; wd++) {
    await sql`
      insert into public.weekly_hours (shop_id, barber_id, weekday, start_time, end_time)
      values (${shop.id}, ${b.id}, ${wd}, '09:00', '19:00')`;
  }
  // One Service already there, so reorder has something to move past.
  const [cut] = await sql<{ id: string }[]>`
    insert into public.services (shop_id, name_en, name_es, duration_min, buffer_min, sort_order)
    values (${shop.id}, 'Haircut', 'Corte', 30, 0, 0) returning id`;
  await sql`insert into public.barber_services (shop_id, barber_id, service_id, price_cents) values (${shop.id}, ${b.id}, ${cut.id}, 3000)`;
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

const rowNames = (page: Page) =>
  page.getByRole("list", { name: "Services" }).getByRole("button", { name: /^Edit / });

test("the Owner adds, edits, reorders and archives a Service", async ({ page }) => {
  await signIn(page, ownerEmail);
  await page.goto("/app/settings");
  await page.getByRole("link", { name: /Services & prices/ }).click();
  await expect(page.getByRole("heading", { name: "Services & prices" })).toBeVisible();
  await expect(page.getByText("Prices are set per Barber, on each Barber's profile.")).toBeVisible();

  // Add "Fade", 45 min.
  await page.getByRole("button", { name: "Add Service" }).click();
  const sheet = page.getByRole("dialog", { name: "New Service" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Save Service" }).click();
  await expect(sheet.getByRole("alert")).toContainText("Type the Service's name in English.");
  await sheet.getByLabel("Name in English").fill("Fade");
  await sheet.getByLabel("Name in Spanish (optional)").fill("Degradado");
  await sheet.getByLabel("How long it takes").selectOption({ label: "45 min" });
  await sheet.getByRole("button", { name: "Save Service" }).click();
  await expect(sheet).toBeHidden();
  const fadeRow = page.getByRole("button", { name: "Edit Fade" });
  await expect(fadeRow).toContainText("45 min");
  const [fade] = await sql<{ id: string; name_es: string; duration_min: number }[]>`
    select id, name_es, duration_min from public.services where shop_id = ${shop.id} and name_en = 'Fade'`;
  expect(fade).toMatchObject({ name_es: "Degradado", duration_min: 45 });
  await noSideways(page);

  // With a price for the Barber (Barber prices UI comes later), Clients see it on /b.
  await sql`insert into public.barber_services (shop_id, barber_id, service_id, price_cents) values (${shop.id}, ${shop.barber}, ${fade.id}, 3500)`;
  const client = await page.context().newPage();
  await client.goto(`/b/${shop.slug}`);
  await expect(client.getByRole("button", { name: /^Fade\b/ })).toBeVisible();

  // Edit to 30 min.
  await fadeRow.click();
  const edit = page.getByRole("dialog", { name: "Edit Service" });
  await expect(edit.getByLabel("Name in English")).toHaveValue("Fade");
  await edit.getByLabel("How long it takes").selectOption({ label: "30 min" });
  await edit.getByRole("button", { name: "Save Service" }).click();
  await expect(edit).toBeHidden();
  await expect(fadeRow).toContainText("30 min");

  // A duration off the 15-minute grid isn't offered, and a forged one is refused with a notice.
  await fadeRow.click();
  const duration = edit.getByLabel("How long it takes");
  await expect(duration.locator("option[value='20']")).toHaveCount(0);
  await duration.evaluate((el: HTMLSelectElement) => el.add(new Option("20 min", "20")));
  await duration.selectOption("20");
  await edit.getByRole("button", { name: "Save Service" }).click();
  await expect(edit.getByRole("alert")).toContainText("15-minute steps");
  await expect(edit.getByLabel("Name in English")).toHaveValue("Fade");
  await edit.getByRole("button", { name: "Close" }).click();
  await expect(edit).toBeHidden();
  const [still] = await sql<{ duration_min: number }[]>`select duration_min from public.services where id = ${fade.id}`;
  expect(still.duration_min).toBe(30);

  // Reorder: Fade moves above Haircut, and stays there after a reload.
  await expect(rowNames(page)).toHaveText([/Haircut/, /Fade/]);
  await expect(page.getByRole("button", { name: "Move Haircut up" })).toBeDisabled();
  await page.getByRole("button", { name: "Move Fade up" }).click();
  await expect(page.getByRole("status")).toContainText("Fade is now 1 of 2.");
  await expect(async () => {
    const rows = await sql<{ name_en: string }[]>`select name_en from public.services where shop_id = ${shop.id} order by sort_order`;
    expect(rows.map((r) => r.name_en)).toEqual(["Fade", "Haircut"]);
  }).toPass();
  await page.reload();
  await expect(rowNames(page)).toHaveText([/Fade/, /Haircut/]);

  await page.getByRole("button", { name: "Edit Fade" }).click();
  const sheetAny = page.getByRole("dialog");
  await sheetAny.getByRole("button", { name: "Archive Service" }).click();
  await expect(sheetAny.getByText(/^Archive Fade\? Clients won't be able to book it anymore/)).toBeVisible();
  await sheetAny.getByRole("button", { name: "Keep it" }).click();
  await expect(sheetAny.getByRole("button", { name: "Save Service" })).toBeVisible();
  await sheetAny.getByRole("button", { name: "Archive Service" }).click();
  await sheetAny.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(sheetAny).toBeHidden();
  await expect(page.getByRole("button", { name: "Edit Fade" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit Haircut" })).toBeVisible();
  await client.reload();
  await expect(client.getByRole("button", { name: /^Haircut\b/ })).toBeVisible();
  await expect(client.getByRole("button", { name: /^Fade\b/ })).toHaveCount(0);
  await noSideways(page);
});

test("in Spanish the list uses the Spanish name and the empty state offers Add", async ({ page, context }) => {
  await sql`update public.services set active = false where shop_id = ${shop.id}`;
  await context.addCookies([{ name: "lang", value: "es", url: "http://localhost:3000" }]);
  await signIn(page, ownerEmail);
  await page.goto("/app/settings/services");
  await expect(page.getByRole("heading", { name: "Servicios y precios" })).toBeVisible();
  await expect(page.getByText("Todavía no hay servicios.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Agregar servicio" }).click();
  const sheet = page.getByRole("dialog", { name: "Nuevo servicio" });
  await sheet.getByLabel("Nombre en inglés", { exact: true }).fill("Beard trim");
  await sheet.getByLabel("Nombre en español (opcional)").fill("Arreglo de barba");
  await sheet.getByLabel("Cuánto dura").selectOption({ label: "15 min" });
  await sheet.getByLabel("Tiempo para limpiar después").selectOption({ label: "5 min" });
  await sheet.getByRole("button", { name: "Guardar servicio" }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByRole("button", { name: "Editar Arreglo de barba" })).toContainText("+ 5 min de limpieza");
  await noSideways(page);
});
