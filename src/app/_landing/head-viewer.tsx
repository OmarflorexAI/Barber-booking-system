"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/dictionaries";
import { frameUrl, type Head, HEAD_SIZES } from "./heads";

/**
 * A 360° turntable for one head at a time, Apple/Nike-style: an image sequence drawn
 * to a canvas. Smoothness comes from doing almost nothing per frame:
 * - every frame is downloaded AND decoded to an ImageBitmap (at the canvas's pixel
 *   size) before dragging is enabled, so a drag never waits on a decode;
 * - a frame is drawn only inside requestAnimationFrame and only when the frame index
 *   changes; nothing in React re-renders while turning (the readout is written to the DOM);
 * - loading starts only when the stage is about a screen away.
 */

/** Degrees turned per CSS pixel dragged: one full turn ≈ 1.4 stage widths. */
const TURN_PER_WIDTH = 360 / 1.4;
/** Momentum after a flick fades with this time constant (ms). */
const FRICTION_MS = 325;
const MAX_FETCHES = 6;

/** The one-time "this turns" nudge plays once per page view, not once per head. */
let hintPlayed = false;

type Ui = {
  onProgress: (loaded: number, total: number) => void;
  onReady: (ready: boolean) => void;
  onDrawn: () => void;
};

/** Everything that runs per frame lives here, outside React. */
class Turntable {
  angle = 0;
  private ctx: CanvasRenderingContext2D | null;
  private frames: (ImageBitmap | null)[] = [];
  private head: Head | null = null;
  private size = 0;
  private token = 0;
  private drawn = -1;
  private raf = 0;
  private velocity = 0; // degrees per ms
  private lastTick = 0;
  private hint: { start: number } | null = null;
  private drag: { id: number; x: number; t: number; samples: { dx: number; dt: number }[] } | null = null;
  ready = false;
  reduced = false;
  cssWidth = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private slider: HTMLElement,
    private readout: HTMLElement,
    private ui: Ui,
  ) {
    this.ctx = canvas.getContext("2d", { alpha: false });
  }

  /** Canvas backing size in device pixels, capped so 72 decoded frames stay within memory. */
  private backing() {
    const coarse = matchMedia("(pointer: coarse)").matches;
    const cap = coarse ? 1080 : 1200;
    return Math.max(1, Math.min(cap, Math.round(this.cssWidth * (window.devicePixelRatio || 1))));
  }

  resize(cssWidth: number) {
    if (!cssWidth) return;
    this.cssWidth = cssWidth;
    if (!this.head) return;
    const w = this.backing();
    const h = Math.round((w * this.head.height) / this.head.width);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      // Frames decoded for a much smaller canvas would look soft: load them again.
      if (this.size && pickSize(w) > this.size) return void this.load(this.head);
      this.drawn = -1;
      this.draw();
    }
  }

  async load(head: Head) {
    const token = ++this.token;
    this.stop();
    this.head = head;
    this.ready = false;
    this.ui.onReady(false);
    for (const f of this.frames) f?.close();
    const n = head.frames;
    this.frames = new Array(n).fill(null);
    this.drawn = -1;
    this.size = 0;
    this.resize(this.cssWidth);
    const w = this.canvas.width;
    const h = this.canvas.height;
    const size = pickSize(w);
    this.size = size;

    // The frame on screen first, then outward from it, so turning a little works first.
    const start = this.index();
    const order = [start];
    for (let k = 1; order.length < n; k++) {
      order.push((start + k) % n);
      if (order.length < n) order.push((start - k + n) % n);
    }

    let loaded = 0;
    this.ui.onProgress(0, n);
    const next = async (): Promise<void> => {
      const i = order.shift();
      if (i === undefined || token !== this.token) return;
      const bmp = await decode(frameUrl(head, size, i), w, h).catch(() => null);
      if (token !== this.token) return void bmp?.close();
      this.frames[i] = bmp;
      loaded++;
      this.ui.onProgress(loaded, n);
      if (i === this.index()) this.requestDraw();
      return next();
    };
    await Promise.all(Array.from({ length: MAX_FETCHES }, next));
    if (token !== this.token) return;
    this.ready = this.frames.every(Boolean);
    this.ui.onReady(this.ready);
    this.requestDraw();
  }

  /** Warm the HTTP cache for a head the visitor may pick next (no decoding, low priority). */
  prefetch(head: Head) {
    const size = this.size || pickSize(this.backing());
    for (let i = 0; i < head.frames; i++) {
      fetch(frameUrl(head, size, i), { priority: "low" } as RequestInit).catch(() => {});
    }
  }

  index() {
    const n = this.head?.frames ?? 1;
    return ((Math.round((this.angle / 360) * n) % n) + n) % n;
  }

  private setAngle(a: number) {
    this.angle = ((a % 360) + 360) % 360;
    this.requestDraw();
  }

  requestDraw() {
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.raf = 0;
    const dt = this.lastTick ? Math.min(64, now - this.lastTick) : 16;
    this.lastTick = now;
    let more = false;

    if (this.hint) {
      // A gentle turn to one side and back, once.
      const p = Math.min(1, (now - this.hint.start) / 1800);
      this.angle = (Math.sin(p * Math.PI) * 28 + 360) % 360;
      if (p < 1) more = true;
      else this.hint = null;
    } else if (!this.drag && this.velocity) {
      this.angle = (((this.angle + this.velocity * dt) % 360) + 360) % 360;
      this.velocity *= Math.exp(-dt / FRICTION_MS);
      if (Math.abs(this.velocity) < 0.004) this.velocity = 0;
      else more = true;
    }

    this.draw();
    if (more) this.raf = requestAnimationFrame(this.tick);
    else this.lastTick = 0;
  };

  private draw() {
    const i = this.index();
    const deg = Math.round((i / (this.head?.frames ?? 1)) * 360) % 360;
    this.readout.textContent = `${deg}°`;
    this.slider.setAttribute("aria-valuenow", String(deg));
    this.slider.setAttribute("aria-valuetext", `${deg}°`);
    if (i === this.drawn || !this.ctx) return;
    const bmp = this.frames[i];
    if (!bmp) return;
    this.ctx.drawImage(bmp, 0, 0, this.canvas.width, this.canvas.height);
    if (this.drawn === -1) this.ui.onDrawn();
    this.drawn = i;
  }

  stop() {
    this.velocity = 0;
    this.hint = null;
    this.drag = null;
  }

  playHint() {
    if (hintPlayed || this.reduced || !this.ready || this.drag) return;
    hintPlayed = true;
    this.hint = { start: performance.now() };
    this.requestDraw();
  }

  pointerDown(e: PointerEvent) {
    if (!this.ready || (e.pointerType === "mouse" && e.button !== 0)) return;
    hintPlayed = true;
    this.stop();
    this.slider.setPointerCapture(e.pointerId);
    this.drag = { id: e.pointerId, x: e.clientX, t: e.timeStamp, samples: [] };
  }

  pointerMove(e: PointerEvent) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x;
    const dt = Math.max(1, e.timeStamp - d.t);
    d.x = e.clientX;
    d.t = e.timeStamp;
    d.samples.push({ dx, dt });
    if (d.samples.length > 5) d.samples.shift();
    this.setAngle(this.angle + (dx * TURN_PER_WIDTH) / this.cssWidth);
  }

  pointerUp(e: PointerEvent, cancelled: boolean) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    this.drag = null;
    // A flick keeps turning and slows down; a held stop (no move for 80ms) does not.
    const recent = e.timeStamp - d.t < 80;
    if (cancelled || this.reduced || !recent || d.samples.length === 0) return;
    const dx = d.samples.reduce((s, x) => s + x.dx, 0);
    const dt = d.samples.reduce((s, x) => s + x.dt, 0);
    const v = ((dx / dt) * TURN_PER_WIDTH) / this.cssWidth;
    this.velocity = Math.max(-2.4, Math.min(2.4, v));
    this.requestDraw();
  }

  key(e: KeyboardEvent) {
    if (!this.ready || !this.head) return;
    const step = 360 / this.head.frames;
    const big = e.shiftKey ? 9 : 1;
    const by: Record<string, number> = {
      ArrowRight: step * big,
      ArrowUp: step * big,
      ArrowLeft: -step * big,
      ArrowDown: -step * big,
      PageUp: 45,
      PageDown: -45,
    };
    if (e.key === "Home") this.setAngle(0);
    else if (e.key === "End") this.setAngle(360 - step);
    else if (e.key in by) this.setAngle(Math.round((this.angle + by[e.key]) / step) * step);
    else return;
    hintPlayed = true;
    this.stop();
    e.preventDefault();
  }

  destroy() {
    this.token++;
    cancelAnimationFrame(this.raf);
    for (const f of this.frames) f?.close();
    this.frames = [];
  }
}

