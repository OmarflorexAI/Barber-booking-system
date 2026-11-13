import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RowsSkeleton } from "../_shell/skeleton";
import { getShellContext } from "../_shell/staff";

export const metadata: Metadata = { title: "Dashboard" };

/** Dashboard (Owner only). A placeholder until mission U2 builds the week's numbers. */
export default function DashboardPage() {
  return (
    <div className="w-full">
      <Suspense fallback={<RowsSkeleton rows={2} />}>
        <Dashboard />
      </Suspense>
    </div>
  );
}

async function Dashboard() {
  const { staff, t } = await getShellContext();
  if (!staff) redirect("/login");
  if (!staff.membership) return null; // the shell shows the "not linked to a Shop" page
  if (staff.membership.role !== "owner") redirect("/app/day");

  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold tracking-[-0.015em]">{t.shell.dashboard.title}</h1>
      <p className="max-w-prose leading-relaxed text-muted">{t.shell.dashboard.note}</p>
      <Link href="/app/day" className="btn-ghost">
        {t.shell.dashboard.goToday}
      </Link>
    </div>
  );
}
