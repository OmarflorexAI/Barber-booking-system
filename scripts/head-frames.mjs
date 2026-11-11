// Frames for the 360° head viewer on the landing page (src/app/_landing/head-viewer.tsx).
//
// Each head is a turntable: N frames (72 by default, one every 5°) of one full turn,
// saved as WebP at two widths so the viewer can pick by screen size:
//   public/landing/heads/<id>/720/00.webp … 71.webp
//   public/landing/heads/<id>/1440/00.webp … 71.webp
// Frame 00 faces the camera; each next frame is the head turned a little further.
// Then add (or un-comment) the head in src/app/_landing/heads.ts. The page only shows
// heads whose frames exist, so a head without frames never breaks the page.
//
// Usage (run from the repo root; any shell):
//
//   1. From an orbit video (one full 360° turn around the head). Needs ffmpeg on PATH
//      (it is installed on this machine: `ffmpeg -version` reports 8.1).
//        node scripts/head-frames.mjs video public/landing/heads/raw/low-fade.mp4 --id low-fade
//      Options:
//        --frames 72        how many frames to keep (spread evenly over one turn)
//        --start 0          second where the turn starts
//        --turn <seconds>   how long one full turn lasts (default: the whole video after --start)
//        --reverse          the video turns the other way (dragging right should turn the head right)
//        --crop x,y,w,h     crop every frame first, in source pixels (e.g. to drop a watermark)
//        --quality 86       WebP quality
//
//   2. From a folder of frames already exported (png/jpg/webp, sorted by name):
//        node scripts/head-frames.mjs folder path/to/frames --id low-fade
//      Same options except --start/--turn. If the folder holds more frames than --frames,
//      they are picked evenly.
//
//   3. The built-in TEST sequence (a clay bust with a frame number on it):
//        node scripts/head-frames.mjs test
//
// Frames are made square (center crop) and should be shot on a plain charcoal backdrop
// close to #0d0e10: the viewer fades the frame edges into its stage, so a matching
// backdrop makes the head look like it stands on the page. Prompt hint for AI orbit
// videos: "slow 360-degree orbit around a mannequin head, plain charcoal studio backdrop,
// soft top light, locked exposure, no camera shake, subject centered".
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SIZES = [720, 1440];
const root = fileURLToPath(new URL("../public/landing/heads/", import.meta.url));

const [mode, input, ...rest] = process.argv.slice(2);
const opts = parseOpts(mode === "test" ? [input, ...rest].filter(Boolean) : rest);
const count = Number(opts.frames ?? 72);
const quality = Number(opts.quality ?? 86);

function usage() {
  console.error("Usage: node scripts/head-frames.mjs test | video <file> --id <id> | folder <dir> --id <id>  (see the top of this file)");
  process.exit(1);
}

function parseOpts(args) {
  const o = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a?.startsWith("--")) continue;
    const key = a.slice(2);
    const next = args[i + 1];
    if (next === undefined || next.startsWith("--")) o[key] = true;
    else o[key] = args[++i];
  }
  return o;
}

/** Extracts every frame of one turn to PNGs with ffmpeg; returns the folder. */
function extractVideo(file, work) {
  const start = Number(opts.start ?? 0);
  const args = ["-v", "error", "-ss", String(start)];
  if (opts.turn) args.push("-t", String(opts.turn));
  args.push("-i", file, "-vsync", "0", join(work, "%05d.png"));
  try {
    execFileSync("ffmpeg", args, { stdio: "inherit" });
  } catch (err) {
    throw new Error(`ffmpeg failed (is it on PATH? run "ffmpeg -version"): ${err.message}`);
  }
  return work;
}

