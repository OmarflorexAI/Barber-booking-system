import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RowsSkeleton } from "../../_shell/skeleton";
import { ownerContext } from "../../settings/_owner";
import { PhotoHarness } from "./harness";

export const metadata: Metadata = { title: "Photo upload (dev)" };

/**
 * TEST HARNESS, dev only (PLAN.md M1): one PhotoInput for "avatar" and one for "cover", with
 * the returned URLs printed for tests/e2e/photo-upload.spec.ts. Not linked from anywhere and a
 * 404 in production. Owner only, like the screens that will use PhotoInput for real.
 */
export default function DevPhotoPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Suspense fallback={<RowsSkeleton rows={3} />}>
        <Harness />
      </Suspense>
    </div>
  );
}

async function Harness() {
  const ctx = await ownerContext();
  if (!ctx) return null;
  return <PhotoHarness locale={ctx.locale} />;
}
