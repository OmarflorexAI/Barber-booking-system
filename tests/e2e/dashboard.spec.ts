import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

/**
 * The Owner Dashboard on a phone: this week's numbers against last week's from seeded
 * Bookings, the ‹ week › stepper, and a Barber kept out. Builds a throwaway Shop (random
 * slug, 45 minutes per manual booking) with its own sign-ins and deletes it afterwards.
 * Bookings are seeded relative to the real current New York week, since the page reads the clock.
 */
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, onnotice: () => {} });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TZ = "America/New_York";
const ids = { shop: "", cut: "", marisol: "", dario: "" };
const emails = { owner: "", barber: "" };
const userIds: string[] = [];
let phoneSeq = 0;

/** The local date `days` after `date` (YYYY-MM-DD). */
function plusDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
const thisMonday = plusDays(today, -((weekday + 6) % 7));
const lastMonday = plusDays(thisMonday, -7);

async function staffUser(label: string) {
  const email = `e2e-dash-${label}-${randomUUID().slice(0, 8)}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  return { id: data.user.id, email };
}

/** One Booking or Walk-in at `hour`:00 New York time on a local date. */
async function seed(barber: string, date: string, hour: number, kind: "booking" | "walk_in" = "booking", status = "confirmed") {
  let clientId: string | null = null;
  if (kind === "booking") {
    const [c] = await sql<{ id: string }[]>`
      insert into public.clients (shop_id, name, phone_e164) values (${ids.shop}, ${`Client ${phoneSeq}`}, ${`+1347556${String(1000 + phoneSeq++).padStart(4, "0")}`}) returning id`;
    clientId = c.id;
  }
  await sql`
    insert into public.bookings (shop_id, barber_id, service_id, client_id, kind, status, starts_at, ends_at, blocked_until,
                                 price_cents, payment_method, payment_status)
    select ${ids.shop}, ${barber}, ${ids.cut}, ${clientId}, ${kind}, ${status}, t, t + interval '30 minutes', t + interval '30 minutes',
           3500, 'in_person', 'unpaid'
    from (select (${date}::date + make_time(${hour}, 0, 0)) at time zone ${TZ} as t) x`;
}

test.beforeAll(async () => {
  const [s] = await sql<{ id: string }[]>`
    insert into public.shops (slug, name, phone, manual_booking_minutes)
    values (${`e2e-dash-${randomUUID().slice(0, 8)}`}, 'E2E Dashboard Shop', '+17185550197', 45) returning id`;
  ids.shop = s.id;
  const owner = await staffUser("owner");
  const barber = await staffUser("barber");
  emails.owner = owner.email;
  emails.barber = barber.email;
  await sql`insert into public.shop_members (shop_id, user_id, role) values (${ids.shop}, ${owner.id}, 'owner'), (${ids.shop}, ${barber.id}, 'barber')`;
  const [m] = await sql<{ id: string }[]>`insert into public.barbers (shop_id, display_name, sort_order) values (${ids.shop}, 'Marisol Peña', 0) returning id`;
  const [d] = await sql<{ id: string }[]>`
    insert into public.barbers (shop_id, user_id, display_name, sort_order) values (${ids.shop}, ${barber.id}, 'Dario Cruz', 1) returning id`;
  ids.marisol = m.id;
  ids.dario = d.id;
  const [sv] = await sql<{ id: string }[]>`
    insert into public.services (shop_id, name_en, name_es, duration_min, buffer_min, sort_order) values (${ids.shop}, 'Haircut', 'Corte', 30, 0, 0) returning id`;
  ids.cut = sv.id;

  // This week: 5 Bookings (one a no-show), 1 Walk-in. Time saved 5 × 45 = 3h 45m.
  await seed(ids.marisol, thisMonday, 10);
  await seed(ids.marisol, thisMonday, 11);
  await seed(ids.marisol, plusDays(thisMonday, 2), 10, "booking", "no_show");
  await seed(ids.dario, plusDays(thisMonday, 1), 10);
  await seed(ids.dario, plusDays(thisMonday, 1), 11);
  await seed(ids.dario, plusDays(thisMonday, 1), 12, "walk_in");
  // Last week: 2 Bookings, 1 Walk-in.
  await seed(ids.marisol, lastMonday, 10);
  await seed(ids.dario, plusDays(lastMonday, 3), 10);
  await seed(ids.dario, plusDays(lastMonday, 3), 11, "walk_in");
});

test.afterAll(async () => {
  if (ids.shop) await sql`delete from public.shops where id = ${ids.shop}`;
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
  await sql.end();
});

async function signIn(page: Page, email: string) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  await page.goto(`/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&next=/app/day`);
  await expect(page).toHaveURL(/\/app\/day/);
}

test("the Owner sees this week's numbers against last week", async ({ page }) => {
  await signIn(page, emails.owner);
  await page.goto("/app/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bookings this week" })).toBeVisible();
  await expect(page.getByTestId("stat-bookings")).toHaveText("5");
  await expect(page.getByText("+3 vs last week")).toBeVisible();
  await expect(page.getByTestId("stat-walkins")).toHaveText("1");
  await expect(page.getByText("Same as last week")).toBeVisible();
  await expect(page.getByTestId("stat-noshows")).toHaveText("1");
  await expect(page.getByTestId("stat-timesaved")).toHaveText("3h 45m");
  await expect(page.getByText("+2h 15m vs last week")).toBeVisible();
  await expect(page.getByText("No bookings this week yet.")).toHaveCount(0);

  // Per Barber in sort order, with their counts (the hidden "Bookings:" label is for screen readers).
  const rows = page.getByTestId("barber-row");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("Marisol Peña");
  await expect(rows.nth(0)).toContainText("3");
  await expect(rows.nth(1)).toContainText("Dario Cruz");
  await expect(rows.nth(1)).toContainText("1 walk-in");

  // The chart's numbers are in a table for screen readers: Monday has 2, Tuesday 2 + 1 walk-in.
  const table = page.getByRole("table", { name: "Bookings per day" });
  await expect(table.getByRole("row")).toHaveCount(8);
  await expect(table.getByRole("row").nth(2).getByRole("cell")).toHaveText(["2", "1"]);

  await page.setViewportSize({ width: 360, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test("a day's bar and a Barber's row open their drill-down", async ({ page }) => {
  await signIn(page, emails.owner);
  await page.goto("/app/dashboard");

  // Tuesday: Dario's 2 Bookings and 1 Walk-in; 2 × 45 min saved.
  const tuesday = page.getByRole("button", { name: /^2 Tue, Tuesday\b.*: 2 bookings, show details$/ });
  await tuesday.click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("heading", { level: 2 })).toContainText("Tuesday");
  await expect(sheet.getByTestId("drill-bookings")).toHaveText("2");
  await expect(sheet.getByTestId("drill-walkins")).toHaveText("1");
  await expect(sheet.getByTestId("drill-noshows")).toHaveText("0");
  await expect(sheet.getByTestId("drill-timesaved")).toHaveText("1h 30m");
  await expect(sheet.getByRole("table", { name: "By hour" })).toBeAttached();
  await expect(sheet.getByTestId("drill-barber").filter({ hasText: "Dario Cruz" })).toContainText("2 bookings · 1 walk-in");
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(tuesday).toBeFocused();

  // A Barber's row: their week's numbers.
  await page.getByTestId("barber-row").filter({ hasText: "Marisol Peña" }).getByRole("button").click();
  await expect(sheet).toBeVisible();
  await expect(sheet.getByTestId("drill-barber-bookings")).toHaveText("3");
  await expect(sheet.getByTestId("drill-barber-noshows")).toHaveText("1");
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toBeHidden();
});

test("the week stepper moves back a week and stops at this week", async ({ page }) => {
  await signIn(page, emails.owner);
  await page.goto("/app/dashboard");
  const range = page.getByTestId("week-range");
  const thisRange = (await range.textContent())!.trim();
  await expect(page.getByLabel("Next week")).toHaveAttribute("aria-disabled", "true");

  await page.getByRole("link", { name: "Previous week" }).click();
  await expect(page).toHaveURL(new RegExp(`/app/dashboard\\?week=${lastMonday}$`));
  await expect(range).not.toHaveText(thisRange);
  await expect(page.getByRole("heading", { name: "Bookings that week" })).toBeVisible();
  await expect(page.getByTestId("stat-bookings")).toHaveText("2");
  await expect(page.getByTestId("stat-timesaved")).toHaveText("1h 30m");

  // Two weeks back is empty: honest zeros and the booking-link nudge.
  await page.getByRole("link", { name: "Previous week" }).click();
  await expect(page.getByTestId("stat-bookings")).toHaveText("0");
  await expect(page.getByText("No bookings this week yet.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Share your booking link" })).toHaveAttribute("href", "/app/settings/link");

  await page.getByRole("link", { name: "Back to this week" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard$/);
  await expect(range).toHaveText(thisRange);

  // A future or non-Monday week falls back to this week.
  await page.goto(`/app/dashboard?week=${plusDays(thisMonday, 7)}`);
  await expect(range).toHaveText(thisRange);
  await page.goto(`/app/dashboard?week=${plusDays(lastMonday, 1)}`);
  await expect(range).toHaveText(thisRange);
});

test("a Barber is sent to their Day", async ({ page }) => {
  await signIn(page, emails.barber);
  await page.goto("/app/dashboard");
  await expect(page).toHaveURL(/\/app\/day/);
});

/**
 * Review screenshots, only on request: DASHBOARD_SHOTS=1 npx playwright test tests/e2e/dashboard.spec.ts
 * (or DASHBOARD_SHOTS=p2b to write into .impeccable/review/p2b instead of u2-d2).
 */
test("review screenshots", async ({ page, context }) => {
  test.skip(!process.env.DASHBOARD_SHOTS, "screenshots only on request");
  const dir = `.impeccable/review/${process.env.DASHBOARD_SHOTS === "1" ? "u2-d2" : process.env.DASHBOARD_SHOTS}`;
  await signIn(page, emails.owner);
  for (const theme of ["light", "dark"] as const) {
    await context.addCookies([{ name: "theme", value: theme, url: "http://localhost:3000" }]);
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.goto("/app/dashboard");
      await expect(page.getByTestId("barber-row").first()).toBeVisible();
      await page.waitForTimeout(1000); // let the bars finish growing in
      await page.screenshot({ path: `${dir}/dashboard-${width}-${theme}.png`, fullPage: true });
      // The drill-down sheets: Tuesday (the richest seeded day), then the first Barber.
      await page.getByRole("button", { name: /^2 Tue, Tuesday\b/ }).click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${dir}/day-sheet-${width}-${theme}.png` });
      await page.keyboard.press("Escape");
      await page.getByTestId("barber-row").first().getByRole("button").click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${dir}/barber-sheet-${width}-${theme}.png` });
      await page.keyboard.press("Escape");
    }
  }
});
