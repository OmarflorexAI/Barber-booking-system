"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteMediaAction } from "@/app/app/_media/actions";
import { cancelAsStaffAction } from "@/app/app/day/actions";
import { Notice } from "@/components/notice";
import { PhotoInput } from "@/components/photo-input";
import { dictionaries, formatDay, formatTime, type Locale } from "@/lib/i18n/dictionaries";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { addBarberAction, deleteBarberAction, upcomingAction, type UpcomingItem } from "./actions";

export type BarberItem = { id: string; name: string; photoUrl: string | null; isYou: boolean; bookable: boolean };

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
/** The gray pill for Delete and Cancel: never red (DESIGN.md → "App buttons"). */
const GRAY_PILL = "btn w-full bg-raised text-ink hover:bg-line";
/** The Day view's sheet: a bottom sheet on phones, a centered dialog from 640px; transform + opacity only. */
const SHEET =
  "m-0 mt-auto max-h-[92dvh] w-full max-w-full overflow-y-auto overscroll-contain rounded-t-2xl border border-b-0 border-line bg-surface p-0 text-ink backdrop:bg-black/50 open:translate-y-0 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out starting:open:translate-y-full sm:m-auto sm:w-[30rem] sm:rounded-2xl sm:border-b sm:motion-safe:transition-[transform,opacity] sm:starting:open:translate-y-3 sm:starting:open:opacity-0";
const ICON_BTN = `inline-grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-raised hover:text-ink ${focusRing}`;
const SMALL_PILL = `inline-flex min-h-11 items-center justify-center rounded-full border border-line px-4 text-sm font-medium text-ink transition-colors hover:bg-raised ${focusRing}`;

