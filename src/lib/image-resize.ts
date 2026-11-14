/**
 * Shrinks a photo on the phone before it is uploaded (PLAN.md → Q12). Browser-only.
 *
 * - `square: true` (Barber photos, the logo): a centered square crop, longest side ≤ `max`.
 * - `square: false` (gallery, cover): keeps its shape, longest side ≤ `max`.
 * Never scales up. EXIF orientation is applied while decoding, so a phone photo taken sideways
 * comes out the right way up. The result is WebP; a browser that can't encode WebP (older
 * Safari) falls back to JPEG, and the returned Blob's `type` says which one it is.
 */

export const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const QUALITY = 0.85;

export type ResizeErrorCode = "too_big" | "not_image" | "decode";

export class ResizeError extends Error {
  constructor(public code: ResizeErrorCode) {
    super(code);
    this.name = "ResizeError";
  }
}

/** The pixel box to read from the source and the size to draw it at. */
export function fitBox(width: number, height: number, max: number, square: boolean) {
  if (square) {
    const side = Math.min(width, height);
    const out = Math.min(side, max);
    return { sx: Math.round((width - side) / 2), sy: Math.round((height - side) / 2), sw: side, sh: side, dw: out, dh: out };
  }
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    sx: 0,
    sy: 0,
    sw: width,
    sh: height,
    dw: Math.max(1, Math.round(width * scale)),
    dh: Math.max(1, Math.round(height * scale)),
  };
}

export async function resizeImage(file: Blob, { max, square }: { max: number; square: boolean }): Promise<Blob> {
  // Cheap checks first, before anything is decoded.
  if (file.size > MAX_INPUT_BYTES) throw new ResizeError("too_big");
  if (file.type && !file.type.startsWith("image/")) throw new ResizeError("not_image");
  if (file.size === 0) throw new ResizeError("not_image");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ResizeError("decode");
  }

  try {
    const box = fitBox(bitmap.width, bitmap.height, max, square);
    return await draw(bitmap, box);
  } finally {
    bitmap.close();
  }
}

type Box = ReturnType<typeof fitBox>;

async function draw(bitmap: ImageBitmap, b: Box): Promise<Blob> {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(b.dw, b.dh);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      paint(ctx, bitmap, b);
      const webp = await canvas.convertToBlob({ type: "image/webp", quality: QUALITY });
      if (webp.type === "image/webp") return webp;
      return canvas.convertToBlob({ type: "image/jpeg", quality: QUALITY });
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = b.dw;
  canvas.height = b.dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ResizeError("decode");
  paint(ctx, bitmap, b);
  const webp = await toBlob(canvas, "image/webp");
  if (webp.type === "image/webp") return webp;
  return toBlob(canvas, "image/jpeg");
}

function paint(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, bitmap: ImageBitmap, b: Box) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, b.sx, b.sy, b.sw, b.sh, 0, 0, b.dw, b.dh);
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new ResizeError("decode"))), type, QUALITY),
  );
}
