"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";

/*
 * AnimatedGradient: a WebGL2 shader background (swirled checks, stripes or an edge).
 * Pasted from a component library and hardened for a landing page:
 * - pauses while off-screen or while the tab is hidden (IntersectionObserver + visibilitychange)
 * - draws one still frame when the visitor prefers reduced motion
 * - caps the canvas resolution (`maxDpr`), since the soft shapes don't need retina pixels
 * - parses the colors once, not on every frame
 * - fades the canvas in after its first frame, over the container's own CSS background
 *   (pass one in `style`/`className` as the no-WebGL fallback)
 */

type PatternShape = "Checks" | "Stripes" | "Edge";

const PatternShapes: Record<PatternShape, number> = { Checks: 0, Stripes: 1, Edge: 2 };

interface PresetParams {
  color1: string;
  color2: string;
  color3: string;
  rotation: number;
  proportion: number;
  scale: number;
  speed: number;
  distortion: number;
  swirl: number;
  swirlIterations: number;
  softness: number;
  offset: number;
  shape: PatternShape;
  shapeSize: number;
}

type PresetName = "Prism" | "Lava" | "Plasma" | "Pulse" | "Vortex" | "Mist";

const presets: Record<PresetName, PresetParams> = {
  Prism: { color1: "#050505", color2: "#66B3FF", color3: "#FFFFFF", rotation: -50, proportion: 1, scale: 0.01, speed: 30, distortion: 0, swirl: 50, swirlIterations: 16, softness: 47, offset: -299, shape: "Checks", shapeSize: 45 },
  Lava: { color1: "#FF9F21", color2: "#FF0303", color3: "#000000", rotation: 114, proportion: 100, scale: 0.52, speed: 30, distortion: 7, swirl: 18, swirlIterations: 20, softness: 100, offset: 717, shape: "Edge", shapeSize: 12 },
  Plasma: { color1: "#B566FF", color2: "#000000", color3: "#000000", rotation: 0, proportion: 63, scale: 0.75, speed: 30, distortion: 5, swirl: 61, swirlIterations: 5, softness: 100, offset: -168, shape: "Checks", shapeSize: 28 },
  Pulse: { color1: "#66FF85", color2: "#000000", color3: "#000000", rotation: -167, proportion: 92, scale: 0, speed: 20, distortion: 54, swirl: 75, swirlIterations: 3, softness: 28, offset: -813, shape: "Checks", shapeSize: 79 },
  Vortex: { color1: "#000000", color2: "#FFFFFF", color3: "#000000", rotation: 50, proportion: 41, scale: 0.4, speed: 20, distortion: 0, swirl: 100, swirlIterations: 3, softness: 5, offset: -744, shape: "Stripes", shapeSize: 80 },
  Mist: { color1: "#050505", color2: "#FF66B8", color3: "#050505", rotation: 0, proportion: 33, scale: 0.48, speed: 39, distortion: 4, swirl: 65, swirlIterations: 5, softness: 100, offset: -235, shape: "Edge", shapeSize: 48 },
};

export interface CustomConfig {
  preset: "custom";
  color1: string;
  color2: string;
  color3: string;
  rotation?: number;
  proportion?: number;
  scale?: number;
  speed?: number;
  distortion?: number;
  swirl?: number;
  swirlIterations?: number;
  softness?: number;
  offset?: number;
  shape?: PatternShape;
  shapeSize?: number;
}

interface PresetConfig {
  preset: PresetName;
  speed?: number;
}

export type GradientConfig = CustomConfig | PresetConfig;

interface NoiseConfig {
  opacity: number;
  scale?: number;
}

interface AnimatedGradientProps {
  config?: GradientConfig;
  noise?: NoiseConfig;
  radius?: string;
  /** Highest device pixel ratio the canvas renders at. The shapes are soft, so 1 is plenty. */
  maxDpr?: number;
  style?: CSSProperties;
  className?: string;
}

