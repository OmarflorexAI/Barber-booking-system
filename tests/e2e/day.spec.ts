import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

/**
 * The staff day view (/app/day) on a phone: a Barber's own Day with the now line, marking
 * arrived, adding a Walk-in, moving and cancelling a Booking, and the Owner's Today with
 * Barber filter chips. Builds a throwaway Shop (random slug) and its own sign-ins (magic
 * links minted with the service role), and deletes all of it afterwards.
 */
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, onnotice: () => {} });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const MIN = 60_000;
const TZ = "America/New_York";

const ids = { shop: "", carlos: "", dre: "", luis: "", cut: "", beard: "" };
const emails = { owner: "", dre: "" };
const userIds: string[] = [];
const bookingIds: Record<string, string> = {};
let phoneSeq = 0;

/** Local midnight in New York for the instant's date. */
function nyDayStart(at: Date): Date {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  for (const off of [-4, -5]) {
    const d = new Date(`${date}T00:00:00${off === -4 ? "-04:00" : "-05:00"}`);
    if (new Intl.DateTimeFormat("en-CA", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(d) === "00") return d;
  }
  return new Date(`${date}T00:00:00-05:00`);
}

async function staffUser(label: string) {
  const email = `e2e-day-${label}-${randomUUID().slice(0, 8)}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  userIds.push(data.user.id);
  return { id: data.user.id, email };
}

async function booking(
  key: string,
  o: { barber: string; client?: string; at: Date; status?: string; kind?: "booking" | "walk_in"; paid?: boolean; fresh?: boolean; service?: string },
) {
  let clientId: string | null = null;
  if (o.kind !== "walk_in") {
    const [c] = await sql<{ id: string }[]>`
      insert into public.clients (shop_id, name, phone_e164) values (${ids.shop}, ${o.client!}, ${`+1347555${String(1000 + phoneSeq++).padStart(4, "0")}`}) returning id`;
    clientId = c.id;
  }
  const status = o.status ?? "confirmed";
  const ends = new Date(o.at.getTime() + 30 * MIN);
  const [b] = await sql<{ id: string }[]>`
    insert into public.bookings (shop_id, barber_id, service_id, client_id, kind, status, starts_at, ends_at, blocked_until,
                                 price_cents, payment_method, payment_status, hold_expires_at, created_at)
    values (${ids.shop}, ${o.barber}, ${o.service ?? ids.cut}, ${clientId}, ${o.kind ?? "booking"}, ${status}, ${o.at}, ${ends}, ${ends},
            3500, ${o.paid ? "online" : "in_person"}, ${o.paid ? "paid" : "unpaid"},
            ${status === "pending_payment" ? new Date(Date.now() + 10 * MIN) : null},
            ${o.fresh ? new Date() : new Date(Date.now() - 24 * 60 * MIN)})
    returning id`;
  bookingIds[key] = b.id;
}

test.beforeAll(async () => {
  const [s] = await sql<{ id: string }[]>`
    insert into public.shops (slug, name, phone, sms_enabled) values (${`e2e-day-${randomUUID().slice(0, 8)}`}, 'E2E Day Shop', '+17185550199', true) returning id`;
  ids.shop = s.id;
  const barber = async (name: string, sort: number) => {
    const [b] = await sql<{ id: string }[]>`insert into public.barbers (shop_id, display_name, sort_order) values (${ids.shop}, ${name}, ${sort}) returning id`;
    for (let wd = 0; wd < 7; wd++) {
      await sql`insert into public.weekly_hours (shop_id, barber_id, weekday, start_time, end_time) values (${ids.shop}, ${b.id}, ${wd}, '08:00', '22:00')`;
    }
    return b.id;
  };
  ids.carlos = await barber("Carlos", 0);
  ids.dre = await barber("Dre", 1);
  ids.luis = await barber("Luis", 2);
  const service = async (en: string, es: string, sort: number) => {
    const [sv] = await sql<{ id: string }[]>`
      insert into public.services (shop_id, name_en, name_es, duration_min, buffer_min, sort_order) values (${ids.shop}, ${en}, ${es}, 30, 0, ${sort}) returning id`;
    for (const b of [ids.carlos, ids.dre, ids.luis]) {
      await sql`insert into public.barber_services (shop_id, barber_id, service_id, price_cents) values (${ids.shop}, ${b}, ${sv.id}, 3500)`;
    }
    return sv.id;
  };
  ids.cut = await service("Haircut", "Corte", 0);
  ids.beard = await service("Beard trim", "Barba", 1);

  // The Owner cuts hair as Carlos; Dre is a Barber.
  const owner = await staffUser("owner");
  const dre = await staffUser("dre");
  emails.owner = owner.email;
  emails.dre = dre.email;
  await sql`insert into public.shop_members (shop_id, user_id, role) values (${ids.shop}, ${owner.id}, 'owner'), (${ids.shop}, ${dre.id}, 'barber')`;
  await sql`update public.barbers set user_id = ${owner.id} where id = ${ids.carlos}`;
  await sql`update public.barbers set user_id = ${dre.id} where id = ${ids.dre}`;

  // Today's Bookings around now (kept inside today's New York date), on the 5-minute grid.
  const now = Date.now();
  const day = nyDayStart(new Date(now)).getTime();
  const anchor = Math.floor(Math.min(Math.max(now, day + 4 * 60 * MIN), day + 19 * 60 * MIN) / (5 * MIN)) * 5 * MIN;
  const at = (m: number) => new Date(anchor + m * MIN);
  await booking("walkin", { barber: ids.dre, kind: "walk_in", status: "arrived", at: at(-210) });
  await booking("past", { barber: ids.dre, client: "Rafa Gomez", at: at(-150) });
  await booking("arrived", { barber: ids.dre, client: "Luz Mejia", at: at(-90), status: "arrived", paid: true });
  await booking("maria", { barber: ids.dre, client: "Maria Lopez", at: at(40), fresh: true });
  await booking("kevin", { barber: ids.dre, client: "Kevin Diaz", at: at(100), paid: true });
  await booking("ana", { barber: ids.dre, client: "Ana Ruiz", at: at(160) });
  await booking("jay", { barber: ids.dre, client: "Jay Park", at: at(220), status: "pending_payment", paid: false });
  await booking("tom", { barber: ids.carlos, client: "Tom Rivera", at: at(60) });
  await booking("ben", { barber: ids.luis, client: "Ben Ortiz", at: at(30) });
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

const row = (page: Page, name: string) => page.locator("ol").getByRole("button", { name: new RegExp(name) });

test("a Barber sees only their own day, the tags and the now line", async ({ page }) => {
  await signIn(page, emails.dre);
  await expect(page.getByRole("heading", { name: "Day", exact: true })).toBeVisible();
  for (const name of ["Maria Lopez", "Kevin Diaz", "Ana Ruiz", "Rafa Gomez", "Luz Mejia"]) await expect(row(page, name)).toBeVisible();
  await expect(page.locator("ol").getByText("Walk-in")).toBeVisible();
  await expect(page.getByText("Tom Rivera")).toHaveCount(0);
  await expect(page.getByText("Ben Ortiz")).toHaveCount(0);
  // Held for payment: shown, but no actions.
  await expect(page.getByText("Jay Park")).toBeVisible();
  await expect(page.getByText("Awaiting payment")).toBeVisible();
  await expect(row(page, "Jay Park")).toHaveCount(0);
  await expect(page.locator("ol").getByText("Paid online").first()).toBeVisible();
  await expect(page.getByTestId("now-line")).toBeVisible();
  await expect(page.getByRole("img", { name: "New booking" })).toHaveCount(1);
  // The old header's sign-out and Telegram button are gone from this page.
  await expect(page.getByRole("button", { name: /Telegram/ })).toHaveCount(0);
  await page.setViewportSize({ width: 360, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test("mark a Booking arrived from its sheet", async ({ page }) => {
  await signIn(page, emails.dre);
  await row(page, "Maria Lopez").click();
  const sheet = page.getByRole("dialog", { name: "Maria Lopez" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("link", { name: /Call \(347\)/ })).toHaveAttribute("href", /^tel:\+1347/);
  await sheet.getByRole("button", { name: "Arrived" }).click();
  await expect(sheet.getByRole("button", { name: "Arrived" })).toHaveAttribute("aria-pressed", "true");
  await expect(sheet.getByText("Arrived and no-show bookings can't be moved or cancelled.")).toBeVisible();
  const [b] = await sql<{ status: string }[]>`select status from public.bookings where id = ${bookingIds.maria}`;
  expect(b.status).toBe("arrived");
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(row(page, "Maria Lopez").getByText("Arrived")).toBeVisible();
});

test("add a walk-in from the big button", async ({ page }) => {
  await signIn(page, emails.dre);
  await page.getByRole("button", { name: "Add walk-in" }).click();
  const sheet = page.getByRole("dialog", { name: "Add a walk-in" });
  await expect(sheet).toBeVisible();
  await sheet.getByText("Beard trim").click();
  await sheet.getByRole("button", { name: "Add walk-in" }).click();
  await expect(sheet).toBeHidden();
  await expect.poll(async () => (await sql`select 1 from public.bookings where barber_id = ${ids.dre} and kind = 'walk_in' and service_id = ${ids.beard}`).length).toBe(1);
  await expect(page.locator("ol").getByText("Beard trim")).toBeVisible();
});

test("move a Booking to another time", async ({ page }) => {
  await signIn(page, emails.dre);
  await row(page, "Kevin Diaz").click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: "Move" }).click();
  await expect(sheet.getByRole("heading", { name: "Pick a new time" })).toBeVisible();
  await expect(sheet.getByText("The client is told the new time.")).toBeVisible();
  await expect(sheet.getByText("Their online payment stays with the booking.")).toBeVisible();
  // Tomorrow always has free times (08:00–22:00).
  await sheet.getByRole("tab").nth(1).click();
  await sheet.getByRole("button", { name: /^\d{1,2}:\d{2}/ }).first().click();
  await sheet.getByRole("button", { name: /^Move to / }).click();
  await expect(page.getByText("Booking moved.")).toBeVisible();
  const [b] = await sql<{ starts_at: Date; payment_status: string }[]>`select starts_at, payment_status from public.bookings where id = ${bookingIds.kevin}`;
  expect(b.starts_at.getTime()).toBeGreaterThan(nyDayStart(new Date()).getTime() + 24 * 60 * MIN - 2 * 60 * MIN);
  expect(b.payment_status).toBe("paid");
  await expect(row(page, "Kevin Diaz")).toHaveCount(0);
});

test("cancel asks first and says what the Client is told", async ({ page }) => {
  await signIn(page, emails.dre);
  await row(page, "Ana Ruiz").click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: "Cancel booking" }).click();
  await expect(sheet.getByRole("heading", { name: "Cancel this booking?" })).toBeVisible();
  await expect(sheet.getByText("The client is told it's cancelled.")).toBeVisible();
  await expect(sheet.getByText("They haven't paid, so there's nothing to refund.")).toBeVisible();
  // "Keep it" goes back and changes nothing.
  await sheet.getByRole("button", { name: "Keep it" }).click();
  await expect(sheet.getByRole("button", { name: "Move" })).toBeVisible();
  await sheet.getByRole("button", { name: "Cancel booking" }).click();
  await sheet.getByRole("button", { name: "Cancel booking" }).click();
  await expect(page.getByText("Booking cancelled.")).toBeVisible();
  await expect(row(page, "Ana Ruiz")).toHaveCount(0);
  const [b] = await sql<{ status: string; cancelled_by: string }[]>`select status, cancelled_by from public.bookings where id = ${bookingIds.ana}`;
  expect(b).toEqual({ status: "cancelled", cancelled_by: "barber" });
  const out = await sql<{ type: string }[]>`select type from public.outbox where booking_id = ${bookingIds.ana}`;
  expect(out.map((o) => o.type)).toContain("sms_cancelled");
});

test("undo a mistaken arrived, and remove a walk-in logged by mistake", async ({ page }) => {
  await signIn(page, emails.dre);
  await row(page, "Rafa Gomez").click();
  const sheet = page.getByRole("dialog", { name: "Rafa Gomez" });
  await sheet.getByRole("button", { name: "Arrived" }).click();
  await expect(sheet.getByRole("button", { name: "Arrived" })).toHaveAttribute("aria-pressed", "true");
  await sheet.getByRole("button", { name: "Undo" }).click();
  await expect(sheet.getByRole("button", { name: "Arrived" })).toHaveAttribute("aria-pressed", "false");
  await expect(sheet.getByRole("button", { name: "Undo" })).toHaveCount(0);
  await expect(sheet.getByRole("button", { name: "Move" })).toBeEnabled();
  const [b] = await sql<{ status: string }[]>`select status from public.bookings where id = ${bookingIds.past}`;
  expect(b.status).toBe("confirmed");
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();

  await page.locator(`ol [data-row="${bookingIds.walkin}"] button`).click();
  const walkIn = page.getByRole("dialog", { name: "Walk-in" });
  await walkIn.getByRole("button", { name: "Remove walk-in" }).click();
  await expect(walkIn.getByRole("heading", { name: "Remove this walk-in?" })).toBeVisible();
  await walkIn.getByRole("button", { name: "Remove walk-in" }).click();
  await expect(page.getByText("Walk-in removed.")).toBeVisible();
  await expect(page.locator(`ol [data-row="${bookingIds.walkin}"]`)).toHaveCount(0);
  const [w] = await sql<{ status: string; cancelled_by: string }[]>`select status, cancelled_by from public.bookings where id = ${bookingIds.walkin}`;
  expect(w).toEqual({ status: "cancelled", cancelled_by: "barber" });
  expect((await sql`select 1 from public.outbox where booking_id = ${bookingIds.walkin}`).length).toBe(0);
});

test("the Owner's Today lists every Barber and filters by chip", async ({ page }) => {
  await signIn(page, emails.owner);
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  const chips = page.getByRole("navigation", { name: "Show bookings for" });
  for (const name of ["All", "Carlos", "Dre", "Luis"]) await expect(chips.getByRole("link", { name, exact: true })).toBeVisible();
  for (const name of ["Tom Rivera", "Ben Ortiz", "Rafa Gomez"]) await expect(row(page, name)).toBeVisible();
  // With "All", each row names its Barber.
  await expect(row(page, "Ben Ortiz").getByText("Luis")).toBeVisible();

  await chips.getByRole("link", { name: "Luis", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`barber=${ids.luis}`));
  await expect(row(page, "Ben Ortiz")).toBeVisible();
  await expect(row(page, "Tom Rivera")).toHaveCount(0);
  await expect(row(page, "Rafa Gomez")).toHaveCount(0);

  // The Owner can act for any Barber: open Luis's Booking.
  await row(page, "Ben Ortiz").click();
  await expect(page.getByRole("dialog", { name: "Ben Ortiz" }).getByRole("button", { name: "Arrived" })).toBeEnabled();
});
