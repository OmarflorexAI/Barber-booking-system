// Screenshots of the staff app (Today, Dashboard, Settings) for demos.
// Needs `npm run dev` running and a staff login on demo-shop (npm run staff:add).
//
//   node --env-file=.env.local scripts/dashboard-shots.mjs <email> <out dir> [locales] [themes]
//   e.g. ... shots-owner@test.invalid docs/screenshots/dashboard-2026-11-18/before en light,dark
//
// Signs in without email through the admin magic link, then shoots each screen on a
// phone (Pixel 7 width) and a desktop viewport.
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const [email, outArg, localesArg = "en,es", themesArg = "light,dark"] = process.argv.slice(2);
if (!email || !outArg) {
  console.error("Usage: node --env-file=.env.local scripts/dashboard-shots.mjs <email> <out dir> [en,es] [light,dark]");
  process.exit(1);
}
const base = process.env.SITE ?? "http://localhost:3000";
const out = resolve(outArg);
await mkdir(out, { recursive: true });

// Demo data lives in the weeks of Nov 2 and Nov 9, 2026.
const DAY = process.env.SHOTS_DAY ?? "2026-11-12";
const WEEK = process.env.SHOTS_WEEK ?? "2026-11-09";
const screens = [
  { name: "today", path: `/app/day?date=${DAY}` },
  { name: "dashboard", path: `/app/dashboard?week=${WEEK}` },
  { name: "settings", path: "/app/settings" },
];
const devices = [
  { name: "phone", viewport: { width: 412, height: 915 }, scale: 2, isMobile: true, hasTouch: true },
  { name: "desktop", viewport: { width: 1440, height: 900 }, scale: 1, isMobile: false, hasTouch: false },
];

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const hideDevBadge = (page) => page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => e.remove()));

const browser = await chromium.launch();

// Sign in once and reuse the session cookies everywhere.
const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
if (error) throw error;
const signIn = await browser.newContext();
const p = await signIn.newPage();
p.setDefaultTimeout(180_000); // the dev server compiles each route on first visit
await p.goto(`${base}/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&next=/app/day`, {
  waitUntil: "commit",
});
await p.waitForURL(/\/app\//, { waitUntil: "domcontentloaded" });
const session = await signIn.storageState();
await signIn.close();

const host = new URL(base).hostname;
for (const locale of localesArg.split(",")) {
  for (const theme of themesArg.split(",")) {
    for (const d of devices) {
      const ctx = await browser.newContext({
        storageState: session,
        viewport: d.viewport,
        deviceScaleFactor: d.scale,
        isMobile: d.isMobile,
        hasTouch: d.hasTouch,
        locale: locale === "es" ? "es-US" : "en-US",
        colorScheme: theme,
        reducedMotion: "reduce",
      });
      await ctx.addCookies([
        { name: "lang", value: locale, domain: host, path: "/" },
        { name: "theme", value: theme, domain: host, path: "/" },
      ]);
      const page = await ctx.newPage();
      page.setDefaultTimeout(180_000);
      for (const s of screens) {
        await page.goto(`${base}${s.path}`, { waitUntil: "domcontentloaded" });
        // Wait for the streamed content to replace the skeletons.
        await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
        await page.waitForTimeout(1200);
        await hideDevBadge(page);
        // Grow the viewport to the page's height instead of a fullPage stitch, so the fixed
        // sidebar and the phone tab bar sit where they belong (top to bottom, at the bottom).
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.setViewportSize({ width: d.viewport.width, height: Math.max(d.viewport.height, height) });
        await page.waitForTimeout(400);
        const file = `${s.name}-${d.name}-${locale}-${theme}.png`;
        await page.screenshot({ path: `${out}/${file}` });
        await page.setViewportSize(d.viewport);
        console.log("saved", file);
      }
      await ctx.close();
    }
  }
}
await browser.close();