export default function AnimatedGradient({
  config = { preset: "Prism" },
  noise,
  radius = "0px",
  maxDpr = 1,
  style,
  className,
}: AnimatedGradientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Depend on the config's content, not its identity, so inline objects don't restart the shader.
  const configKey = JSON.stringify(config);
  const params = useMemo((): PresetParams => {
    const c = JSON.parse(configKey) as GradientConfig;
    if (c.preset === "custom") {
      return {
        color1: c.color1,
        color2: c.color2,
        color3: c.color3,
        rotation: c.rotation ?? 0,
        proportion: c.proportion ?? 35,
        scale: c.scale ?? 1,
        speed: c.speed ?? 25,
        distortion: c.distortion ?? 12,
        swirl: c.swirl ?? 80,
        swirlIterations: c.swirlIterations ?? 10,
        softness: c.softness ?? 100,
        offset: c.offset ?? 0,
        shape: c.shape ?? "Checks",
        shapeSize: c.shapeSize ?? 10,
      };
    }
    const preset = presets[c.preset] || presets.Prism;
    return { ...preset, speed: c.speed ?? preset.speed };
  }, [configKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return; // The container's CSS background stays as the fallback.

    const vertexShader = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uniforms = {
      time: u("u_time"),
      resolution: u("u_resolution"),
      pixelRatio: u("u_pixelRatio"),
    };

    // Everything except time and size is constant: set it once.
    const [c1, c2, c3] = [params.color1, params.color2, params.color3].map(hexToRgba);
    gl.uniform1f(u("u_scale"), params.scale);
    gl.uniform1f(u("u_rotation"), (params.rotation * Math.PI) / 180);
    gl.uniform4f(u("u_color1"), ...c1);
    gl.uniform4f(u("u_color2"), ...c2);
    gl.uniform4f(u("u_color3"), ...c3);
    gl.uniform1f(u("u_proportion"), params.proportion / 100);
    gl.uniform1f(u("u_softness"), params.softness / 100);
    gl.uniform1f(u("u_shape"), PatternShapes[params.shape]);
    gl.uniform1f(u("u_shapeScale"), params.shapeSize / 100);
    gl.uniform1f(u("u_distortion"), params.distortion / 50);
    gl.uniform1f(u("u_swirl"), params.swirl / 100);
    gl.uniform1f(u("u_swirlIterations"), params.swirl === 0 ? 0 : params.swirlIterations);

    let ratio = 1;
    const resize = () => {
      ratio = Math.min(window.devicePixelRatio || 1, maxDpr);
      canvas.width = Math.max(1, Math.round(container.clientWidth * ratio));
      canvas.height = Math.max(1, Math.round(container.clientHeight * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.pixelRatio, ratio);
      if (!running) draw(); // keep a still frame correct after a resize
    };

    const speed = (params.speed / 100) * 5;
    const offset = params.offset * 0.01;
    let elapsed = 0; // seconds of animation actually shown; pausing doesn't skip ahead
    let last = 0;
    let frame: number | undefined;
    let running = false;
    let shown = false;

    const draw = () => {
      gl.uniform1f(uniforms.time, elapsed * speed + offset);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (!shown) {
        shown = true;
        canvas.style.opacity = "1";
      }
    };
    const tick = (now: number) => {
      if (last) elapsed += Math.min((now - last) / 1000, 0.1);
      last = now;
      draw();
      frame = requestAnimationFrame(tick);
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let onScreen = false;
    const update = () => {
      const shouldRun = onScreen && !document.hidden && !reduce.matches;
      if (shouldRun === running) return;
      running = shouldRun;
      if (running) {
        last = 0;
        frame = requestAnimationFrame(tick);
      } else {
        if (frame !== undefined) cancelAnimationFrame(frame);
        draw();
      }
    };

    resize();
    draw();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      update();
    });
    io.observe(container);
    document.addEventListener("visibilitychange", update);
    reduce.addEventListener("change", update);

    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", update);
      reduce.removeEventListener("change", update);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
    };
  }, [params, maxDpr]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={className}
      style={{ position: "absolute", inset: 0, zIndex: -1, borderRadius: radius, overflow: "hidden", ...style }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%", opacity: 0, transition: "opacity 1.2s ease-out" }}
      />
      {noise && noise.opacity > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwBAMAAAClLOS0AAAAElBMVEUAAAAAAAAAAAAAAAAAAAAAAADgKxmiAAAABnRSTlMCCgkGBAVJOAVJAAAASklEQVQ4y2NgGAWjYBSMglEwCgY/YGRgZBQUYmJiZGQEkYwMjIyMgoKCjIyMIJKBgRFIMjIyAklGRkYGRkFBYEcwMDIyMjAOUQAA1I4HwVwZAkYAAAAASUVORK5CYII=")`,
            backgroundSize: (noise.scale ?? 1) * 200,
            backgroundRepeat: "repeat",
            opacity: noise.opacity / 2,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

function hexToRgba(hex: string): [number, number, number, number] {
  let r = 0,
    g = 0,
    b = 0,
    a = 1;

  if (hex.startsWith("rgba(")) {
    const parts = hex.slice(5, -1).split(",");
    r = parseInt(parts[0]) / 255;
    g = parseInt(parts[1]) / 255;
    b = parseInt(parts[2]) / 255;
    a = parseFloat(parts[3]);
  } else if (hex.startsWith("rgb(")) {
    const parts = hex.slice(4, -1).split(",");
    r = parseInt(parts[0]) / 255;
    g = parseInt(parts[1]) / 255;
    b = parseInt(parts[2]) / 255;
  } else if (hex.startsWith("hsla(") || hex.startsWith("hsl(")) {
    const isHsla = hex.startsWith("hsla(");
    const parts = hex.slice(isHsla ? 5 : 4, -1).split(",");
    const h = parseFloat(parts[0]) / 360;
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    a = isHsla ? parseFloat(parts[3]) : 1;
    [r, g, b] = hslToRgb(h, s, l);
  } else if (hex.startsWith("#")) {
    const c = hex.slice(1);
    if (c.length === 3) {
      r = parseInt(c[0] + c[0], 16) / 255;
      g = parseInt(c[1] + c[1], 16) / 255;
      b = parseInt(c[2] + c[2], 16) / 255;
    } else if (c.length >= 6) {
      r = parseInt(c.slice(0, 2), 16) / 255;
      g = parseInt(c.slice(2, 4), 16) / 255;
      b = parseInt(c.slice(4, 6), 16) / 255;
      if (c.length === 8) a = parseInt(c.slice(6, 8), 16) / 255;
    }
  }

  return [r, g, b, a];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l];
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
}

const VERTEX_SHADER = `#version 300 es
in vec4 a_position;
void main() {
  gl_Position = a_position;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform float u_time;
uniform float u_pixelRatio;
uniform vec2 u_resolution;

uniform float u_scale;
uniform float u_rotation;
uniform vec4 u_color1;
uniform vec4 u_color2;
uniform vec4 u_color3;
uniform float u_proportion;
uniform float u_softness;
uniform float u_shape;
uniform float u_shapeScale;
uniform float u_distortion;
uniform float u_swirl;
uniform float u_swirlIterations;

out vec4 fragColor;

#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846

vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}

vec4 blend_colors(vec4 c1, vec4 c2, vec4 c3, float mixer, float edgesWidth, float edge_blur) {
  vec3 color1 = c1.rgb * c1.a;
  vec3 color2 = c2.rgb * c2.a;
  vec3 color3 = c3.rgb * c3.a;

  float r1 = smoothstep(.0 + .35 * edgesWidth, .7 - .35 * edgesWidth + .5 * edge_blur, mixer);
  float r2 = smoothstep(.3 + .35 * edgesWidth, 1. - .35 * edgesWidth + edge_blur, mixer);

  vec3 blended_color_2 = mix(color1, color2, r1);
  float blended_opacity_2 = mix(c1.a, c2.a, r1);

  vec3 c = mix(blended_color_2, color3, r2);
  float o = mix(blended_opacity_2, c3.a, r2);
  return vec4(c, o);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;

  float t = .5 * u_time;

  float noise_scale = .0005 + .006 * u_scale;

  uv -= .5;
  uv *= (noise_scale * u_resolution);
  uv = rotate(uv, u_rotation * .5 * PI);
  uv /= u_pixelRatio;
  uv += .5;

  float n1 = noise(uv * 1. + t);
  float n2 = noise(uv * 2. - t);
  float angle = n1 * TWO_PI;
  uv.x += 4. * u_distortion * n2 * cos(angle);
  uv.y += 4. * u_distortion * n2 * sin(angle);

  float iterations_number = ceil(clamp(u_swirlIterations, 1., 30.));
  for (float i = 1.; i <= iterations_number; i++) {
    uv.x += clamp(u_swirl, 0., 2.) / i * cos(t + i * 1.5 * uv.y);
    uv.y += clamp(u_swirl, 0., 2.) / i * cos(t + i * 1. * uv.x);
  }

  float proportion = clamp(u_proportion, 0., 1.);

  float shape = 0.;
  float mixer = 0.;
  if (u_shape < .5) {
    vec2 checks_shape_uv = uv * (.5 + 3.5 * u_shapeScale);
    shape = .5 + .5 * sin(checks_shape_uv.x) * cos(checks_shape_uv.y);
    mixer = shape + .48 * sign(proportion - .5) * pow(abs(proportion - .5), .5);
  } else if (u_shape < 1.5) {
    vec2 stripes_shape_uv = uv * (.25 + 3. * u_shapeScale);
    float f = fract(stripes_shape_uv.y);
    shape = smoothstep(.0, .55, f) * smoothstep(1., .45, f);
    mixer = shape + .48 * sign(proportion - .5) * pow(abs(proportion - .5), .5);
  } else {
    float sh = 1. - uv.y;
    sh -= .5;
    sh /= (noise_scale * u_resolution.y);
    sh += .5;
    float shape_scaling = .2 * (1. - u_shapeScale);
    shape = smoothstep(.45 - shape_scaling, .55 + shape_scaling, sh + .3 * (proportion - .5));
    mixer = shape;
  }

  vec4 color_mix = blend_colors(u_color1, u_color2, u_color3, mixer, 1. - clamp(u_softness, 0., 1.), .01 + .01 * u_scale);

  fragColor = vec4(color_mix.rgb, color_mix.a);
}
`;
