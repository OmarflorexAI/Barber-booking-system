import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

/**
 * PLAN.md M1: an Owner picks a big phone photo, it is shrunk on the device to WebP and lands in
 * the Shop's public storage (avatar: square ≤ 512 px; cover: keeps its shape, ≤ 1600 px). A file
 * over 10 MB is refused with the neutral notice. Uses the dev-only harness at /app/dev/photo.
 * Builds a throwaway Shop + Owner and deletes them and every uploaded object afterwards.
 */
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, onnotice: () => {} });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const BUCKET = "shop-media";
const ids = { shop: "", owner: "" };
let ownerEmail = "";

test.beforeAll(async () => {
  const [s] = await sql<{ id: string }[]>`
    insert into public.shops (slug, name, phone) values (${`e2e-photo-${randomUUID().slice(0, 8)}`}, 'E2E Photo Shop', '+17185550198') returning id`;
  ids.shop = s.id;
  ownerEmail = `e2e-photo-owner-${randomUUID().slice(0, 8)}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email: ownerEmail, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("no user");
  ids.owner = data.user.id;
  await sql`insert into public.shop_members (shop_id, user_id, role) values (${ids.shop}, ${ids.owner}, 'owner')`;
});

test.afterAll(async () => {
  if (ids.shop) {
    // Every object under this Shop's folder, whatever the kind.
    for (const kind of ["avatar", "logo", "gallery", "cover"]) {
      const prefix = `shops/${ids.shop}/${kind}`;
      const { data } = await admin.storage.from(BUCKET).list(prefix, { limit: 100 });
      const paths = (data ?? []).map((o) => `${prefix}/${o.name}`);
      if (paths.length) await admin.storage.from(BUCKET).remove(paths);
    }
    await sql`delete from public.shops where id = ${ids.shop}`;
  }
  if (ids.owner) await admin.auth.admin.deleteUser(ids.owner);
  await sql.end();
});

async function signIn(page: Page, email: string) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  await page.goto(`/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&next=/app/day`);
  await expect(page).toHaveURL(/\/app\/day/);
}

/** A 4000×3000 JPEG drawn in the browser (a gradient plus shapes, so it isn't trivially small). */
async function bigJpeg(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 4000;
    c.height = 3000;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 4000, 3000);
    g.addColorStop(0, "#202020");
    g.addColorStop(1, "#d0d0d0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4000, 3000);
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = `hsl(${(i * 37) % 360} 60% 50%)`;
      ctx.beginPath();
      ctx.arc((i * 997) % 4000, (i * 613) % 3000, 40 + (i % 7) * 20, 0, Math.PI * 2);
      ctx.fill();
    }
    const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.9));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  });
  return Buffer.from(b64, "base64");
}

/** Loads the stored file in the page: its HTTP status, content type and decoded size. */
async function inspect(page: Page, url: string) {
  return page.evaluate(async (u) => {
    const res = await fetch(u, { cache: "no-store" });
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);
    return { status: res.status, type: res.headers.get("content-type"), width: bmp.width, height: bmp.height };
  }, url);
}

test("a big phone photo uploads as a small WebP for the avatar and the cover", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, ownerEmail);
  await page.goto("/app/dev/photo");
  await expect(page.getByRole("heading", { name: "Photo upload (dev harness)" })).toBeVisible();
  const jpeg = await bigJpeg(page);
  expect(jpeg.length).toBeLessThan(10 * 1024 * 1024);
  const file = { name: "phone-photo.jpg", mimeType: "image/jpeg", buffer: jpeg };

  const avatarGroup = page.getByRole("group", { name: "Barber photo" });
  await expect(avatarGroup.getByRole("button", { name: "Add photo" })).toBeVisible();
  await page.getByTestId("photo-file-avatar").setInputFiles(file);
  await expect(page.getByTestId("avatar-url")).toHaveText(/^https:\/\/.+\.webp$/, { timeout: 30_000 });
  await expect(avatarGroup.getByRole("button", { name: "Change photo" })).toBeVisible();
  await expect(avatarGroup.getByRole("status")).toHaveText("Photo uploaded.");

  await page.getByTestId("photo-file-cover").setInputFiles(file);
  await expect(page.getByTestId("cover-url")).toHaveText(/^https:\/\/.+\.webp$/, { timeout: 30_000 });

  const avatarUrl = (await page.getByTestId("avatar-url").textContent())!;
  const coverUrl = (await page.getByTestId("cover-url").textContent())!;
  expect(avatarUrl).toContain(`/shops/${ids.shop}/avatar/`);
  expect(coverUrl).toContain(`/shops/${ids.shop}/cover/`);

  const a = await inspect(page, avatarUrl);
  expect(a.status).toBe(200);
  expect(a.type).toBe("image/webp");
  expect(a.width).toBe(a.height);
  expect(a.width).toBeLessThanOrEqual(512);

  const c = await inspect(page, coverUrl);
  expect(c.status).toBe(200);
  expect(c.type).toBe("image/webp");
  expect(c.width).toBeLessThanOrEqual(1600);
  expect(c.width / c.height).toBeCloseTo(4 / 3, 2);

  // Remove hands null back to the caller (the stored file is the caller's to delete).
  await page.getByRole("group", { name: "Cover photo" }).getByRole("button", { name: "Remove" }).click();
  await expect(page.getByTestId("cover-url")).toHaveText("");

  await page.setViewportSize({ width: 360, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test("a photo over 10 MB is refused with a calm notice", async ({ page }) => {
  await signIn(page, ownerEmail);
  await page.goto("/app/dev/photo");
  const big = Buffer.alloc(12 * 1024 * 1024, 0);
  big.set([0xff, 0xd8, 0xff, 0xe0]); // a JPEG's first bytes; it is refused before decoding anyway
  await page.getByTestId("photo-file-avatar").setInputFiles({ name: "huge.jpg", mimeType: "image/jpeg", buffer: big });
  const notice = page.getByRole("group", { name: "Barber photo" }).getByRole("alert");
  await expect(notice).toHaveText("That photo is over 10 MB. Pick a smaller one, or take a new one with the camera.");
  await expect(page.getByTestId("avatar-url")).toHaveText("");
});