/** Writes all frames of one head at every size and prints the total weight. */
async function writeHead(id, n, source) {
  const out = join(root, id);
  await rm(out, { recursive: true, force: true });
  for (const size of SIZES) await mkdir(join(out, String(size)), { recursive: true });
  const bytes = Object.fromEntries(SIZES.map((s) => [s, 0]));
  for (let i = 0; i < n; i++) {
    const src = await source(i);
    // Square, centered: the viewer's stage is square.
    const square = await sharp(src).resize(SIZES.at(-1), SIZES.at(-1), { fit: "cover", position: "centre" }).toBuffer();
    for (const size of SIZES) {
      const file = join(out, String(size), `${String(i).padStart(2, "0")}.webp`);
      await sharp(square)
        .resize(size, size, { kernel: "lanczos3" })
        .webp({ quality: size === 720 ? quality - 4 : quality, effort: 5, smartSubsample: true })
        .toFile(file);
      bytes[size] += (await stat(file)).size;
    }
    process.stdout.write(`\r${id}: ${i + 1}/${n}`);
  }
  process.stdout.write("\n");
  for (const size of SIZES) console.log(`${id} ${size}px: ${(bytes[size] / 1024 / 1024).toFixed(2)} MB (${n} frames)`);
  console.log(`Manifest entry (src/app/_landing/heads.ts): { id: "${id}", frames: ${n}, width: ${SIZES.at(-1)}, height: ${SIZES.at(-1)}, base: "/landing/heads/${id}" }`);
}

// ---------------------------------------------------------------------------------
// TEST sequence: a clay bust with a "haircut", rendered by a tiny ray tracer, so the
// viewer can be built and measured before the real heads exist.

/**
 * Ellipsoids that make up the bust, in object space (y up, the face looks at +z).
 * Each is [cx, cy, cz, rx, ry, rz, part].
 */
const BUST = [
  [0, 0.42, -0.04, 0.6, 0.62, 0.66, "cranium"],
  [0, 0.04, 0.2, 0.45, 0.52, 0.5, "face"],
  [0, 0.1, 0.7, 0.07, 0.14, 0.1, "nose"],
  [0.6, 0.2, 0, 0.07, 0.15, 0.1, "ear"],
  [-0.6, 0.2, 0, 0.07, 0.15, 0.1, "ear"],
  [0, -0.52, -0.02, 0.27, 0.5, 0.27, "neck"],
  [0, -1.28, -0.02, 1.0, 0.46, 0.5, "shoulders"],
];

