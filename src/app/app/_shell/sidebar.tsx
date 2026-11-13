"use client";

import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";

/**
 * The desktop sidebar's collapsed/expanded state (≥ 1024px). It lives on
 * <html data-sidebar="collapsed|expanded">, put there before paint by the root layout's
 * inline script from the `sidebar` cookie, so the first paint is already right; CSS
 * (globals.css → "Staff app sidebar") draws both states from it. This module flips it.
 */
export const SIDEBAR_COOKIE = "sidebar";
const CHANGE_EVENT = "bm-sidebar-change";
const COLLAPSED = "collapsed";

function readCollapsed() {
  return document.documentElement.getAttribute("data-sidebar") === COLLAPSED;
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

/** Whether the sidebar is collapsed; `initial` (the server's read of the cookie) until hydrated. */
export function useSidebarCollapsed(initial: boolean) {
  return useSyncExternalStore(subscribe, readCollapsed, () => initial);
}

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Flips the state and slides the content column to its new place (FLIP: the margin changes
 * in one layout step, then a translate eases it from where it was, in step with the
 * sidebar's clip-path transition).
 */
function toggleSidebar() {
  const next = readCollapsed() ? "expanded" : COLLAPSED;
  const content = document.querySelector<HTMLElement>(".shell-content");
  const before = content?.getBoundingClientRect().left ?? 0;

  document.documentElement.setAttribute("data-sidebar", next);
  document.cookie = `${SIDEBAR_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new Event(CHANGE_EVENT));

  if (!content || reducedMotion()) return;
  const delta = before - content.getBoundingClientRect().left;
  if (!delta) return;
  const css = getComputedStyle(document.documentElement);
  content.animate([{ translate: `${delta}px 0` }, { translate: "0 0" }], {
    duration: parseFloat(css.getPropertyValue("--dur-slow")) || 420,
    easing: css.getPropertyValue("--ease-spring").trim() || "ease-out",
  });
}

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.closest("input, textarea, select, [contenteditable]") !== null;
}

/**
 * The button at the top of the sidebar, plus the `[` shortcut. Its name says what it does
 * ("Hide sidebar" / "Show sidebar") and aria-expanded says the state.
 */
export function SidebarToggle({
  controls,
  initialCollapsed,
  hideLabel,
  showLabel,
}: {
  controls: string;
  initialCollapsed: boolean;
  hideLabel: string;
  showLabel: string;
}) {
  const collapsed = useSidebarCollapsed(initialCollapsed);
  const label = collapsed ? showLabel : hideLabel;

  // React's dev-only remount can clear attributes the inline script set on <html>; put the
  // saved state back before paint (a no-op in production).
  useLayoutEffect(() => {
    const m = document.cookie.match(/(?:^|; )sidebar=(collapsed|expanded)(?:;|$)/);
    if (m && document.documentElement.getAttribute("data-sidebar") !== m[1]) {
      document.documentElement.setAttribute("data-sidebar", m[1]);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }
  }, []);

  useEffect(() => {
    const desktop = matchMedia("(min-width: 1024px)");
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "[" || e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (!desktop.matches || isTyping(e.target) || document.querySelector("dialog[open]")) return;
      e.preventDefault();
      toggleSidebar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={label}
      aria-expanded={!collapsed}
      aria-controls={controls}
      aria-keyshortcuts="["
      title={`${label} ([)`}
      className="press inline-grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
        <path d="M9.5 4.5v15" />
      </svg>
    </button>
  );
}
