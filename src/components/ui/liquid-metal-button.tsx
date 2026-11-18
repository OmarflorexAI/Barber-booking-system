"use client";

import type { ShaderMount } from "@paper-design/shaders";
import {
  useEffect,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type FocusEvent,
  type PointerEvent,
  type RefObject,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

/** Shader speeds: at rest, under the mouse, and the short burst after a press. */
const SPEED = { rest: 0.6, hover: 1, burst: 2.4 } as const;

/**
 * The liquid metal settings. The color shifts stay low so the metal reads as neutral silver:
 * barber red is the page's only accent.
 */
const UNIFORMS = {
  u_repetition: 4,
  u_softness: 0.5,
  u_shiftRed: 0.05,
  u_shiftBlue: 0.05,
  u_distortion: 0,
  u_contour: 0,
  u_angle: 45,
  u_scale: 8,
  u_shape: 1,
  u_offsetX: 0.1,
  u_offsetY: -0.1,
};

type Look = {
  /** `md` is 48px tall (forms, cards); `sm` is 38px (the nav bar), with a 44px hit area. */
  size?: "md" | "sm";
  /** `quiet` dims the ring until hover: the second of two side-by-side actions. */
  tone?: "metal" | "quiet";
  className?: string;
  children?: ReactNode;
};
type AsButton = Look & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "className" | "children"> & { href?: undefined; type?: "button" | "submit" };
type AsLink = Look & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children"> & { href: string };
type Props = AsButton | AsLink;

type Handler<E> = ((e: E) => void) | undefined;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Runs `fn` when the main thread is free (or after `timeout` ms at the latest); returns a cancel. */
function whenIdle(fn: () => void, timeout: number) {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(fn, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, 1);
  return () => window.clearTimeout(id);
}

/** One shared fetch of the shader module, warmed in idle time after the page loads. */
let shaderModule: Promise<typeof import("@paper-design/shaders")> | null = null;
const loadShaders = () => (shaderModule ??= import("@paper-design/shaders"));

/**
 * A black pill inside a moving liquid metal ring (`.lmb-*` in globals.css). With `href` it is
 * a real link (`<a>`), otherwise a `<button>`. The WebGL shader is fetched and mounted only
 * while the control is near the screen, and freed (its WebGL context released) when it moves
 * away or is hidden, so a page holds only a few live contexts at once. Until it draws, and
 * wherever WebGL is missing, a still metallic gradient draws the ring. Under reduced motion
 * the shader is never mounted (the still gradient stays) and there is no ripple.
 */
export function LiquidMetalButton(props: Props) {
  const { size = "md", tone = "metal", className = "", children, onClick, onKeyDown, onKeyUp, onBlur, onPointerEnter, onPointerLeave, ...rest } = props;
  const hostRef = useRef<HTMLElement>(null);
  const shaderRef = useRef<HTMLSpanElement>(null);
  const mount = useRef<ShaderMount | null>(null);
  const hovered = useRef(false);
  const burstTimer = useRef<number | undefined>(undefined);
  const rippleId = useRef(0);
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const [keyPressed, setKeyPressed] = useState(false);
  const isLink = typeof props.href === "string";

  useEffect(() => {
    const host = shaderRef.current;
    const el = hostRef.current;
    if (!host || !el) return;
    let live = true;
    let near = false;
    let loading = false;

    const free = () => {
      mount.current?.dispose();
      mount.current = null;
      host.querySelector("canvas")?.remove();
    };

    const start = async () => {
      // Reduced motion: the CSS ring is already still, so skip the WebGL setup (a long frame mid-scroll).
      if (mount.current || loading || reducedMotion()) return;
      loading = true;
      try {
        const { ShaderMount, liquidMetalFragmentShader } = await loadShaders();
        // Moved away (or unmounted) while the module loaded: don't take a context.
        if (!live || !near) return;
        mount.current = new ShaderMount(host, liquidMetalFragmentShader, UNIFORMS, undefined, SPEED.rest);
      } catch {
        // No WebGL: drop the half-made canvas and keep the CSS ring.
        free();
      } finally {
        loading = false;
      }
    };

    // Fetch the module once the page is idle, so it is ready before any control comes near.
    const cancelWarm = whenIdle(() => void (reducedMotion() || loadShaders().catch(() => {})), 4000);
    // Mount a screen or so ahead of the control, in idle time, so the WebGL setup does not land
    // in the middle of a scroll; free it when it leaves (a hidden control never intersects).
    // The shaders' base style is already in the page (root layout), so mounting restyles nothing.
    let cancelStart = () => {};
    const io = new IntersectionObserver(
      ([e]) => {
        near = e.isIntersecting;
        cancelStart();
        if (near) cancelStart = whenIdle(() => void start(), 1000);
        else free();
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Turning reduced motion on drops the shader for the still CSS ring; turning it off brings it back.
    const onMotion = () => {
      if (motion.matches) free();
      else if (near) void start();
    };
    motion.addEventListener("change", onMotion);

    return () => {
      live = false;
      cancelWarm();
      cancelStart();
      io.disconnect();
      motion.removeEventListener("change", onMotion);
      window.clearTimeout(burstTimer.current);
      free();
    };
  }, []);

  const setSpeed = (speed: number) => {
    if (!reducedMotion()) mount.current?.setSpeed(speed);
  };

  const burst = (e: MouseEvent<HTMLElement>) => {
    if (reducedMotion()) return;
    setSpeed(SPEED.burst);
    window.clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => setSpeed(hovered.current ? SPEED.hover : SPEED.rest), 300);
    const rect = e.currentTarget.getBoundingClientRect();
    // A keyboard click has no pointer position (detail 0): ripple from the center.
    const fromPointer = e.detail > 0;
    const ripple = {
      x: fromPointer ? e.clientX - rect.left : rect.width / 2,
      y: fromPointer ? e.clientY - rect.top : rect.height / 2,
      id: rippleId.current++,
    };
    setRipples((prev) => [...prev, ripple]);
    window.setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== ripple.id)), 600);
  };

  // A link activates on Enter only; a button on Enter and Space.
  const isPressKey = (key: string) => key === "Enter" || (!isLink && key === " ");

  // The caller's handlers, typed for whichever element this renders.
  const call = <E,>(fn: unknown, e: E) => (fn as Handler<E>)?.(e);

  const shared = {
    className: `lmb${size === "sm" ? " lmb-sm" : ""}${tone === "quiet" ? " lmb-quiet" : ""} ${className}`,
    "data-pressed": keyPressed || undefined,
    onClick: (e: MouseEvent<HTMLElement>) => {
      burst(e);
      call(onClick, e);
    },
    onPointerEnter: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse") {
        hovered.current = true;
        setSpeed(SPEED.hover);
      }
      call(onPointerEnter, e);
    },
    onPointerLeave: (e: PointerEvent<HTMLElement>) => {
      hovered.current = false;
      setSpeed(SPEED.rest);
      call(onPointerLeave, e);
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (isPressKey(e.key) && !e.repeat) setKeyPressed(true);
      call(onKeyDown, e);
    },
    onKeyUp: (e: KeyboardEvent<HTMLElement>) => {
      if (isPressKey(e.key)) setKeyPressed(false);
      call(onKeyUp, e);
    },
    onBlur: (e: FocusEvent<HTMLElement>) => {
      setKeyPressed(false);
      call(onBlur, e);
    },
  };

  const inner = (
    <>
      <span aria-hidden="true" className="lmb-ring">
        <span ref={shaderRef} className="lmb-shader" />
      </span>
      <span aria-hidden="true" className="lmb-pill" />
      <span aria-hidden="true" className="lmb-ripples">
        {ripples.map((r) => (
          <span key={r.id} className="lmb-ripple" style={{ left: r.x, top: r.y }} />
        ))}
      </span>
      <span className="lmb-label">{children}</span>
    </>
  );

  if (isLink) {
    const linkRest = rest as Omit<AsLink, keyof Look | "onClick" | "onKeyDown" | "onKeyUp" | "onBlur" | "onPointerEnter" | "onPointerLeave">;
    return (
      <a ref={hostRef as RefObject<HTMLAnchorElement>} {...linkRest} {...shared}>
        {inner}
      </a>
    );
  }
  // `href` is undefined here and spreads as nothing.
  const { type = "button", ...buttonRest } = rest as Omit<AsButton, keyof Look | "onClick" | "onKeyDown" | "onKeyUp" | "onBlur" | "onPointerEnter" | "onPointerLeave">;
  return (
    <button ref={hostRef as RefObject<HTMLButtonElement>} type={type} {...buttonRest} {...shared}>
      {inner}
    </button>
  );
}