/** "Luis Peña" → "LP"; one word → its first letter. */
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** The New York calendar date (YYYY-MM-DD) of an instant, for the Day view's ?date=. */
function localDate(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

/**
 * The Barber list: ruled rows (photo or initials, name, "You", "Not bookable yet"), a Delete
 * button on every row but the Owner's own, the Add button (a calm notice once there are 6),
 * and the two sheets.
 */
export function BarberList(props: {
  shopId: string;
  locale: Locale;
  timezone: string;
  smsEnabled: boolean;
  full: boolean;
  items: BarberItem[];
}) {
  const { locale, items } = props;
  const s = dictionaries[locale].settings.barbers;
  const router = useRouter();
  const [add, setAdd] = useState({ open: false, key: 0 });
  const [del, setDel] = useState<{ item: BarberItem | null; key: number }>({ item: null, key: 0 });
  const [status, setStatus] = useState("");
  const [showLimit, setShowLimit] = useState(false);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  // After a delete the row's button is gone: focus goes to "Add Barber" instead.
  const focusAdd = useRef(false);

  const restoreFocus = () => {
    const el = lastTrigger.current;
    if (el?.isConnected) el.focus();
  };

  return (
    <div className="flex flex-col gap-6">
      <ul aria-label={s.listLabel} className="border-t border-line">
        {items.map((it) => (
          <li key={it.id} className="flex min-h-16 items-center gap-3 border-b border-line py-2">
            <Avatar name={it.name} photoUrl={it.photoUrl} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-semibold">{it.name}</span>
                {it.isYou && (
                  <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs font-medium text-muted">{s.you}</span>
                )}
              </span>
              {!it.bookable && <span className="text-sm text-muted">{s.notBookable}</span>}
            </div>
            {!it.isYou && (
              <button
                type="button"
                aria-label={s.deleteLabel(it.name)}
                className={`${ICON_BTN} -mr-2`}
                onClick={(e) => {
                  lastTrigger.current = e.currentTarget;
                  setStatus("");
                  setDel((p) => ({ item: it, key: p.key + 1 }));
                }}
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            )}
          </li>
        ))}
      </ul>

      <button
        ref={addRef}
        type="button"
        className="btn-primary w-full sm:w-auto sm:self-start"
        aria-expanded={props.full ? showLimit : undefined}
        aria-controls={props.full ? "barber-limit" : undefined}
        onClick={(e) => {
          setStatus("");
          if (props.full) {
            setShowLimit(true);
            return;
          }
          lastTrigger.current = e.currentTarget;
          setAdd((p) => ({ open: true, key: p.key + 1 }));
        }}
      >
        <PlusIcon className="h-5 w-5" />
        {s.add}
      </button>

      <div id="barber-limit" role="status" className={showLimit && props.full ? "" : "hidden"}>
        {showLimit && props.full && (
          <Notice>
            <p>{s.limit}</p>
          </Notice>
        )}
      </div>

      <p role="status" className="-mt-2 min-h-6 text-sm text-muted">
        {status}
      </p>

      <AddSheet
        key={`add-${add.key}`}
        open={add.open}
        shopId={props.shopId}
        locale={locale}
        onClose={() => {
          setAdd((p) => ({ ...p, open: false }));
          restoreFocus();
        }}
        onDone={(msg) => {
          setStatus(msg);
          router.refresh();
        }}
      />

      <DeleteSheet
        key={`del-${del.key}`}
        item={del.item}
        shopId={props.shopId}
        locale={locale}
        timezone={props.timezone}
        smsEnabled={props.smsEnabled}
        onClose={() => {
          setDel((p) => ({ ...p, item: null }));
          if (focusAdd.current) {
            focusAdd.current = false;
            addRef.current?.focus();
          } else restoreFocus();
        }}
        onDone={(msg) => {
          focusAdd.current = true;
          setStatus(msg);
          router.refresh();
        }}
      />
    </div>
  );
}

function Avatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  return (
    <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-surface text-sm font-semibold text-muted">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Storage URLs, already square and ≤ 512 px
        <img src={photoUrl} alt="" className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
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

function SheetHead({ id, title, onClose, disabled, closeLabel }: { id: string; title: string; onClose: () => void; disabled: boolean; closeLabel: string }) {
  return (
    <>
      <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-line sm:hidden" />
      <div className="flex items-start justify-between gap-3">
        <h2 id={id} className="min-w-0 text-xl font-semibold tracking-tight break-words">
          {title}
        </h2>
        <button
          type="button"
          aria-label={closeLabel}
          onClick={onClose}
          disabled={disabled}
          className={`-mt-1 -mr-2 inline-grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-ink ${focusRing}`}
        >
          <CloseIcon className="h-6 w-6" />
        </button>
      </div>
    </>
  );
}

/** Add a Barber: name (required), photo and phone (optional). An uploaded photo that isn't saved is deleted. */
function AddSheet(props: { open: boolean; shopId: string; locale: Locale; onClose: () => void; onDone: (message: string) => void }) {
  const { locale } = props;
  const s = dictionaries[locale].settings.barbers;
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<{ text: string; field?: "name" | "phone" } | null>(null);
  const [pending, start] = useTransition();
  const saved = useRef(false);
  const photoRef = useRef<string | null>(null);

  const sheet = useSheet(
    props.open,
    () => {
      // Closed without saving: the photo uploaded for this Barber has no owner, so delete it.
      if (!saved.current && photoRef.current) void deleteMediaAction(photoRef.current).catch(() => {});
      props.onClose();
    },
    pending,
  );

  const errText = (code: string) => s.errors[code as keyof typeof s.errors] ?? s.errors.UNKNOWN;

  function changePhoto(url: string | null) {
    const old = photoRef.current;
    if (old && old !== url) void deleteMediaAction(old).catch(() => {});
    photoRef.current = url;
    setPhoto(url);
  }

  function save() {
    if (!name.trim()) {
      setError({ text: s.errors.NAME_REQUIRED, field: "name" });
      return;
    }
    if (phone.trim() && !normalizePhone(phone)) {
      setError({ text: s.errors.PHONE_INVALID, field: "phone" });
      return;
    }
    setError(null);
    start(async () => {
      const res = await addBarberAction({ shopId: props.shopId, displayName: name, photoUrl: photo, phone });
      if (res.ok) {
        saved.current = true;
        sheet.ref.current?.close();
        props.onDone(s.added(name.trim()));
      } else setError({ text: errText(res.code), field: res.code === "PHONE_INVALID" ? "phone" : undefined });
    });
  }

  return (
    <dialog {...sheet} aria-labelledby="add-barber-title">
      {props.open && (
        <div className="flex flex-col gap-5 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-6">
          <SheetHead id="add-barber-title" title={s.addTitle} onClose={() => sheet.ref.current?.close()} disabled={pending} closeLabel={s.close} />
          <form
            noValidate
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{s.name}</span>
              <input
                className="field"
                name="name"
                autoComplete="off"
                autoCapitalize="words"
                maxLength={60}
                required
                value={name}
                aria-invalid={error?.field === "name" || undefined}
                aria-describedby={error?.field === "name" ? "barber-error barber-name-hint" : "barber-name-hint"}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error?.field === "name") setError(null);
                }}
              />
              <span id="barber-name-hint" className="text-sm text-muted">
                {s.nameHint}
              </span>
            </label>

            <PhotoInput kind="avatar" value={photo} onChange={changePhoto} label={s.photo} locale={locale} />

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{s.phone}</span>
              <input
                className="field font-mono tabular-nums"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                maxLength={40}
                value={phone}
                aria-invalid={error?.field === "phone" || undefined}
                aria-describedby={error?.field === "phone" ? "barber-error barber-phone-hint" : "barber-phone-hint"}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (error?.field === "phone") setError(null);
                }}
                onBlur={() => {
                  const e164 = phone.trim() ? normalizePhone(phone) : null;
                  if (e164) setPhone(formatPhone(e164));
                }}
              />
              <span id="barber-phone-hint" className="text-sm text-muted">
                {s.phoneHint}
              </span>
            </label>

            {error && (
              <Notice role="alert" id="barber-error">
                <p>{error.text}</p>
              </Notice>
            )}

            <button type="submit" className="btn-primary w-full" disabled={pending} aria-busy={pending}>
              {pending ? s.saving : s.save}
            </button>
          </form>
        </div>
      )}
    </dialog>
  );
}

