"use client";

import { useState } from "react";

type Labels = { copy: string; copied: string; copyFailed: string; share: string; shareText: string; print: string; printHint: string };

/** Copy, Share (the phone's share sheet, else copy) and Print, with one calm status line. */
export function LinkActions({ url, shopName, labels }: { url: string; shopName: string; labels: Labels }) {
  const [status, setStatus] = useState<string>("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus(labels.copied);
    } catch {
      setStatus(labels.copyFailed);
    }
  }

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: shopName, text: labels.shareText, url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return; // closed the sheet
      }
    }
    await copy();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button type="button" onClick={share} className="btn-primary">
          {labels.share}
        </button>
        <button type="button" onClick={copy} className="btn-ghost">
          {labels.copy}
        </button>
      </div>
      <p role="status" className="min-h-6 text-sm text-muted">
        {status}
      </p>
      <button type="button" onClick={() => window.print()} className="btn-ghost">
        {labels.print}
      </button>
      <p className="text-sm text-muted">{labels.printHint}</p>
    </div>
  );
}
