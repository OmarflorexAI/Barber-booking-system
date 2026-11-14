import { randomUUID } from "node:crypto";
import type { ISql } from "postgres";
import { requireOwner } from "@/server/booking-engine/access";
import { forbidden, invalid } from "@/server/booking-engine/errors";

/** The public Storage bucket for Shop pictures (migration 20261114090000_shop_media.sql). */
export const MEDIA_BUCKET = "shop-media";

export const MEDIA_KINDS = ["avatar", "logo", "gallery", "cover"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

/** The bits of Storage this module needs; the app passes supabase-js (service role), tests pass a fake. */
export interface MediaStorage {
  /** A one-time token the browser uses to upload exactly this path. */
  createSignedUploadUrl(path: string): Promise<{ token: string }>;
  remove(paths: string[]): Promise<void>;
  /** The public https URL of a path in the bucket. */
  publicUrl(path: string): string;
}

const isKind = (k: unknown): k is MediaKind => typeof k === "string" && (MEDIA_KINDS as readonly string[]).includes(k);

/** Marker in a Supabase public object URL, right before the object path. */
const PUBLIC_MARKER = `/storage/v1/object/public/${MEDIA_BUCKET}/`;

/**
 * The object path inside the bucket for one of its public URLs, or null when the
 * URL is not a public URL of this bucket. With `publicBase` (the bucket's public
 * URL prefix), a URL from any other host is refused too.
 */
export function pathFromPublicUrl(url: string, publicBase?: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (publicBase) {
    let base: URL;
    try {
      base = new URL(publicBase);
    } catch {
      return null;
    }
    if (u.origin !== base.origin) return null;
  }
  if (!u.pathname.startsWith(PUBLIC_MARKER)) return null;
  let path: string;
  try {
    path = decodeURIComponent(u.pathname.slice(PUBLIC_MARKER.length));
  } catch {
    return null;
  }
  return path || null;
}

const PATH_SHAPE = /^shops\/[0-9a-f-]{36}\/(avatar|logo|gallery|cover)\/[0-9a-f-]{36}\.(webp|jpg)$/;

/**
 * The file type the phone produced. WebP when the browser can encode it; JPEG otherwise
 * (some Safari versions can't encode WebP from a canvas). The bucket accepts both.
 */
export type MediaFormat = "webp" | "jpeg";
const EXT: Record<MediaFormat, string> = { webp: "webp", jpeg: "jpg" };

export function createMedia(sql: ISql, storage: MediaStorage) {
  return {
    /** A signed upload for a new picture in the caller's own Shop. Owners only. */
    async createUpload({ userId, shopId, kind, format = "webp" }: { userId: string; shopId: string; kind: MediaKind; format?: MediaFormat }) {
      if (!isKind(kind)) throw invalid("Unknown picture kind.");
      if (format !== "webp" && format !== "jpeg") throw invalid("Unknown picture format.");
      await requireOwner(sql, userId, shopId);
      const path = `shops/${shopId}/${kind}/${randomUUID()}.${EXT[format]}`;
      const { token } = await storage.createSignedUploadUrl(path);
      return { path, token, publicUrl: storage.publicUrl(path) };
    },

    /**
     * Delete one picture of the caller's own Shop. Takes the object path or its
     * public URL. Anything outside shops/<shopId>/ is refused. Owners only.
     */
    async deleteMedia({ userId, shopId, path: pathOrUrl }: { userId: string; shopId: string; path: string }) {
      await requireOwner(sql, userId, shopId);
      if (typeof pathOrUrl !== "string" || !pathOrUrl) throw invalid("Missing picture.");
      let path = pathOrUrl;
      if (/^[a-z]+:\/\//i.test(pathOrUrl)) {
        const p = pathFromPublicUrl(pathOrUrl, storage.publicUrl(""));
        if (!p) throw invalid("That is not one of this Shop's pictures.");
        path = p;
      }
      if (path.includes("..") || path.includes("\\") || path.startsWith("/")) throw invalid("Bad picture path.");
      if (!path.startsWith(`shops/${shopId}/`)) throw forbidden();
      if (!PATH_SHAPE.test(path)) throw invalid("Bad picture path.");
      await storage.remove([path]);
    },
  };
}

export type Media = ReturnType<typeof createMedia>;