type DeleteMode = { kind: "confirm" } | { kind: "blocked" } | { kind: "cancel"; booking: UpcomingItem };

/**
 * Delete one Barber behind a confirm. When the engine refuses because of upcoming Bookings, the
 * same sheet lists them with Cancel (the Day view's confirm and refund copy) and Move (to Day).
 */
function DeleteSheet(props: {
  item: BarberItem | null;
  shopId: string;
  locale: Locale;
  timezone: string;
  smsEnabled: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { item, locale, timezone: tz } = props;
  const t = dictionaries[locale];
  const s = t.settings.barbers;
  const d = t.day;
  const [mode, setMode] = useState<DeleteMode>({ kind: "confirm" });
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const sheet = useSheet(item !== null, props.onClose, pending);

  if (!item) return <dialog {...sheet} aria-label={s.listLabel} />;
  const name = item.name;

  const errText = (code: string) => s.errors[code as keyof typeof s.errors] ?? (t.errors as Record<string, string>)[code] ?? s.errors.UNKNOWN;
  const service = (u: UpcomingItem) => (locale === "es" && u.serviceNameEs ? u.serviceNameEs : u.serviceNameEn);
  const who = (u: UpcomingItem) => u.clientName ?? (u.kind === "walk_in" ? s.walkIn : service(u));
  const when = (u: UpcomingItem) => `${formatDay(localDate(u.startsAt, tz), locale)}, ${formatTime(u.startsAt, tz, locale)}`;

  function remove() {
    setError(null);
    setNote(null);
    start(async () => {
      const res = await deleteBarberAction(props.shopId, item!.id);
      if (res.ok) {
        props.onDone(s.deleted(name));
        sheet.ref.current?.close();
      } else if (res.code === "BARBER_HAS_BOOKINGS" && res.upcoming?.length) {
        setUpcoming(res.upcoming);
        setMode({ kind: "blocked" });
      } else setError(errText(res.code));
    });
  }

  function cancel(booking: UpcomingItem) {
    setError(null);
    start(async () => {
      const res = await cancelAsStaffAction(booking.bookingId);
      if (!res.ok) {
        setError(errText(res.code));
        return;
      }
      const next = await upcomingAction(props.shopId, item!.id);
      const left = next.ok ? next.upcoming : upcoming.filter((u) => u.bookingId !== booking.bookingId);
      setUpcoming(left);
      if (left.length === 0) {
        setNote(s.cleared(name));
        setMode({ kind: "confirm" });
      } else {
        setNote(d.cancelled);
        setMode({ kind: "blocked" });
      }
    });
  }

  const errorBox = error && (
    <Notice role="alert">
      <p>{error}</p>
    </Notice>
  );
  const title =
    mode.kind === "confirm" ? s.deleteTitle(name) : mode.kind === "blocked" ? s.blockedTitle(name) : d.cancelTitle;

  return (
    <dialog {...sheet} aria-labelledby="delete-barber-title">
      <div className="flex flex-col gap-5 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-6">
        <SheetHead id="delete-barber-title" title={title} onClose={() => sheet.ref.current?.close()} disabled={pending} closeLabel={s.close} />

        {note && (
          <p role="status" className="text-sm text-muted">
            {note}
          </p>
        )}

        {mode.kind === "confirm" && (
          <>
            <p className="leading-relaxed">{s.deleteBody(name)}</p>
            {errorBox}
            <div className="flex flex-col gap-3">
              <button type="button" className="btn-primary w-full" disabled={pending} aria-busy={pending} onClick={remove}>
                {pending ? s.deleting : s.deleteYes}
              </button>
              <button type="button" ref={focusSoon} className={GRAY_PILL} disabled={pending} onClick={() => sheet.ref.current?.close()}>
                {s.deleteKeep}
              </button>
            </div>
          </>
        )}

        {mode.kind === "blocked" && (
          <>
            <p className="leading-relaxed">{s.blockedBody(name)}</p>
            <ul aria-label={s.upcomingLabel} className="border-t border-line">
              {upcoming.map((u) => {
                const canCancel = u.kind === "booking" && u.status === "confirmed";
                return (
                  <li key={u.bookingId} className="flex flex-col gap-2 border-b border-line py-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-mono text-sm tabular-nums">{when(u)}</span>
                      <span className="truncate font-semibold">{who(u)}</span>
                      <span className="text-sm text-muted">
                        {service(u)}
                        {u.status === "pending_payment" && <> · {s.waitingPayment}</>}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canCancel && (
                        <button
                          type="button"
                          className={SMALL_PILL}
                          disabled={pending}
                          aria-label={s.cancelLabel(who(u), when(u))}
                          onClick={() => {
                            setError(null);
                            setNote(null);
                            setMode({ kind: "cancel", booking: u });
                          }}
                        >
                          {s.cancel}
                        </button>
                      )}
                      <Link
                        href={`/app/day?date=${localDate(u.startsAt, tz)}&barber=${item.id}`}
                        className={SMALL_PILL}
                        aria-label={s.moveLabel(who(u), when(u))}
                      >
                        {s.move}
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
            {errorBox}
          </>
        )}

        {mode.kind === "cancel" && (
          <>
            <p className="text-muted">
              {who(mode.booking)} · {service(mode.booking)} · <span className="font-mono tabular-nums">{when(mode.booking)}</span>
            </p>
            <Notice>
              <p>{props.smsEnabled ? d.cancelTold : d.textsOff}</p>
              <p>{mode.booking.paid ? d.refund(mode.booking.price) : d.nothingToRefund}</p>
            </Notice>
            {errorBox}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                className="btn-primary w-full"
                disabled={pending}
                aria-busy={pending}
                onClick={() => cancel(mode.booking)}
              >
                {pending ? d.cancelling : d.cancel}
              </button>
              <button
                type="button"
                ref={focusSoon}
                className={GRAY_PILL}
                disabled={pending}
                onClick={() => {
                  setError(null);
                  setMode({ kind: "blocked" });
                }}
              >
                {d.keep}
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
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

/**
 * Put focus on the safe choice ("Keep") when a confirm step appears. React's autoFocus loses
 * to showModal(), which focuses the dialog's first control (Close), so wait one frame.
 */
function focusSoon(el: HTMLButtonElement | null) {
  if (el) requestAnimationFrame(() => el.focus());
}