/** The smallest saved width that covers the canvas (≤ 10% upscaling is invisible). */
function pickSize(px: number) {
  return HEAD_SIZES.find((s) => s * 1.1 >= px) ?? HEAD_SIZES[HEAD_SIZES.length - 1];
}

/** Downloads one frame and decodes it off the main thread, already scaled to the canvas. */
async function decode(url: string, w: number, h: number): Promise<ImageBitmap> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const blob = await res.blob();
  try {
    return await createImageBitmap(blob, { resizeWidth: w, resizeHeight: h, resizeQuality: "high" });
  } catch {
    // Older Safari: no resize options.
    return createImageBitmap(blob);
  }
}

export function HeadViewer({
  heads,
  locale,
  hint,
  keysHint,
  loadingLabel,
  pickerLabel,
}: {
  heads: Head[];
  locale: Locale;
  /** "Drag to turn". */
  hint: string;
  /** "or use the arrow keys": appended to the slider's accessible name. */
  keysHint: string;
  /** Announced (politely) while the frames load. */
  loadingLabel: string;
  /** The accessible name of the style picker. */
  pickerLabel: string;
}) {
  const [selected, setSelected] = useState(0);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [near, setNear] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const engineRef = useRef<Turntable | null>(null);
  const head = heads[selected];

  // One engine for the life of the section: sizing, input, reduced motion, visibility.
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const readout = readoutRef.current;
    if (!stage || !canvas || !readout) return;
    const engine = new Turntable(canvas, stage, readout, {
      onProgress: (loaded, total) => setProgress(loaded / total),
      onReady: setReady,
      onDrawn: () => setDrawn(true),
    });
    engineRef.current = engine;

    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => (engine.reduced = motion.matches);
    onMotion();
    motion.addEventListener("change", onMotion);

    const ro = new ResizeObserver(([entry]) => engine.resize(entry.contentRect.width));
    ro.observe(stage);
    engine.cssWidth = stage.clientWidth;

    // Start loading about one screen before the stage scrolls into view.
    const nearIo = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          nearIo.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    nearIo.observe(stage);

    // The one-time nudge plays only when the head is actually on screen.
    const seenIo = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        let tries = 0;
        const tryHint = () => {
          if (engine.ready) engine.playHint();
          else if (++tries < 40) setTimeout(tryHint, 300);
        };
        setTimeout(tryHint, 500);
        seenIo.disconnect();
      },
      { threshold: 0.6 },
    );
    seenIo.observe(stage);

    const down = (e: PointerEvent) => engine.pointerDown(e);
    const move = (e: PointerEvent) => engine.pointerMove(e);
    const up = (e: PointerEvent) => engine.pointerUp(e, false);
    const cancel = (e: PointerEvent) => engine.pointerUp(e, true);
    const key = (e: KeyboardEvent) => engine.key(e);
    stage.addEventListener("pointerdown", down);
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", cancel);
    stage.addEventListener("lostpointercapture", cancel);
    stage.addEventListener("keydown", key);

    return () => {
      motion.removeEventListener("change", onMotion);
      ro.disconnect();
      nearIo.disconnect();
      seenIo.disconnect();
      stage.removeEventListener("pointerdown", down);
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerup", up);
      stage.removeEventListener("pointercancel", cancel);
      stage.removeEventListener("lostpointercapture", cancel);
      stage.removeEventListener("keydown", key);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Load the picked head (keeping the angle); then warm the cache for the next one.
  useEffect(() => {
    const engine = engineRef.current;
    if (!near || !engine) return;
    let idle = 0;
    void engine.load(head).then(() => {
      const after = heads[(heads.indexOf(head) + 1) % heads.length];
      if (after === head || !engine.ready) return;
      const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
      idle = ric(() => engine.prefetch(after));
    });
    return () => {
      window.cancelIdleCallback?.(idle);
    };
  }, [near, head, heads]);

  const name = head.name[locale];
  // Fades the frame's own backdrop into the stage at the sides and top (not the bottom, where the bust sits).
  const fade = {
    maskImage: "linear-gradient(to right, transparent, #000 7%, #000 93%, transparent), linear-gradient(to bottom, transparent, #000 7%)",
    maskComposite: "intersect",
  } as const;
  const loading = near && !ready;

  return (
    <div className="min-w-0">
      <div
        ref={stageRef}
        role="slider"
        tabIndex={0}
        aria-label={`${name}. ${hint}, ${keysHint}`}
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={0}
        aria-busy={loading}
        style={{ aspectRatio: `${head.width} / ${head.height}`, backgroundColor: head.backdrop }}
        className={`relative isolate w-full touch-pan-y select-none overflow-hidden rounded-sm bg-[#0d0e10] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-night-ink ${
          ready ? "cursor-grab active:cursor-grabbing" : ""
        }`}
      >
        {/* Shown before the first frame is decoded (and without JavaScript). */}
        {/* eslint-disable-next-line @next/next/no-img-element -- a plain poster under the canvas; next/image would add a wrapper and a second request size */}
        <img
          src={frameUrl(heads[0], 720, 0)}
          srcSet={`${frameUrl(heads[0], 720, 0)} 720w, ${frameUrl(heads[0], 1440, 0)} 1440w`}
          sizes="(min-width: 1024px) 620px, calc(100vw - 32px)"
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          style={fade}
          className={`absolute inset-0 h-full w-full ${drawn ? "invisible" : ""}`}
        />
        <canvas ref={canvasRef} aria-hidden style={fade} className={`absolute inset-0 h-full w-full ${drawn ? "" : "invisible"}`} />

        {/* Studio light: a soft cone from above and the turntable's lit rim, in barber-pole colors. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-screen"
          style={{
            background:
              "radial-gradient(38% 52% at 50% -8%, rgba(255,255,255,.075), transparent 70%), radial-gradient(60% 14% at 50% 104%, rgba(93,134,232,.16), transparent 70%)",
          }}
        />
        <div aria-hidden className="grain pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[12%] bottom-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(229,83,75,.7), rgba(243,241,236,.8), rgba(93,134,232,.7), transparent)",
          }}
        />

        {/* Loading: a hairline that fills along the bottom edge. */}
        <div
          aria-hidden
          className={`pointer-events-none absolute bottom-0 left-0 h-[2px] bg-night-ink/80 ${loading ? "" : "hidden"}`}
          style={{ width: `${progress * 100}%` }}
        />

      </div>

      {/* Tells screen-reader users the stage is loading; empty once it can turn. */}
      <p aria-live="polite" className="sr-only">
        {loading ? loadingLabel : ""}
      </p>

      <div aria-hidden className="mt-3 flex items-center justify-between gap-4 font-mono text-[13px] text-night-muted">
        <span ref={readoutRef} className="tabular-nums text-night-ink/85">
          0°
        </span>
        <span>{hint}</span>
      </div>

      {heads.length > 1 ? (
        // Two columns on phones (names wrap inside the button), a wrapping row from 640px.
        <div role="group" aria-label={pickerLabel} className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {heads.map((h, i) => {
            const on = i === selected;
            return (
              <button
                key={h.id}
                type="button"
                aria-pressed={on}
                onClick={() => setSelected(i)}
                className={`flex min-h-11 min-w-0 items-center gap-2 rounded-md px-3 py-2 text-left font-mono text-[14px] leading-snug transition-colors sm:px-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-night-ink ${
                  on ? "bg-night-raised text-night-ink" : "text-night-muted hover:bg-night-panel hover:text-night-ink"
                }`}
              >
                <span aria-hidden className={`h-[7px] w-3.5 shrink-0 rounded-full ${on ? "bg-pole-red" : "bg-night-line"}`} />
                {h.name[locale]}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 font-mono text-[14px] text-night-ink/85">{name}</p>
      )}
    </div>
  );
}
