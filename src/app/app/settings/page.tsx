import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronIcon, NavIcon } from "../_shell/icons";
import { SignOutButton } from "../_shell/sign-out";
import { RowsSkeleton } from "../_shell/skeleton";
import { SettingsIcon, type SettingsKey } from "./_icons";
import { focusRing, ownerContext } from "./_owner";

export const metadata: Metadata = { title: "Settings" };

/**
 * Settings index (Owner only): one 56px row per page, each fixing one thing. Rows whose page
 * is built link to it; the others stay plain, muted and marked "Soon" (no dead links).
 * At the bottom: the Shop's name, the Platform admin link when it applies, and Sign out.
 */
export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Suspense fallback={<RowsSkeleton rows={8} />}>
        <Settings />
      </Suspense>
    </div>
  );
}

/** The rows, in order, with the pages that exist so far. */
const ROWS: { key: SettingsKey; href?: string }[] = [
  { key: "services" },
  { key: "hours" },
  { key: "barbers" },
  { key: "rules" },
  { key: "blocklist" },
  { key: "payments" },
  { key: "link", href: "/app/settings/link" },
  { key: "export", href: "/app/settings/export" },
];

const row = "-mx-2 flex min-h-14 items-center gap-4 px-2 py-3";

async function Settings() {
  const ctx = await ownerContext();
  if (!ctx) return null;
  const { staff, membership, t } = ctx;
  const s = t.settings;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-[-0.015em]">{t.shell.settings.title}</h1>
        <p className="max-w-prose leading-relaxed text-muted">{s.note}</p>
      </div>

      <ul className="border-t border-line">
        {ROWS.map(({ key, href }) => {
          const { title, desc } = s.rows[key];
          const body = (
            <>
              <SettingsIcon name={key} className="h-6 w-6 shrink-0 text-muted" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={`font-semibold ${href ? "" : "text-muted"}`}>{title}</span>
                <span className="text-sm leading-snug text-muted">{desc}</span>
              </span>
            </>
          );
          return (
            <li key={key} className="border-b border-line">
              {href ? (
                <Link href={href} className={`${row} rounded-md transition-colors hover:bg-surface ${focusRing}`}>
                  {body}
                  <ChevronIcon className="h-5 w-5 shrink-0 text-muted" />
                </Link>
              ) : (
                <div className={row}>
                  {body}
                  <span className="shrink-0 rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-muted">{s.soon}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <ul className="border-t border-line">
        <li className="flex min-h-14 items-center justify-between gap-4 border-b border-line">
          <span className="font-medium">{t.shell.settings.shop}</span>
          <span className="min-w-0 truncate text-muted">{membership.shopName}</span>
        </li>
        {staff.isPlatformAdmin && (
          <li className="border-b border-line">
            <Link
              href="/admin"
              className={`flex min-h-14 items-center justify-between gap-4 rounded-md transition-colors hover:text-muted ${focusRing}`}
            >
              <span className="flex items-center gap-3 font-medium">
                <NavIcon name="admin" className="h-5 w-5 text-muted" />
                {t.shell.platformAdmin}
              </span>
              <ChevronIcon className="h-5 w-5 text-muted" />
            </Link>
          </li>
        )}
      </ul>

      <SignOutButton label={t.signOut} />
    </div>
  );
}
