"use client";

import type { ShaderMount } from "@paper-design/shaders";
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type KeyboardEvent, type MouseEvent } from "react";

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

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & { type?: "button" | "submit" };

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A black pill inside a moving liquid metal ring (`.lmb-*` in globals.css).
 * The WebGL shader is fetched only when the button comes near the screen; until then, and
 * wherever WebGL is missing, a still metallic gradient draws the ring. The shader stops under
 * reduced motion, pauses off screen (ShaderMount's own IntersectionObserver) and is freed on unmount.
 */
export function LiquidMetalButton({ type = "button", className = "", children, onClick, onKeyDown, onKeyUp, onBlur, ...rest }: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const shaderRef = useRef<HTMLSpanElement>(null);
  const mount = useRef<ShaderMount | null>(null);
  const hovered = useRef(false);
  const burstTimer = useRef<number | undefined>(undefined);
  const rippleId = useRef(0);
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const [keyPressed, setKeyPressed] = useState(false);

  useEffect(() => {
    const host = shaderRef.current;
    const button = buttonRef.current;
    if (!host || !button) return;
    let live = true;

    const start = async () => {
      try {
        const { ShaderMount, liquidMetalFragmentShader } = await import("@paper-design/shaders");
        if (!live) return;
        mount.current = new ShaderMount(host, liquidMetalFragmentShader, UNIFORMS, undefined, reducedMotion() ? 0 : SPEED.rest);
      } catch {
        // No WebGL: drop the half-made canvas and keep the CSS ring.
        host.querySelector("canvas")?.remove();
      }
    };

    // Fetch the shader only once the button is near the screen.
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        void start();
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(button);

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => mount.current?.setSpeed(motion.matches ? 0 : SPEED.rest);
    motion.addEventListener("change", onMotion);

    return () => {
      live = false;
      io.disconnect();
      motion.removeEventListener("change", onMotion);
      window.clearTimeout(burstTimer.current);
      mount.current?.dispose();
      mount.current = null;
      host.querySelector("canvas")?.remove();
    };
  }, []);

  const setSpeed = (speed: number) => {
    if (!reducedMotion()) mount.current?.setSpeed(speed);
  };

  const burst = (e: MouseEvent<HTMLButtonElement>) => {
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

  const isPressKey = (key: string) => key === "Enter" || key === " ";

  return (
    <button
      ref={buttonRef}
      type={type}
      className={`lmb ${className}`}
      data-pressed={keyPressed || undefined}
      onClick={(e) => {
        burst(e);
        onClick?.(e);
      }}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        hovered.current = true;
        setSpeed(SPEED.hover);
      }}
      onPointerLeave={() => {
        hovered.current = false;
        setSpeed(SPEED.rest);
      }}
      onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
        if (isPressKey(e.key) && !e.repeat) setKeyPressed(true);
        onKeyDown?.(e);
      }}
      onKeyUp={(e: KeyboardEvent<HTMLButtonElement>) => {
        if (isPressKey(e.key)) setKeyPressed(false);
        onKeyUp?.(e);
      }}
      onBlur={(e) => {
        setKeyPressed(false);
        onBlur?.(e);
      }}
      {...rest}
    >
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
    </button>
  );
}
