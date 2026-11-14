import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { isBookingError } from "@/server/booking-engine";
import { createMedia, pathFromPublicUrl, type MediaKind, type MediaStorage } from "@/server/media";
import { dropShop, dropUser, makeLoneUser, makeShop, makeUser, sql, type TestShop } from "./fixtures";

/**
 * M1 photo uploads: only a Shop's Owner gets upload paths and deletes pictures,
 * and only inside shops/<their shopId>/. Real Postgres for who-is-who, fake Storage.
 */
const BASE = "https://proj.supabase.co/storage/v1/object/public/shop-media/";

function fakeStorage() {
  const signed: string[] = [];
  const removed: string[] = [];
  const storage: MediaStorage = {
    async createSignedUploadUrl(path) {
      signed.push(path);
      return { token: `tok-${signed.length}` };
    },
    async remove(paths) {
      removed.push(...paths);
    },
    publicUrl: (path) => `${BASE}${path}`,
  };
  return { storage, signed, removed };
}

let fake: ReturnType<typeof fakeStorage>;
let tools: ReturnType<typeof createMedia>;
let shop: TestShop;
let other: TestShop;
let owner: string;
let barberUser: string;
let otherOwner: string;
let stranger: string;

beforeEach(async () => {
  fake = fakeStorage();
  tools = createMedia(sql, fake.storage);
  shop = await makeShop();
  other = await makeShop();
  owner = await makeUser(shop.shopId, "owner");
  barberUser = await makeUser(shop.shopId, "barber", shop.blake);
  otherOwner = await makeUser(other.shopId, "owner");
  stranger = await makeLoneUser();
});
afterEach(async () => {
  await dropShop(shop);
  await dropShop(other);
  await dropUser(stranger);
});
afterAll(async () => {
  await sql.end();
});

async function code(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return "OK";
  } catch (e) {
    if (isBookingError(e)) return e.code;
    throw e;
  }
}

const FILE = "00000000-0000-4000-8000-000000000000.webp";
const ownPath = () => `shops/${shop.shopId}/avatar/${FILE}`;

describe("createUpload", () => {
  it("gives the Owner a .webp path under their own Shop, with a token and public URL", async () => {
    for (const kind of ["avatar", "logo", "gallery", "cover"] as const) {
      const up = await tools.createUpload({ userId: owner, shopId: shop.shopId, kind });
      expect(up.path).toMatch(new RegExp(`^shops/${shop.shopId}/${kind}/[0-9a-f-]{36}\\.webp$`));
      expect(up.token).toMatch(/^tok-/);
      expect(up.publicUrl).toBe(`${BASE}${up.path}`);
    }
    expect(fake.signed).toHaveLength(4);
  });

  it("refuses a stranger, another Shop's Owner and a Barber", async () => {
    for (const userId of [stranger, otherOwner, barberUser]) {
      expect(await code(tools.createUpload({ userId, shopId: shop.shopId, kind: "avatar" }))).toBe("FORBIDDEN");
    }
    expect(fake.signed).toHaveLength(0);
  });

  it("gives a .jpg path when the phone could only make a JPEG, and refuses other formats", async () => {
    const up = await tools.createUpload({ userId: owner, shopId: shop.shopId, kind: "cover", format: "jpeg" });
    expect(up.path).toMatch(new RegExp(`^shops/${shop.shopId}/cover/[0-9a-f-]{36}\\.jpg$`));
    const format = "png" as "webp";
    expect(await code(tools.createUpload({ userId: owner, shopId: shop.shopId, kind: "cover", format }))).toBe("INVALID_INPUT");
    await tools.deleteMedia({ userId: owner, shopId: shop.shopId, path: up.path });
    expect(fake.removed).toEqual([up.path]);
  });

  it("refuses an unknown kind", async () => {
    const kind = "../../etc" as MediaKind;
    expect(await code(tools.createUpload({ userId: owner, shopId: shop.shopId, kind }))).toBe("INVALID_INPUT");
    expect(fake.signed).toHaveLength(0);
  });
});

describe("deleteMedia", () => {
  it("deletes the Owner's own picture by path or by its public URL", async () => {
    await tools.deleteMedia({ userId: owner, shopId: shop.shopId, path: ownPath() });
    await tools.deleteMedia({ userId: owner, shopId: shop.shopId, path: `${BASE}${ownPath()}` });
    expect(fake.removed).toEqual([ownPath(), ownPath()]);
  });

  it("refuses another Shop's path, '..', a foreign URL and non-Owners", async () => {
    const del = (userId: string, path: string) => code(tools.deleteMedia({ userId, shopId: shop.shopId, path }));
    const theirs = `shops/${other.shopId}/avatar/${FILE}`;
    expect(await del(owner, theirs)).toBe("FORBIDDEN");
    expect(await del(owner, `${BASE}${theirs}`)).toBe("FORBIDDEN");
    expect(await del(owner, `shops/${shop.shopId}/../${other.shopId}/avatar/${FILE}`)).toBe("INVALID_INPUT");
    expect(await del(owner, `https://evil.example/storage/v1/object/public/shop-media/${ownPath()}`)).toBe("INVALID_INPUT");
    expect(await del(owner, `shops/${shop.shopId}/avatar/notes.txt`)).toBe("INVALID_INPUT");
    for (const userId of [otherOwner, barberUser, stranger]) expect(await del(userId, ownPath())).toBe("FORBIDDEN");
    expect(fake.removed).toHaveLength(0);
  });
});

describe("pathFromPublicUrl", () => {
  it("reduces a bucket URL to its path and rejects others", () => {
    expect(pathFromPublicUrl(`${BASE}shops/a/logo/b.webp`)).toBe("shops/a/logo/b.webp");
    expect(pathFromPublicUrl(`${BASE}shops/a/logo/b.webp`, BASE)).toBe("shops/a/logo/b.webp");
    expect(pathFromPublicUrl("https://evil.example/storage/v1/object/public/shop-media/x", BASE)).toBeNull();
    expect(pathFromPublicUrl("https://proj.supabase.co/storage/v1/object/public/other/x")).toBeNull();
    expect(pathFromPublicUrl("not a url")).toBeNull();
  });
});
