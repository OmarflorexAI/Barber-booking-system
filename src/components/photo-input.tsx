"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createUploadAction, type MediaKind } from "@/app/app/_media/actions";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { ResizeError, resizeImage } from "@/lib/image-resize";
import { createClient } from "@/lib/supabase/client";
import { Notice } from "./notice";

/** PLAN.md → Q12: Barber photos and the logo are square ≤ 512 px; gallery and cover keep their shape ≤ 1600 px. */
const SIZES: Record<MediaKind, { max: number; square: boolean }> = {
  avatar: { max: 512, square: true },
  logo: { max: 512, square: true },
  gallery: { max: 1600, square: false },
  cover: { max: 1600, square: false },
};

type ErrorCode = keyof (typeof dictionaries)["en"]["photo"]["errors"];

/**
 * Pick or take a photo, shrink it on the phone, upload it to the Shop's storage and hand the
 * public URL to `onChange`. "Remove" only calls `onChange(null)`: the caller decides when (and
 * whether) to delete the stored file. Errors are the neutral Notice; the current photo stays.
 */
export function PhotoInput({
  kind,
  value,
  onChange,
  label,
  locale,
  shape,
}: {
  kind: MediaKind;
  value: string | null;
  onChange: (url: string | null) => void;
  label: string;
  locale: Locale;
  shape?: "circle" | "rect";
}) {
  const t = dictionaries[locale].photo;
  const round = (shape ?? (SIZES[kind].square ? "circle" : "rect")) === "circle";
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [status, setStatus] = useState("");
  // The shrunk file shown on the device while it uploads, and kept for its URL afterwards
  // so the picture doesn't blink when the stored copy takes over.
  const [local, setLocalState] = useState<{ preview: string; url: string | null } | null>(null);
  const previewRef = useRef<string | null>(null);
  function setLocal(next: { preview: string; url: string | null } | null) {
    const old = previewRef.current;
    if (old && old !== next?.preview) URL.revokeObjectURL(old);
    previewRef.current = next?.preview ?? null;
    setLocalState(next);
  }
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const src = local && (busy || local.url === value) ? local.preview : value;

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // picking the same file again still fires
    if (!file) return;
    setError(null);
    setBusy(true);
    setStatus(t.uploading);
    try {
      let blob: Blob;
      try {
        blob = await resizeImage(file, SIZES[kind]);
      } catch (err) {
        setError(err instanceof ResizeError ? err.code : "decode");
        setStatus("");
        return;
      }
      const preview = URL.createObjectURL(blob);
      setLocal({ preview, url: null });

      const res = await createUploadAction(kind, blob.type === "image/jpeg" ? "jpeg" : "webp").catch(() => null);
      if (!res || !res.ok) {
        setLocal(null);
        setError(res?.error === "forbidden" ? "forbidden" : "upload");
        setStatus("");
        return;
      }
      const { error: upErr } = await createClient()
        .storage.from("shop-media")
        .uploadToSignedUrl(res.path, res.token, blob, { contentType: blob.type || "image/webp" });
      if (upErr) {
        setLocal(null);
        setError("upload");
        setStatus("");
        return;
      }
      setLocal({ preview, url: res.publicUrl });
      onChange(res.publicUrl);
      setStatus(t.uploaded);
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    setError(null);
    setLocal(null);
    onChange(null);
    setStatus(t.removed);
  }

  const tile = round ? "size-24 shrink-0 rounded-full" : "aspect-[16/9] w-full rounded-2xl";

  return (
    <div role="group" aria-labelledby={`${id}-label`} className="flex flex-col gap-3">
      <span id={`${id}-label`} className="text-sm font-medium">
        {label}
      </span>

      <div className={round ? "flex items-center gap-4" : "flex flex-col gap-3"}>
        <div aria-busy={busy} className={`relative overflow-hidden border border-line bg-surface ${tile}`}>
          {src ? (
            <Preview key={src} src={src} alt={label} />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-muted">
              <CameraIcon className="size-6" />
              <span className={round ? "sr-only" : "text-sm"}>{t.empty}</span>
            </div>
          )}
          {busy && <div aria-hidden="true" className="absolute inset-0 bg-line opacity-60 motion-safe:animate-pulse" />}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            aria-describedby={`${id}-hint`}
            className="btn-ghost"
          >
            {busy ? (
              <span aria-hidden="true" className="size-2 rounded-full bg-muted motion-safe:animate-pulse" />
            ) : (
              <CameraIcon className="size-5" />
            )}
            {value ? t.change : t.add}
          </button>
          {value && (
            <button type="button" onClick={remove} disabled={busy} className="btn-ghost">
              {t.remove}
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={pick}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        data-testid={`photo-file-${kind}`}
      />
      <p id={`${id}-hint`} className="text-sm text-muted">
        {t.hint}
      </p>
      <p role="status" className="sr-only">
        {status}
      </p>
      {error && <Notice role="alert">{t.errors[error]}</Notice>}
    </div>
  );
}

/** Fades in once decoded (opacity only; instant under reduced motion). */
function Preview({ src, alt }: { src: string; alt: string }) {
  const [shown, setShown] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Storage URLs and blob: previews, already sized on the phone
    <img
      ref={(el) => {
        if (el?.complete && el.naturalWidth) setShown(true);
      }}
      src={src}
      alt={alt}
      onLoad={() => setShown(true)}
      className={`size-full object-cover transition-opacity duration-[var(--dur-base)] ease-out motion-reduce:transition-none ${shown ? "opacity-100" : "opacity-0"}`}
    />
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
