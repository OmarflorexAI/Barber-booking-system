"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Notice } from "@/components/notice";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { archiveServiceAction, reorderServicesAction, saveServiceAction } from "./actions";

export type ServiceItem = { id: string; nameEn: string; nameEs: string; durationMin: number; bufferMin: number };

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
/** The gray pill for Archive: never red (DESIGN.md → "App buttons"). */
const GRAY_PILL = "btn w-full bg-raised text-ink hover:bg-line";
/** The Day view's sheet: a bottom sheet on phones, a centered dialog from 640px; transform + opacity only. */
const SHEET =
  "m-0 mt-auto max-h-[92dvh] w-full max-w-full overflow-y-auto overscroll-contain rounded-t-2xl border border-b-0 border-line bg-surface p-0 text-ink backdrop:bg-black/50 open:translate-y-0 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out starting:open:translate-y-full sm:m-auto sm:w-[30rem] sm:rounded-2xl sm:border-b sm:motion-safe:transition-[transform,opacity] sm:starting:open:translate-y-3 sm:starting:open:opacity-0";
const ICON_BTN = `inline-grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-raised hover:text-ink disabled:pointer-events-none disabled:opacity-40 ${focusRing}`;

/** Durations offered: the 15-minute grid from 15 min to 4 h. */
const DURATIONS = Array.from({ length: 16 }, (_, i) => (i + 1) * 15);
const BUFFERS = [0, 5, 10, 15, 20, 30, 45, 60, 90, 120];

/** Every option list plus the Service's own value, so an older value is never silently changed. */
const withCurrent = (list: number[], current: number) => [...new Set([...list, current])].sort((a, b) => a - b);

/**
 * The Service list: ruled rows in the order Clients see them (tap to edit, up/down to reorder),
 * the Add button, the per-Barber prices note and one sheet for add/edit/archive.
 */
