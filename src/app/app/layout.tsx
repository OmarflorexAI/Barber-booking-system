import type { Metadata } from "next";
import { Suspense } from "react";
import { StaffShell } from "./_shell/shell";
import { ShellSkeleton } from "./_shell/skeleton";

export const metadata: Metadata = { robots: { index: false } };

/**
 * The staff app's frame. Who is signed in (cookies) is request data, so the shell renders
 * inside <Suspense>; its fallback is a skeleton of the same layout, which is what ships in
 * the static shell. Pages still check access themselves (layouts don't re-run on client
 * navigation) through the same cached getStaff().
 */
export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <StaffShell>{children}</StaffShell>
    </Suspense>
  );
}