function renderTestFrame(i, n) {
  const S = 1440;
  const theta = (i / n) * Math.PI * 2;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const px = Buffer.alloc(S * S * 3);
  const camZ = 6.2;
  const lookY = -0.12;
  const half = 1.62 / camZ; // tan of half the vertical field of view
  const light = norm([-0.55, 0.75, 0.6]); // key light, fixed while the bust turns
  const rim = norm([0.8, 0.3, -0.6]);
  const ss = [0.25, 0.75];

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (const sy of ss) {
        for (const sx of ss) {
          const u = ((x + sx) / S) * 2 - 1;
          const v = 1 - ((y + sy) / S) * 2;
          // Camera ray (world), then turned into the bust's own space.
          const dw = norm([u * half, v * half, -1]);
          const ow = [0, lookY, camZ];
          const o = [ow[0] * cos - ow[2] * sin, ow[1], ow[0] * sin + ow[2] * cos];
          const d = [dw[0] * cos - dw[2] * sin, dw[1], dw[0] * sin + dw[2] * cos];
          const c = shade(o, d, cos, sin, light, rim, u, v);
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const k = (y * S + x) * 3;
      px[k] = r / 4;
      px[k + 1] = g / 4;
      px[k + 2] = b / 4;
    }
  }

  const num = String(i).padStart(2, "0");
  const deg = Math.round((i / n) * 360);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
    <text x="72" y="140" font-family="Consolas, monospace" font-size="96" fill="#e5534b">${num}</text>
    <text x="72" y="196" font-family="Consolas, monospace" font-size="36" fill="#a3a1a8">test frame, ${deg}°</text>
  </svg>`;
  return sharp(px, { raw: { width: S, height: S, channels: 3 } })
    .composite([{ input: Buffer.from(svg) }])
    .png()
    .toBuffer();
}

function shade(o, d, cos, sin, light, rim, u, v) {
  let best = Infinity;
  let hit = null;
  for (const e of BUST) {
    const [cx, cy, cz, rx, ry, rz] = e;
    const ox = (o[0] - cx) / rx;
    const oy = (o[1] - cy) / ry;
    const oz = (o[2] - cz) / rz;
    const dx = d[0] / rx;
    const dy = d[1] / ry;
    const dz = d[2] / rz;
    const A = dx * dx + dy * dy + dz * dz;
    const B = 2 * (ox * dx + oy * dy + oz * dz);
    const C = ox * ox + oy * oy + oz * oz - 1;
    const disc = B * B - 4 * A * C;
    if (disc < 0) continue;
    const t = (-B - Math.sqrt(disc)) / (2 * A);
    if (t > 0 && t < best) {
      best = t;
      hit = e;
    }
  }

  if (!hit) return backdrop(u, v);

  const p = [o[0] + d[0] * best, o[1] + d[1] * best, o[2] + d[2] * best];
  const [cx, cy, cz, rx, ry, rz, part] = hit;
  // Normal in object space, then back to camera space for lighting.
  const no = norm([(p[0] - cx) / (rx * rx), (p[1] - cy) / (ry * ry), (p[2] - cz) / (rz * rz)]);
  const n = [no[0] * cos + no[2] * sin, no[1], -no[0] * sin + no[2] * cos];
  const view = [-d[0] * cos - d[2] * sin, -d[1], d[0] * sin - d[2] * cos];

  // Clay, with a haircut: a skin fade on the sides, longer on top, a hard part on the left.
  let base = [176, 168, 158];
  if (part === "cranium") {
    const hairline = 0.42 + 0.22 * Math.max(0, no[2]) - 0.08 * Math.max(0, -no[2]);
    const fade = smooth(hairline - 0.24, hairline, p[1]);
    const hair = [38, 34, 33];
    base = mix(base, hair, fade * 0.92);
    const onPart = Math.abs(p[0] + 0.28) < 0.018 && p[1] > hairline && no[2] > -0.3;
    if (onPart) base = [150, 142, 133];
  }
  // A thin red line on the back of the neck, so the back is easy to spot.
  if (part === "neck" && no[2] < -0.5 && Math.abs(p[1] + 0.32) < 0.02) base = [229, 83, 75];
  if (part === "nose") base = [190, 150, 140];

  const lam = Math.max(0, dot(n, light));
  const rimL = Math.pow(Math.max(0, dot(n, rim)), 2) * 0.5;
  const h = norm([light[0] + view[0], light[1] + view[1], light[2] + view[2]]);
  const spec = Math.pow(Math.max(0, dot(n, h)), 40) * 0.18;
  const fres = Math.pow(1 - Math.max(0, dot(n, view)), 3) * 0.25;
  const amb = 0.16 + 0.1 * (n[1] * 0.5 + 0.5);
  const k = amb + lam * 0.85;
  return [
    clamp(base[0] * k + 255 * (spec + rimL * 0.35) + 93 * fres),
    clamp(base[1] * k + 255 * (spec + rimL * 0.35) + 134 * fres * 0.6),
    clamp(base[2] * k + 255 * (spec + rimL * 0.4) + 232 * fres * 0.8),
  ];
}

/** Charcoal studio backdrop: #0d0e10 at the edges and a soft spot behind the head. */
function backdrop(u, v) {
  const edge = [13, 14, 16];
  const spot = Math.exp(-((u * u) / 0.5 + ((v - 0.15) * (v - 0.15)) / 0.6)) * 0.9;
  return [edge[0] + 14 * spot, edge[1] + 14 * spot, edge[2] + 16 * spot];
}

function norm(a) {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function clamp(x) {
  return Math.max(0, Math.min(255, x));
}

async function main() {
  if (mode === "test") {
    await writeHead("test", count, (i) => renderTestFrame(i, count));
  } else if (mode === "video" || mode === "folder") {
    if (!input || !opts.id) usage();
    const work = await mkdtemp(join(tmpdir(), "head-frames-"));
    try {
      const dir = mode === "video" ? extractVideo(input, work) : input;
      const files = (await readdir(dir)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort();
      if (files.length < 2) throw new Error(`No frames found in ${dir}`);
      // Pick `count` frames spread evenly over one turn (the last source frame ≈ the first, so skip it).
      let picked = Array.from({ length: count }, (_, i) => files[Math.floor((i * files.length) / count)]);
      if (opts.reverse) picked = [picked[0], ...picked.slice(1).reverse()];
      const crop = opts.crop?.split(",").map(Number);
      await writeHead(opts.id, count, async (i) => {
        let img = sharp(join(dir, picked[i]));
        if (crop) img = img.extract({ left: crop[0], top: crop[1], width: crop[2], height: crop[3] });
        return img.png().toBuffer();
      });
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  } else {
    usage();
  }
}

// Runs last, after every helper above is defined.
await main();
