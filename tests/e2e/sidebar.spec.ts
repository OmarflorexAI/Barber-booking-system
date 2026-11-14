import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

/**
 * The staff app's collapsible sidebar (≥ 1024px): the button and the `[` shortcut collapse
 * it to an icon rail, the choice survives a reload with no flash (the state is on <html>
 * before the page's scripts run), and the hidden labels still name the links for screen
 * readers. The Owner's three items (Today · Dashboard · Settings) are all there is, even for
 * an Owner who cuts hair, and the retired /app/me lands on Settings. Builds a throwaway Shop
 * with one Owner (who is also its Barber) and deletes both afterwards.
 */
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, onnotice: () => {} });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let shopId = "";
let ownerId = "";
let ownerEmail = "";

test.beforeAll(async () => {
  const [s] = await sql<{ id: string }[]>`
    insert into public.shops (slug, name, phone) values (${`e2e-side-${randomUUID().slice(0, 8)}`}, 'E2E Sidebar Shop', '+17185550198') returning id`;
  shopId = s.id;
  ownerEmail = `e2e-side-owner-${randomUUID().slice(0, 8)}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email: ownerEmail, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  ownerId = data.user.id;
  await sql`insert into public.shop_members (shop_id, user_id, role) values (${shopId}, ${ownerId}, 'owner')`;
  // The Owner cuts hair too.
  await sql`insert into public.barbers (shop_id, user_id, display_name, sort_order) values (${shopId}, ${ownerId}, 'Carlos', 0)`;
});

test.afterAll(async () => {
  if (shopId) await sql`delete from public.shops where id = ${shopId}`;
  if (ownerId) await admin.auth.admin.deleteUser(ownerId);
  await sql.end();
});

async function signIn(page: Page) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: ownerEmail });
  if (error) throw error;
  await page.goto(`/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&next=/app/day`);
  await expect(page).toHaveURL(/\/app\/day/);
}

const OWNER_TABS = ["Today", "Dashboard", "Settings"];

const contentLeft = (page: Page) => page.locator(".shell-content").evaluate((el) => Math.round(el.getBoundingClientRect().left));

test.describe("desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });

  test("the sidebar collapses to a rail, persists with no flash, and keeps its labels", async ({ page, context }) => {
    // Record <html data-sidebar> the moment <body> is parsed: after the inline head script,
    // before any of the page's own scripts (React) can run.
    await page.addInitScript(() => {
      new MutationObserver((_, obs) => {
        if (document.body) {
          (window as unknown as { __sidebarAtBody: string | null }).__sidebarAtBody = document.documentElement.getAttribute("data-sidebar");
          obs.disconnect();
        }
      }).observe(document, { childList: true, subtree: true });
    });
    await signIn(page);

    const nav = page.getByRole("navigation", { name: "Main" });
    const hide = page.getByRole("button", { name: "Hide sidebar" });
    await expect(hide).toHaveAttribute("aria-expanded", "true");
    await expect(hide).toHaveAttribute("aria-controls", "app-sidebar");
    await expect.poll(() => contentLeft(page)).toBe(256);

    await hide.click();
    const show = page.getByRole("button", { name: "Show sidebar" });
    await expect(show).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("html")).toHaveAttribute("data-sidebar", "collapsed");
    await expect.poll(() => contentLeft(page)).toBe(72);
    expect((await context.cookies()).find((c) => c.name === "sidebar")?.value).toBe("collapsed");

    // Collapsed: the labels still name the links, and the rail shows a tooltip.
    const dashboard = nav.getByRole("link", { name: "Dashboard" });
    await expect(dashboard).toBeVisible();
    await expect(dashboard).toHaveAttribute("title", "Dashboard");
    // The rail is 72px: the sidebar's visible box ends there.
    await expect.poll(() => page.locator("#app-sidebar").evaluate((el) => getComputedStyle(el).clipPath)).toContain("184px");

    // Reload: collapsed from the first byte (the attribute is there before React runs).
    await page.reload();
    expect(await page.evaluate(() => (window as unknown as { __sidebarAtBody: string | null }).__sidebarAtBody)).toBe("collapsed");
    await expect(page.getByRole("button", { name: "Show sidebar" })).toHaveAttribute("aria-expanded", "false");
    await expect.poll(() => contentLeft(page)).toBe(72);

    // `[` toggles it back; typing `[` in a field does nothing.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("[");
    await expect(page.locator("html")).toHaveAttribute("data-sidebar", "expanded");
    await expect(page.getByRole("button", { name: "Hide sidebar" })).toHaveAttribute("aria-expanded", "true");
    await expect.poll(() => contentLeft(page)).toBe(256);
    await expect(nav.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("title", /.*/);

    await page.evaluate(() => {
      const input = document.createElement("input");
      input.id = "e2e-typing";
      document.body.append(input);
    });
    await page.locator("#e2e-typing").fill("");
    await page.locator("#e2e-typing").press("[");
    await expect(page.locator("#e2e-typing")).toHaveValue("[");
    await expect(page.locator("html")).toHaveAttribute("data-sidebar", "expanded");

    // Collapsed, the language pill gives way to a two-letter square that still switches.
    await page.getByRole("button", { name: "Hide sidebar" }).click();
    const aside = page.locator("#app-sidebar");
    const compact = aside.getByRole("button", { name: "ES · Español", exact: true });
    await expect(compact).toHaveCount(1);
    await expect(compact).toBeVisible();
    await expect(compact).toHaveText("ES");
    expect(await compact.evaluate((el) => el.getBoundingClientRect().right)).toBeLessThanOrEqual(72);
    // Keyboard, not a click: in dev the Next indicator covers the bottom-left corner.
    await compact.focus();
    await page.keyboard.press("Enter");
    await expect(aside.getByRole("button", { name: "EN · English", exact: true })).toHaveText("EN");
    await expect(page.getByRole("button", { name: "Mostrar menú lateral" })).toBeVisible();
  });

  test("the sidebar holds exactly the Owner's three items", async ({ page }) => {
    await signIn(page);
    const links = page.getByRole("navigation", { name: "Main" }).getByRole("link");
    await expect(links).toHaveText(OWNER_TABS);
  });

  test("Spanish names the button", async ({ page, context }) => {
    await context.addCookies([{ name: "lang", value: "es", url: "http://localhost:3000" }]);
    await signIn(page);
    await expect(page.getByRole("button", { name: "Ocultar menú lateral" })).toBeVisible();
  });

  /** Review screenshots, only on request: SIDEBAR_SHOTS=1 npx playwright test tests/e2e/sidebar.spec.ts */
  test("review screenshots (desktop)", async ({ page, context }) => {
    test.skip(!process.env.SIDEBAR_SHOTS, "screenshots only on request");
    await context.addCookies([{ name: "theme", value: "light", url: "http://localhost:3000" }]);
    await signIn(page);
    for (const state of ["expanded", "collapsed"] as const) {
      await context.addCookies([{ name: "sidebar", value: state, url: "http://localhost:3000" }]);
      await page.goto("/app/dashboard");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForTimeout(700);
      await page.screenshot({ path: `.impeccable/review/p1/sidebar-1440-light-${state}.png` });
    }
  });
});

test("the phone tab bar holds exactly the Owner's three tabs, and /app/me lands on Settings", async ({ page, context }) => {
  await signIn(page);
  const tabs = page.getByRole("navigation", { name: "Main" }).getByRole("link");
  await expect(tabs).toHaveText(OWNER_TABS);
  // The Owner who cuts hair still has a column on Today.
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();

  await page.goto("/app/me");
  await expect(page).toHaveURL(/\/app\/settings$/);
  await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();

  await context.addCookies([{ name: "lang", value: "es", url: "http://localhost:3000" }]);
  await page.goto("/app/day");
  await expect(page.getByRole("navigation", { name: "Principal" }).getByRole("link")).toHaveText(["Hoy", "Resumen", "Ajustes"]);
});

test("review screenshots (phone tab bar)", async ({ page, context }) => {
  test.skip(!process.env.SIDEBAR_SHOTS, "screenshots only on request");
  await context.addCookies([{ name: "theme", value: "light", url: "http://localhost:3000" }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({ path: ".impeccable/review/p1/tabbar-390-light.png" });
});
