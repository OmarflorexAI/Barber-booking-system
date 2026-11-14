"use server";

import { createClient } from "@/lib/supabase/server";
import { isBookingError } from "@/server/booking-engine";
import { media } from "@/server/engine";
import { loadStaff } from "../_shell/staff";

export type MediaKind = "avatar" | "logo" | "gallery" | "cover";

const KINDS: readonly string[] = ["avatar", "logo", "gallery", "cover"];

/** The signed-in person and their Shop; the server module still checks they own it. */
async function caller(): Promise<{ userId: string; shopId: string } | null> {
  const staff = await loadStaff(await createClient());
  if (!staff?.membership) return null;
  return { userId: staff.userId, shopId: staff.membership.shopId };
}

/** A signed upload for one picture in the Owner's own Shop. The browser uploads the WebP (or JPEG where WebP encoding is missing) with the token. */
export async function createUploadAction(
  kind: MediaKind,
  format: "webp" | "jpeg" = "webp",
): Promise<{ ok: true; path: string; token: string; publicUrl: string } | { ok: false; error: "forbidden" | "invalid" }> {
  if (typeof kind !== "string" || !KINDS.includes(kind)) return { ok: false, error: "invalid" };
  if (format !== "webp" && format !== "jpeg") return { ok: false, error: "invalid" };
  try {
    const who = await caller();
    if (!who) return { ok: false, error: "forbidden" };
    const { path, token, publicUrl } = await media().createUpload({ ...who, kind, format });
    return { ok: true, path, token, publicUrl };
  } catch (e) {
    if (isBookingError(e, "FORBIDDEN")) return { ok: false, error: "forbidden" };
    if (!isBookingError(e)) console.error("create upload failed", e);
    return { ok: false, error: "invalid" };
  }
}

/** Delete one picture (path or public URL) of the Owner's own Shop. */
export async function deleteMediaAction(pathOrUrl: string): Promise<{ ok: boolean }> {
  if (typeof pathOrUrl !== "string" || !pathOrUrl || pathOrUrl.length > 2048) return { ok: false };
  try {
    const who = await caller();
    if (!who) return { ok: false };
    await media().deleteMedia({ ...who, path: pathOrUrl });
    return { ok: true };
  } catch (e) {
    if (!isBookingError(e)) console.error("delete picture failed", e);
    return { ok: false };
  }
}
