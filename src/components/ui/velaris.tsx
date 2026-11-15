"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/**
 * Velaris: a slow WebGL simplex-noise gradient used as a decorative background (no text in it).
 * Production notes:
 * - The DPR is capped at 1.5 and the loop runs at ~30fps; the noise is soft, so nothing is lost.
 * - The loop pauses off-screen (IntersectionObserver) and while the tab is hidden.
 * - Under prefers-reduced-motion it draws one still frame and stops.
 * - Without WebGL (or if a shader fails to compile/link) the static CSS gradient underneath
 *   stays; with WebGL the canvas fades in over it once its first frame is drawn (opacity only).
 * - Each mount makes its own canvas; the GL context is released and the canvas removed on unmount
 *   (and, with `releaseOffscreen`, whenever the element moves well off screen).
 * - The output is clamped to a maximum luminance (~34% lightness) so muted text keeps 4.5:1.
 * - The pattern is anchored to the top in pixel space and the canvas height moves in 640px
 *   steps, so the band growing or shrinking (FAQ answers) never flashes or rescales it.
 */
export type VelarisProps = {
  /** Up to four accent colours (hex), blended by the noise over `bg`. */
  colors?: [string, string, string, string];
  /** Ground colour (hex). Omitted: the page ground, read from the element's computed `--l-bg`. */
  bg?: string;
  /** Animation speed multiplier (1 = default drift). */
  speed?: number;
  /** Film grain amount, 0 to 1. */
  grain?: number;
  /** Highest relative luminance (0 to 1) any pixel may reach. */
  maxLuminance?: number;
  height?: string;
  /**
   * Take the WebGL context only while the element is near the screen (200px margin) and
   * release it when it moves away, so a band at the top of the page doesn't hold a context
   * while the visitor reads further down. The CSS gradient underneath shows meanwhile.
   */
  releaseOffscreen?: boolean;
  className?: string;
  style?: CSSProperties;
};