export function ServiceList({ shopId, locale, items }: { shopId: string; locale: Locale; items: ServiceItem[] }) {
  const s = dictionaries[locale].settings.services;
  const router = useRouter();
  const [order, setOrder] = useState(items);
  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setOrder(items);
  }
  const [sheet, setSheet] = useState<{ open: boolean; item: ServiceItem | null; key: number }>({ open: false, item: null, key: 0 });
  const [status, setStatus] = useState("");
  const [listError, setListError] = useState<string | null>(null);
  const [moving, startMove] = useTransition();
  const lastTrigger = useRef<HTMLElement | null>(null);
  const moveRefs = useRef(new Map<string, HTMLButtonElement>());

  const name = (it: ServiceItem) => (locale === "es" && it.nameEs ? it.nameEs : it.nameEn);

  function open(item: ServiceItem | null, trigger: HTMLElement) {
    lastTrigger.current = trigger;
    setStatus("");
    setListError(null);
    setSheet((p) => ({ open: true, item, key: p.key + 1 }));
  }

  function move(index: number, dir: -1 | 1) {
    const to = index + dir;
    if (to < 0 || to >= order.length) return;
    const before = order;
    const next = [...order];
    const [it] = next.splice(index, 1);
    next.splice(to, 0, it);
    setOrder(next);
    setListError(null);
    setStatus(s.moved(name(it), to + 1, next.length));
    // At the top or bottom the pressed button turns off: keep focus on its partner.
    const edge = (dir === -1 && to === 0) || (dir === 1 && to === next.length - 1);
    if (edge) requestAnimationFrame(() => moveRefs.current.get(`${it.id}:${dir === -1 ? "down" : "up"}`)?.focus());
    startMove(async () => {
      const res = await reorderServicesAction(shopId, next.map((x) => x.id));
      if (!res.ok) {
        setOrder(before);
        setStatus("");
        setListError(s.errors[res.code as keyof typeof s.errors] ?? s.errors.UNKNOWN);
      } else router.refresh();
    });
  }

  const addButton = (
    <button type="button" className="btn-primary w-full sm:w-auto sm:self-start" onClick={(e) => open(null, e.currentTarget)}>
      <PlusIcon className="h-5 w-5" />
      {s.add}
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      {order.length === 0 ? (
        <p className="max-w-prose">{s.empty}</p>
      ) : (
        <ul aria-label={s.listLabel} className="border-t border-line" aria-busy={moving}>
          {order.map((it, i) => (
            <li key={it.id} className="flex items-center gap-1 border-b border-line">
              <button
                type="button"
                aria-label={s.editLabel(name(it))}
                onClick={(e) => open(it, e.currentTarget)}
                className={`-ml-2 flex min-h-14 min-w-0 flex-1 flex-col items-start justify-center gap-0.5 rounded-md px-2 py-3 text-left transition-colors hover:bg-surface ${focusRing}`}
              >
                <span className="max-w-full truncate font-semibold">{name(it)}</span>
                <span className="font-mono text-sm text-muted tabular-nums">
                  {s.hours(it.durationMin)}
                  {it.bufferMin > 0 && <> · {s.cleaning(s.minutes(it.bufferMin))}</>}
                </span>
              </button>
              <button
                type="button"
                ref={(el) => {
                  if (el) moveRefs.current.set(`${it.id}:up`, el);
                  else moveRefs.current.delete(`${it.id}:up`);
                }}
                aria-label={s.moveUp(name(it))}
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className={ICON_BTN}
              >
                <ArrowIcon dir="up" className="h-5 w-5" />
              </button>
              <button
                type="button"
                ref={(el) => {
                  if (el) moveRefs.current.set(`${it.id}:down`, el);
                  else moveRefs.current.delete(`${it.id}:down`);
                }}
                aria-label={s.moveDown(name(it))}
                disabled={i === order.length - 1}
                onClick={() => move(i, 1)}
                className={`${ICON_BTN} -mr-2`}
              >
                <ArrowIcon dir="down" className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {listError && (
        <Notice role="alert">
          <p>{listError}</p>
        </Notice>
      )}

      {addButton}

      <p role="status" className="-mt-2 min-h-6 text-sm text-muted">
        {status}
      </p>

      <p className="max-w-prose text-sm leading-relaxed text-muted">{s.pricesNote}</p>

      <ServiceSheet
        key={sheet.key}
        open={sheet.open}
        item={sheet.item}
        shopId={shopId}
        locale={locale}
        onClose={() => {
          setSheet((p) => ({ ...p, open: false }));
          const el = lastTrigger.current;
          if (el?.isConnected) el.focus();
        }}
        onDone={(msg) => {
          setStatus(msg);
          router.refresh();
        }}
      />
    </div>
  );
}

/** A native modal <dialog> that opens with `open` and reports every close (Escape, backdrop, button). */
function useSheet(open: boolean, onClose: () => void, busy: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return {
    ref,
    onClose,
    onCancel: (e: React.SyntheticEvent) => {
      if (busy) e.preventDefault();
    },
    onClick: (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === e.currentTarget && !busy) e.currentTarget.close();
    },
    className: SHEET,
  };
}

/** Add or edit one Service; in edit mode, Archive behind a confirm step in the same sheet. */
function ServiceSheet(props: {
  open: boolean;
  item: ServiceItem | null;
  shopId: string;
  locale: Locale;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { item, locale } = props;
  const s = dictionaries[locale].settings.services;
  const [nameEn, setNameEn] = useState(item?.nameEn ?? "");
  const [nameEs, setNameEs] = useState(item?.nameEs ?? "");
  const [duration, setDuration] = useState(item?.durationMin ?? 30);
  const [buffer, setBuffer] = useState(item?.bufferMin ?? 0);
  const [mode, setMode] = useState<"edit" | "archive">("edit");
  const [error, setError] = useState<{ text: string; field?: "nameEn" } | null>(null);
  const [pending, start] = useTransition();
  const sheet = useSheet(props.open, props.onClose, pending);

  const errText = (code: string) => s.errors[code as keyof typeof s.errors] ?? s.errors.UNKNOWN;
  const title = item ? s.editTitle : s.addTitle;
  const shownName = item ? (locale === "es" && item.nameEs ? item.nameEs : item.nameEn) : "";

  function save() {
    if (!nameEn.trim()) {
      setError({ text: s.errors.NAME_REQUIRED, field: "nameEn" });
      return;
    }
    setError(null);
    start(async () => {
      const res = await saveServiceAction({
        shopId: props.shopId,
        serviceId: item?.id,
        nameEn,
        nameEs,
        durationMin: duration,
        bufferMin: buffer,
      });
      if (res.ok) {
        sheet.ref.current?.close();
        props.onDone(s.saved);
      } else setError({ text: errText(res.code) });
    });
  }

  function archive() {
    if (!item) return;
    setError(null);
    start(async () => {
      const res = await archiveServiceAction(props.shopId, item.id);
      if (res.ok) {
        sheet.ref.current?.close();
        props.onDone(s.archived(shownName));
      } else setError({ text: errText(res.code) });
    });
  }

  const errorBox = error && (
    <Notice role="alert" id="service-error">
      <p>{error.text}</p>
    </Notice>
  );

  return (
    <dialog {...sheet} aria-labelledby="service-sheet-title">
      {props.open && (
        <div className="flex flex-col gap-5 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-6">
          <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-line sm:hidden" />
          <div className="flex items-start justify-between gap-3">
            <h2 id="service-sheet-title" className="text-xl font-semibold tracking-tight">
              {mode === "archive" ? s.archive : title}
            </h2>
            <button
              type="button"
              aria-label={s.close}
              onClick={() => sheet.ref.current?.close()}
              disabled={pending}
              className={`-mt-1 -mr-2 inline-grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-ink ${focusRing}`}
            >
              <CloseIcon className="h-6 w-6" />
            </button>
          </div>

          {mode === "edit" ? (
            <form
              noValidate
              className="flex flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">{s.nameEn}</span>
                <input
                  className="field"
                  name="nameEn"
                  autoComplete="off"
                  maxLength={80}
                  value={nameEn}
                  aria-invalid={error?.field === "nameEn" || undefined}
                  aria-describedby={error?.field === "nameEn" ? "service-error" : undefined}
                  onChange={(e) => {
                    setNameEn(e.target.value);
                    if (error) setError(null);
                  }}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">{s.nameEs}</span>
                <input
                  className="field"
                  name="nameEs"
                  lang="es"
                  autoComplete="off"
                  maxLength={80}
                  value={nameEs}
                  aria-describedby="service-name-es-hint"
                  onChange={(e) => setNameEs(e.target.value)}
                />
                <span id="service-name-es-hint" className="text-sm text-muted">
                  {s.nameEsHint}
                </span>
              </label>
              <div className="grid grid-cols-1 gap-5 min-[400px]:grid-cols-2">
                <label className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-sm font-medium">{s.duration}</span>
                  <select
                    className="field font-mono tabular-nums"
                    name="duration"
                    value={duration}
                    onChange={(e) => {
                      setDuration(Number(e.target.value));
                      if (error) setError(null);
                    }}
                  >
                    {withCurrent(DURATIONS, item?.durationMin ?? 30).map((m) => (
                      <option key={m} value={m}>
                        {s.hours(m)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-sm font-medium">{s.buffer}</span>
                  <select
                    className="field font-mono tabular-nums"
                    name="buffer"
                    value={buffer}
                    aria-describedby="service-buffer-hint"
                    onChange={(e) => {
                      setBuffer(Number(e.target.value));
                      if (error) setError(null);
                    }}
                  >
                    {withCurrent(BUFFERS, item?.bufferMin ?? 0).map((m) => (
                      <option key={m} value={m}>
                        {m === 0 ? s.noBuffer : s.minutes(m)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p id="service-buffer-hint" className="-mt-3 text-sm text-muted">
                {s.bufferHint}
              </p>

              {errorBox}

              <button type="submit" className="btn-primary w-full" disabled={pending} aria-busy={pending}>
                {pending ? s.saving : s.save}
              </button>
              {item && (
                <button
                  type="button"
                  className={GRAY_PILL}
                  disabled={pending}
                  onClick={() => {
                    setError(null);
                    setMode("archive");
                  }}
                >
                  {s.archive}
                </button>
              )}
            </form>
          ) : (
            <>
              <p className="leading-relaxed">{s.archiveConfirm(shownName)}</p>
              {errorBox}
              <div className="flex flex-col gap-3">
                <button type="button" className="btn-primary w-full" disabled={pending} aria-busy={pending} onClick={archive}>
                  {pending ? s.archiving : s.archiveYes}
                </button>
                <button
                  type="button"
                  autoFocus
                  className={GRAY_PILL}
                  disabled={pending}
                  onClick={() => {
                    setError(null);
                    setMode("edit");
                  }}
                >
                  {s.archiveKeep}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </dialog>
  );
}

function ArrowIcon({ dir, className }: { dir: "up" | "down"; className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {dir === "up" ? <path d="M12 19V5m-6 6 6-6 6 6" /> : <path d="M12 5v14m6-6-6 6-6-6" />}
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
