import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LanguageToggle } from "@/components/language-toggle";
import { ChevronIcon, NavIcon } from "../_shell/icons";
import { SignOutButton } from "../_shell/sign-out";
import { RowsSkeleton } from "../_shell/skeleton";
import { getShellContext } from "../_shell/staff";

export const metadata: Metadata = { title: "Me" };

/**
 * Me (Barber, and an Owner who cuts hair). Minimal for now (U3a): the Barber's name, the
 * language, the Platform admin link when it applies, and Sign out at the bottom. Mission U3b
 * fills in Profile, Gallery, Hours and Alerts.
 */
export default function MePage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Suspense fallback={<RowsSkeleton rows={2} />}>
        <Me />
      </Suspense>
    </div>
  );
}

const row = "flex min-h-14 items-center justify-between gap-4 border-b border-line";

async function Me() {
  const { staff, locale, t } = await getShellContext();
  if (!staff) redirect("/login");
  if (!staff.membership) return null; // the shell shows the "not linked to a Shop" page
  // An Owner who doesn't cut hair has no Me tab; their account lives in Settings.
  if (staff.membership.role === "owner" && !staff.barber) redirect("/app/settings");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-[-0.015em] text-balance">{staff.barber?.displayName ?? staff.email}</h1>
        <p className="max-w-prose leading-relaxed text-muted">{t.shell.me.setupNote}</p>
      </div>

      <ul className="border-t border-line">
        <li className={row}>
          <span className="font-medium">{t.shell.language}</span>
          <LanguageToggle locale={locale} label={t.otherLang} />
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