const VERT = `attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// The user's Velaris shader (2D simplex noise layers, centre glow, vignette, grain), plus a
// luminance ceiling so muted text over the band keeps 4.5:1.
const FRAG = `precision highp float;
varying vec2 vUv;
uniform vec2 u_resolution;
uniform float u_scale;
uniform float u_time;
uniform float u_grain;
uniform float u_maxLum;
uniform vec3 u_colors[4];
uniform vec3 u_bg;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = vUv;
  // Pixel space from the top centre, in units of u_scale: the band growing (an FAQ answer
  // opening) only reveals more pattern below, it never stretches what is already drawn.
  vec2 p = vec2(gl_FragCoord.x - u_resolution.x * 0.5, u_resolution.y - gl_FragCoord.y) / u_scale;
  float t = u_time * 0.1;

  float n1 = snoise(p * 0.4 + vec2(t * 0.2, -t * 0.3));
  float n2 = snoise(p * 0.55 + vec2(-t * 0.15, t * 0.25) + n1 * 0.25);
  float n3 = snoise(p * 0.75 + vec2(t * 0.1, -t * 0.2) + n2 * 0.2);

  vec3 col = u_bg;
  // Centre glow and vignette run across the width only (the CSS mask feathers top and bottom).
  float dist = abs(gl_FragCoord.x / u_resolution.x - 0.5) * 2.0;
  float vignette = 1.0 - smoothstep(0.5, 1.7, dist);

  col = mix(col, u_colors[0], smoothstep(-0.2, 0.5, n1) * 0.85);
  col = mix(col, u_colors[1], smoothstep(-0.1, 0.6, n2) * 0.7);
  col = mix(col, u_colors[2], smoothstep(-0.3, 0.4, n3) * 0.6);
  col = mix(col, u_colors[3], smoothstep(0.0, 0.7, n1 * n2) * 0.5);

  float glow = smoothstep(1.1, 0.0, dist) * 0.3;
  col += u_colors[1] * glow;
  col = mix(col * 0.5, col, vignette);
  // Never darker than the page ground, so the band's edges meet the page.
  col = max(col, u_bg * 0.85);

  vec3 lin = pow(max(col, 0.0), vec3(2.2));
  float lum = dot(lin, vec3(0.2126, 0.7152, 0.0722));
  col *= pow(min(1.0, u_maxLum / max(lum, 1e-5)), 1.0 / 2.2);

  float grain = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453 + u_time);
  col += (grain - 0.5) * u_grain * 0.1;
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}`;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s);
    return null;
  }
  return s;
}

const DEFAULT_COLORS: [string, string, string, string] = ["#1a1b1f", "#2e3137", "#3a3d44", "#08080a"];

/** Any CSS colour (oklch, var-resolved) to 0..1 sRGB, via a 1px 2D canvas. */
function cssToRgb(css: string): [number, number, number] | null {
  const c = document.createElement("canvas").getContext("2d");
  if (!c || !css) return null;
  c.fillStyle = "#000";
  c.fillStyle = css;
  c.fillRect(0, 0, 1, 1);
  const d = c.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255];
}

/** Makes the canvas and its GL context; returns the teardown that releases both. */
type GlOptions = { colorKey: string; bg?: string; speed: number; grain: number; maxLuminance: number };

function mountGl(root: HTMLDivElement, { colorKey, bg, speed, grain, maxLuminance }: GlOptions): () => void {
  const noop = () => {};
  // A fresh canvas per mount: a context lost on unmount can't be reused (Strict Mode remounts).
  const canvas = document.createElement("canvas");
  canvas.className = "velaris-canvas";
  root.appendChild(canvas);
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "low-power", premultipliedAlpha: false });
  if (!gl) {
    canvas.remove();
    return noop; // The CSS gradient underneath stays.
  }

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram();
  const lose = () => {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    canvas.remove();
  };
  if (!vs || !fs || !program) {
    lose();
    return noop;
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    lose();
    return noop;
  }
  gl.useProgram(program);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uRes = u("u_resolution");
  const uTime = u("u_time");
  gl.uniform1f(u("u_grain"), grain);
  gl.uniform1f(u("u_maxLum"), maxLuminance);
  const ground = bg ? hexToRgb(bg) : (cssToRgb(getComputedStyle(root).getPropertyValue("--l-bg").trim()) ?? [0, 0, 0]);
  gl.uniform3fv(u("u_bg"), ground);
  const cs = colorKey.split(",");
  gl.uniform3fv(u("u_colors"), new Float32Array([0, 1, 2, 3].flatMap((i) => (cs[i] ? hexToRgb(cs[i]) : ground))));
  const uScale = u("u_scale");

  // The canvas is pinned to the top of the band and its height rounded up to the next
  // 640px step, so a band that grows a little (an FAQ answer unfolding) changes nothing:
  // no backing-store resize, no clear, no flash. The band clips the overhang.
  const STEP = 640;
  const resize = (): boolean => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const cssH = Math.ceil((root.clientHeight + 1) / STEP) * STEP;
    const w = Math.max(1, Math.round(root.clientWidth * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width === w && canvas.height === h) return false;
    canvas.style.height = `${cssH}px`;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uRes, w, h);
    gl.uniform1f(uScale, 1400 * dpr);
    return true;
  };

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  // A random phase so the still frame isn't always the same one.
  let elapsed = 20 + Math.random() * 40;
  let last = 0;
  let raf = 0;
  let visible = false;
  let drawn = false;

  const draw = () => {
    gl.uniform1f(uTime, elapsed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!drawn) {
      drawn = true;
      canvas.dataset.ready = "";
    }
  };
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (now - last < 32) return; // ~30fps is plenty for a slow drift.
    if (last) elapsed += (Math.min(now - last, 100) / 1000) * speed;
    last = now;
    draw();
  };
  const start = () => {
    if (raf || reduce.matches || !visible || document.hidden) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const sync = () => {
    stop();
    if (reduce.matches || !visible || document.hidden) {
      if (visible || !drawn) draw();
    } else start();
  };

  resize();
  draw();
  // Resizing clears the canvas, so redraw in the same callback (before paint).
  const ro = new ResizeObserver(() => {
    if (resize()) draw();
  });
  ro.observe(root);
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  io.observe(canvas);
  document.addEventListener("visibilitychange", sync);
  reduce.addEventListener("change", sync);

  return () => {
    stop();
    ro.disconnect();
    io.disconnect();
    document.removeEventListener("visibilitychange", sync);
    reduce.removeEventListener("change", sync);
    gl.deleteBuffer(buf);
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    lose();
  };
}

export function Velaris({
  colors = DEFAULT_COLORS,
  bg,
  speed = 0.8,
  grain = 0.15,
  maxLuminance = 0.029,
  height = "100%",
  releaseOffscreen = false,
  className = "",
  style,
}: VelarisProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const colorKey = colors.join(",");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const opts = { colorKey, bg, speed, grain, maxLuminance };
    if (!releaseOffscreen) return mountGl(root, opts);
    let unmountGl: (() => void) | null = null;
    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) unmountGl ??= mountGl(root, opts);
        else {
          unmountGl?.();
          unmountGl = null;
        }
      },
      { rootMargin: "200px 0px" },
    );
    near.observe(root);
    return () => {
      near.disconnect();
      unmountGl?.();
    };
  }, [colorKey, bg, speed, grain, maxLuminance, releaseOffscreen]);

  return (
    <div ref={rootRef} aria-hidden="true" className={`velaris ${className}`} style={{ height, ...style }} />
  );
}
