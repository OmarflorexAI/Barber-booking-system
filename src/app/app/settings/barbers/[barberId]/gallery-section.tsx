"use client";

import { useRef, useState } from "react";
import { deleteMediaAction } from "@/app/app/_media/actions";
import { Notice } from "@/components/notice";
import { PhotoInput } from "@/components/photo-input";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { setGalleryAction } from "./gallery-actions";

const MAX = 6;
const NUDGE_BELOW = 3;
const ICON_BTN =
  "inline-grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface";

type Op = { next: string[]; message: string; onSaved?: () => void; onFailed?: () => void; focus?: () => void };

/**
 * The Gallery section (PLAN.md M4 · job 2): up to 6 work photos in the order Clients see them.
 * Every change (add, remove, move) saves right away; changes run one after another, and a failed
 * save puts the photos back and says so. A removed photo's file is deleted only after the save.
 */
export function GallerySection({
  shopId,
  barberId,
  locale,
  initial,
}: {
  shopId: string;
  barberId: string;
  locale: Locale;
  initial: string[];
}) {
  const g = dictionaries[locale].settings.barberProfile.gallery;
  const [urls, setUrlsState] = useState<string[]>(initial);
  const urlsRef = useRef<string[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [addKey, setAddKey] = useState(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  const setUrls = (next: string[]) => {
    urlsRef.current = next;
    setUrlsState(next);
  };
  const errText = (code: string) => g.errors[code as keyof typeof g.errors] ?? g.errors.UNKNOWN;

  /** Run one change after the ones before it: show it now, save it, undo it if the save fails. */
  function run(make: (current: string[]) => Op | null) {
    queue.current = queue.current.then(async () => {
      const prev = urlsRef.current;
      const op = make(prev);
      if (!op) return;
      setError(null);
      setStatus("");
      setUrls(op.next);
      if (op.focus) requestAnimationFrame(op.focus);
      const res = await setGalleryAction({ shopId, barberId, urls: op.next }).catch(() => ({ ok: false as const, code: "UNKNOWN" }));
      if (res.ok) {
        setStatus(op.message);
        op.onSaved?.();
      } else {
        setUrls(prev);
        setError(errText(res.code));
        op.onFailed?.();
      }
    });
  }

  function add(url: string | null) {
    if (!url) return;
    setAddKey((k) => k + 1); // a fresh, empty picker for the next photo
    run((cur) => {
      if (cur.length >= MAX || cur.includes(url)) {
        void deleteMediaAction(url).catch(() => {});
        return null;
      }
      return {
        next: [...cur, url],
        message: g.added,
        onFailed: () => void deleteMediaAction(url).catch(() => {}),
      };
    });
  }

  function remove(url: string) {
    run((cur) => {
      const i = cur.indexOf(url);
      if (i < 0) return null;
      const next = cur.filter((u) => u !== url);
      return {
        next,
        message: g.removed,
        onSaved: () => void deleteMediaAction(url).catch(() => {}),
        // The button is gone: land on the photo that took its place, else the one before, else the picker.
        focus: () => {
          const target = next[i] ?? next[i - 1];
          const el = target ? buttons.current.get(`${target}:remove`) : document.querySelector<HTMLElement>("[data-gallery-add] button");
          el?.focus();
        },
      };
    });
  }

  function move(url: string, by: -1 | 1) {
    run((cur) => {
      const i = cur.indexOf(url);
      const j = i + by;
      if (i < 0 || j < 0 || j >= cur.length) return null;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return {
        next,
        message: g.moved(j + 1),
        // Keep focus on the photo that moved; at an end, switch to the arrow that still works.
        focus: () => {
          const atEnd = by < 0 ? j === 0 : j === next.length - 1;
          const key = `${url}:${atEnd ? (by < 0 ? "later" : "earlier") : by < 0 ? "earlier" : "later"}`;
          buttons.current.get(key)?.focus();
        },
      };
    });
  }

  const ref = (key: string) => (el: HTMLButtonElement | null) => {
    if (el) buttons.current.set(key, el);
    else buttons.current.delete(key);
  };

  return (
    <div className="flex flex-col gap-4">
      {urls.length > 0 && (
        <ol aria-label={g.listLabel} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {urls.map((url, i) => (
            <li key={url} className="flex min-w-0 flex-col gap-2">
              <div className="aspect-square overflow-hidden rounded-2xl border border-line bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element -- Storage URLs, already sized on the phone (≤ 1600 px) */}
                <img src={url} alt={g.photoAlt(i + 1, urls.length)} loading="lazy" decoding="async" className="size-full object-cover" />
              </div>
              <div className="flex items-center justify-between gap-1">
                <div className="flex gap-1">
                  <button type="button" ref={ref(`${url}:earlier`)} aria-label={g.moveEarlier(i + 1)} disabled={i === 0} onClick={() => move(url, -1)} className={ICON_BTN}>
                    <ArrowIcon className="size-5" dir="left" />
                  </button>
                  <button
                    type="button"
                    ref={ref(`${url}:later`)}
                    aria-label={g.moveLater(i + 1)}
                    disabled={i === urls.length - 1}
                    onClick={() => move(url, 1)}
                    className={ICON_BTN}
                  >
                    <ArrowIcon className="size-5" dir="right" />
                  </button>
                </div>
                <button type="button" ref={ref(`${url}:remove`)} aria-label={g.remove(i + 1)} onClick={() => remove(url)} className={ICON_BTN}>
                  <TrashIcon className="size-5" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-muted">
        <span className="font-mono tabular-nums" data-testid="gallery-count">
          {g.count(urls.length)}
        </span>
        {urls.length < NUDGE_BELOW && <span>{g.nudge}</span>}
        {urls.length >= MAX && <span>{g.full}</span>}
      </p>

      {urls.length < MAX && (
        <div data-gallery-add className="sm:max-w-sm">
          <PhotoInput key={addKey} kind="gallery" value={null} onChange={add} label={g.add} locale={locale} />
        </div>
      )}

      {error && (
        <Notice role="alert">
          <p>{error}</p>
        </Notice>
      )}
      <p role="status" className="sr-only">
        {status}
      </p>
    </div>
  );
}

function ArrowIcon({ className, dir }: { className?: string; dir: "left" | "right" }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={dir === "left" ? "M19 12H5m6-6-6 6 6 6" : "M5 12h14m-6-6 6 6-6 6"} />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  );
}
