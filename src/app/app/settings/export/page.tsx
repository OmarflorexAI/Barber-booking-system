import type { Metadata } from "next";
import { Suspense } from "react";
import { RowsSkeleton } from "../../_shell/skeleton";
import { BackToSettings } from "../_back";
import { ownerContext } from "../_owner";

export const metadata: Metadata = { title: "Export clients" };

/** Export clients (Owner only): what's in the file, and one button that downloads it. */
export default function ExportPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Suspense fallback={<RowsSkeleton rows={2} />}>
        <Export />
      </Suspense>
    </div>
  );
}

async function Export() {
  const ctx = await ownerContext();
  if (!ctx) return null;
  const { t } = ctx;
  const s = t.settings.export;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <BackToSettings label={t.settings.back} />
        <h1 className="text-2xl font-semibold tracking-[-0.015em]">{s.title}</h1>
        <p className="max-w-prose leading-relaxed text-muted">{s.intro}</p>
      </div>
      <div className="flex flex-col gap-3">
        {/* A plain link: the route answers with the file (Content-Disposition: attachment). */}
        <a href="/app/settings/export/download" download className="btn-primary">
          {s.download}
        </a>
        <p className="text-sm text-muted">{s.privacy}</p>
      </div>
    </div>
  );
}
