"use client";

import { useState } from "react";
import { PhotoInput } from "@/components/photo-input";
import type { Locale } from "@/lib/i18n/dictionaries";

/** TEST HARNESS (dev only): see page.tsx. Labels are fixed English on purpose. */
export function PhotoHarness({ locale }: { locale: Locale }) {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-2xl font-semibold tracking-[-0.015em]">Photo upload (dev harness)</h1>
      <div className="flex flex-col gap-2">
        <PhotoInput kind="avatar" value={avatar} onChange={setAvatar} label="Barber photo" locale={locale} />
        <p data-testid="avatar-url" className="font-mono text-sm break-all text-muted">
          {avatar ?? ""}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <PhotoInput kind="cover" value={cover} onChange={setCover} label="Cover photo" locale={locale} />
        <p data-testid="cover-url" className="font-mono text-sm break-all text-muted">
          {cover ?? ""}
        </p>
      </div>
    </div>
  );
}
