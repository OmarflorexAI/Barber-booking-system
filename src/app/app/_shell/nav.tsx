"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { NavIcon } from "./icons";
import { useSidebarCollapsed } from "./sidebar";
import type { NavKey } from "./staff";

export type NavItem = { key: NavKey; href: string; label: string };

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The phone's bottom tab bar (below 1024px): icon + label per tab on --surface with a --line
 * top edge, 64px tall plus the phone's safe area. The active tab is ink, semibold, with a
 * filled icon and aria-current="page"; the others are muted. No color. A short ink bar at
 * the top edge slides to the active tab (translate); tabs give a press under the thumb.
 */
export function TabBar({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  const activeIndex = items.findIndex((i) => isActive(pathname, i.href));
  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="relative mx-auto max-w-lg">
      <span
        aria-hidden="true"
        className="tab-indicator pointer-events-none absolute top-0 left-0 flex justify-center"
        style={{ width: `${100 / items.length}%`, "--tab": Math.max(activeIndex, 0), opacity: activeIndex < 0 ? 0 : 1 } as React.CSSProperties}
      >
        <span className="-mt-px h-0.5 w-8 rounded-full bg-ink" />
      </span>
      <ul className="grid h-[var(--tabbar-h)]" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.key} className="flex">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`press flex flex-1 flex-col items-center justify-center gap-1 rounded-lg text-sm transition-colors ${focusRing} ${
                  active ? "font-semibold text-ink" : "font-medium text-muted hover:text-ink"
                }`}
              >
                <NavIcon name={item.key} filled={active} />
                <span className="max-w-full truncate px-1 leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      </div>
    </nav>
  );
}

/** One row of the desktop sidebar (from 1024px): the icon stays in the rail, the label fades when collapsed. */
export function RailLink({
  href,
  label,
  icon,
  active = false,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      // The tooltip only when the label is hidden; the label itself stays readable to screen readers.
      title={collapsed ? label : undefined}
      className={`rail-item press flex min-h-12 items-center gap-3 rounded-xl px-3 ${focusRing} ${
        active ? "bg-raised font-semibold text-ink [--icon-cut:var(--raised)]" : "font-medium text-muted hover:bg-raised hover:text-ink"
      }`}
    >
      {/* The icon never shrinks: in the 48px rail row the label overflows (faded) instead. */}
      <span className="flex shrink-0">{icon}</span>
      <span className="rail-fade whitespace-nowrap">{label}</span>
    </Link>
  );
}

/** The same items as rows in the desktop sidebar (from 1024px). The active row sits one tone step up. */
export function SidebarNav({ items, label, initialCollapsed }: { items: NavItem[]; label: string; initialCollapsed: boolean }) {
  const pathname = usePathname();
  const collapsed = useSidebarCollapsed(initialCollapsed);
  return (
    <nav aria-label={label}>
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.key}>
              <RailLink href={item.href} label={item.label} active={active} collapsed={collapsed} icon={<NavIcon name={item.key} filled={active} />} />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** The Platform admin row at the sidebar's foot, a rail row like the nav's. */
export function SidebarAdminLink({ label, initialCollapsed }: { label: string; initialCollapsed: boolean }) {
  const collapsed = useSidebarCollapsed(initialCollapsed);
  return <RailLink href="/admin" label={label} collapsed={collapsed} icon={<NavIcon name="admin" />} />;
}

/**
 * The shell's <main>. It enters with `.enter` on first paint (CSS, so nothing waits on a
 * script); on each move to another page it plays the same 240ms fade + 8px rise again, before
 * paint, unless the person prefers reduced motion.
 */
export function ShellMain({ className, children }: { className: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);
  const first = useRef(true);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const css = getComputedStyle(document.documentElement);
    el.animate([{ opacity: 0, translate: "0 8px" }, { opacity: 1, translate: "0 0" }], {
      duration: parseFloat(css.getPropertyValue("--dur-base")) || 240,
      easing: css.getPropertyValue("--ease-out").trim() || "ease-out",
    });
  }, [pathname]);

  return (
    <main ref={ref} className={`enter ${className}`}>
      {children}
    </main>
  );
}
