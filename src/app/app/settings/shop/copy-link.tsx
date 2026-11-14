"use client";

import { useState } from "react";

/** Copy the booking link, with one calm status line. */
export function CopyLink({ url, labels }: { url: string; labels: { copy: string; copied: string; copyFailed: string } }) {
  const [status, setStatus] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus(labels.copied);
    } catch {
      setStatus(labels.copyFailed);
    }
  }
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <button type="button" onClick={copy} className="btn-ghost w-full sm:w-auto">
        {labels.copy}
      </button>
      <p role="status" className="min-h-6 text-sm text-muted">
        {status}
      </p>
    </div>
  );
}
