import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ChevronIcon, NavIcon } from "../_shell/icons";
import { SignOutButton } from "../_shell/sign-out";
import { RowsSkeleton } from "../_shell/skeleton";
import { getShellContext } from "../_shell/staff";

export const metadata: Metadata = { title: "Settings" };

/**
 * Settings (Owner only). Minimal for now (U3a): the sections are listed as plain rows, not
 * links, until mission U2 builds their pages (no dead links). Then the Shop's name, the
 * Platform admin link when it applies, and Sign out at the bottom.
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

const row = "flex min-h-14 items-center justify-between gap-4 border-b border-line";

async function Settings() {
  const { staff, t } = await getShellContext();
  if (!staff) redirect("/login");
  if (!staff.membership) return null; // the shell shows the "not linked to a Shop" page
  if (staff.membership.role !== "owner") redirect("/app/day");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-[-0.015em]">{t.shell.settings.title}</h1>
        <p className="max-w-prose leading-relaxed text-muted">{t.shell.settings.note}</p>
      </div>

      <ul className="border-t border-line">
        {t.shell.settings.sections.map((name) => (
          <li key={name} className={`${row} text-muted`}>
            {name}
          </li>
        ))}
      </ul>

      <ul className="border-t border-line">
        <li className={row}>
          <span className="font-medium">{t.shell.settings.shop}</span>
          <span className="min-w-0 truncate text-muted">{staff.membership.shopName}</span>
        </li>
        {staff.isPlatformAdmin && (
          <li className="border-b border-line">
            <Link
              href="/admin"
              className="flex min-h-14 items-center justify-between gap-4 rounded-md transition-colors hover:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
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
