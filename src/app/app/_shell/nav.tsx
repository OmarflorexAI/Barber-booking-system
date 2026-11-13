"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "./icons";
import type { NavKey } from "./staff";

export type NavItem = { key: NavKey; href: string; label: string };

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The phone's bottom tab bar (below 1024px): icon + label per tab on --surface with a --line
 * top edge, 64px tall plus the phone's safe area. The active tab is ink, semibold, with a
 * filled icon and aria-current="page"; the others are muted. No color.
 */
export function TabBar({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid h-[var(--tabbar-h)] max-w-lg" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.key} className="flex">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-lg text-sm transition-colors ${focusRing} ${
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
    </nav>
  );
}

/** The same items as rows in the desktop sidebar (from 1024px). The active row sits one tone step up. */
export function SidebarNav({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label}>
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center gap-3 rounded-xl px-3 transition-colors ${focusRing} ${
                  active ? "bg-raised font-semibold text-ink [--icon-cut:var(--raised)]" : "font-medium text-muted hover:bg-raised hover:text-ink"
                }`}
              >
                <NavIcon name={item.key} filled={active} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
