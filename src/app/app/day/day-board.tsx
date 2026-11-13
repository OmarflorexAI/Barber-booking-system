"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { Notice } from "@/components/notice";
import { PayTag } from "@/components/pay-tag";
import { SlotPicker, type Slot } from "@/components/slot-picker";
import { dictionaries, formatTime, type Locale } from "@/lib/i18n/dictionaries";
import { cancelAsStaffAction, moveAsStaffAction, setAttendanceAction, walkInAction, type StaffResult } from "./actions";
import { ArrowLeftIcon, CheckIcon, ClockIcon, CloseIcon, PhoneIcon, PlusIcon, ShareIcon, UserOffIcon } from "./icons";
import type { DayBarber, DayRow } from "./types";

type Props = {
  locale: Locale;
  shopId: string;
  shopName: string;
  bookingPath: string | null;
  smsEnabled: boolean;
  timezone: string;
  isOwner: boolean;
  barbers: DayBarber[];
  filter: string | null;
  rows: DayRow[];
  isToday: boolean;
  serverNow: number;
  loadFailed: boolean;
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
/** The gray pill for Cancel: never red (DESIGN.md → "App buttons"). */
const GRAY_PILL = "btn w-full bg-raised text-ink hover:bg-line";
/** The sheet: a bottom sheet on phones, a centered dialog from 640px; transform + opacity only. */
const SHEET =
  "m-0 mt-auto max-h-[92dvh] w-full max-w-full overflow-y-auto overscroll-contain rounded-t-2xl border border-b-0 border-line bg-surface p-0 text-ink backdrop:bg-black/50 open:translate-y-0 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out starting:open:translate-y-full sm:m-auto sm:w-[30rem] sm:rounded-2xl sm:border-b sm:motion-safe:transition-[transform,opacity] sm:starting:open:translate-y-3 sm:starting:open:opacity-0";

const isDone = (r: DayRow, now: number) => r.endMs <= now || r.status === "arrived" || r.status === "no_show";

/** The current minute, ticking on the minute; also refreshes the day when the app comes back. */
function useNow(serverNow: number, live: boolean) {
  const router = useRouter();
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    if (!live) return;
    let id: ReturnType<typeof setInterval> | undefined;
    const tick = () => setNow(Date.now());
    tick();
    const first = setTimeout(() => {
      tick();
      id = setInterval(tick, 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => {
      clearTimeout(first);
      if (id) clearInterval(id);
    };
  }, [live]);
  useEffect(() => {
    const onShow = () => {
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
      router.refresh();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [router]);
  return now;
}

/**
 * Where "now" falls inside a list of `[data-start][data-end]` blocks, in px from the
 * container's top: interpolated through the block in progress, on the hairline between
 * blocks in an idle gap, at the top before the first and at the bottom after the last.
 */
function nowOffset(container: HTMLElement, now: number): number | null {
  const blocks = [...container.querySelectorAll<HTMLElement>("[data-start]")];
  if (blocks.length === 0 || container.getBoundingClientRect().height === 0) return null;
  const top = container.getBoundingClientRect().top;
  const pts: { y: number; t: number }[] = [];
  blocks.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const s = Number(el.dataset.start);
    const next = blocks[i + 1] ? Number(blocks[i + 1].dataset.start) : Infinity;
    const e = Math.min(Number(el.dataset.end), Math.max(next, s));
    pts.push({ y: r.top - top, t: s }, { y: r.bottom - top, t: Math.max(s, e) });
  });
  for (let i = 1; i < pts.length; i++) pts[i].t = Math.max(pts[i].t, pts[i - 1].t);
  if (now <= pts[0].t) return pts[0].y;
  const last = pts[pts.length - 1];
  if (now >= last.t) return last.y;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (now >= a.t && now < b.t) return a.y + ((now - a.t) / (b.t - a.t)) * (b.y - a.y);
  }
  return last.y;
}

/** The red now line (with its dot), moved by transform only. Only on today's date. */
function NowLine({ container, now, label, scrollIntoView }: { container: React.RefObject<HTMLElement | null>; now: number; label: string; scrollIntoView?: boolean }) {
  const [y, setY] = useState<number | null>(null);
  // Glide between minutes, but land on the first position without animating from the top.
  const [placed, setPlaced] = useState(false);
  const scrolled = useRef(false);
  useEffect(() => {
    if (y === null || placed) return;
    const id = requestAnimationFrame(() => setPlaced(true));
    return () => cancelAnimationFrame(id);
  }, [y, placed]);

  useLayoutEffect(() => {
    const el = container.current;
    if (!el) return;
    const measure = () => setY(nowOffset(el, now));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [container, now]);

  // First view: bring the now line into the top third if it's further down the page.
  useEffect(() => {
    const el = container.current;
    if (!scrollIntoView || scrolled.current || y === null || !el) return;
    scrolled.current = true;
    const abs = el.getBoundingClientRect().top + window.scrollY + y;
    if (abs > window.scrollY + window.innerHeight * 0.66) window.scrollTo({ top: abs - window.innerHeight / 3 });
  }, [container, y, scrollIntoView]);

  if (y === null) return null;
  return (
    <div
      data-testid="now-line"
      className={`pointer-events-none absolute inset-x-0 top-0 z-10 -mt-px flex items-center ${placed ? "motion-safe:transition-transform motion-safe:duration-500" : ""}`}
      style={{ transform: `translateY(${y}px)` }}
    >
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="-ml-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red" />
      <span aria-hidden="true" className="h-0.5 flex-1 bg-red" />
    </div>
  );
}

/** One gray tag (the PayTag pill without the card). */
function Tag({ children }: { children: string }) {
  return <PayTag label={children} />;
}

/** The tags under a row: how it's paid, then arrived / no-show / awaiting payment. */
function RowTags({ row, locale }: { row: DayRow; locale: Locale }) {
  const d = dictionaries[locale].day;
  if (row.status === "pending_payment") return <Tag>{d.awaitingPayment}</Tag>;
  return (
    <>
      {row.kind === "booking" && (row.paid ? <PayTag label={d.paidOnline} card /> : <PayTag label={d.payAtShop} />)}
      {row.status === "arrived" && row.kind === "booking" && <Tag>{d.arrived}</Tag>}
      {row.status === "no_show" && <Tag>{d.noShow}</Tag>}
    </>
  );
}

function RowName({ row, locale, dim }: { row: DayRow; locale: Locale; dim: boolean }) {
  const d = dictionaries[locale].day;
  return (
    <span className={`flex min-w-0 items-center gap-2 font-semibold ${dim ? "text-muted" : "text-ink"}`}>
      {row.isNew && (
        <span className="h-2 w-2 shrink-0 rounded-full bg-red" role="img" aria-label={d.newBooking} title={d.newBooking} />
      )}
      <span className="truncate">{row.kind === "walk_in" ? d.walkIn : row.client}</span>
    </span>
  );
}

/** A list row (phone, and a Barber on any screen): time column, name + Service, price, tags. */
function ListRow({ row, now, locale, barberName, onOpen }: { row: DayRow; now: number; locale: Locale; barberName: string | null; onOpen: (id: string, el: HTMLElement) => void }) {
  const d = dictionaries[locale].day;
  const dim = isDone(row, now);
  const body = (
    <>
      <span className="flex flex-col pt-0.5">
        <span className={`font-mono text-base font-semibold tabular-nums ${dim ? "text-muted" : "text-ink"}`}>
          {row.startHm}
          <span className="ml-1 font-sans text-xs font-medium text-muted">{row.startPeriod}</span>
        </span>
        <span className="font-mono text-sm text-muted tabular-nums">{row.endHm}</span>
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <RowName row={row} locale={locale} dim={dim} />
        <span className="truncate text-sm text-muted">
          {row.service} · <span className="font-mono tabular-nums">{d.min(row.durationMin)}</span>
        </span>
        {barberName && <span className="truncate text-sm text-muted">{barberName}</span>}
        <span className="mt-1.5 flex flex-wrap gap-1.5">
          <RowTags row={row} locale={locale} />
        </span>
      </span>
      <span className={`pt-0.5 font-mono text-sm font-medium tabular-nums ${dim ? "text-muted" : "text-ink"}`}>{row.price}</span>
    </>
  );
  const grid = "grid min-h-16 w-full grid-cols-[4.75rem_minmax(0,1fr)_auto] items-start gap-x-3 py-3 text-left";
  return (
    <li data-start={row.startMs} data-end={row.endMs} data-row={row.id} data-done={dim || undefined} className="border-b border-line">
      {row.status === "pending_payment" ? (
        <div className={grid}>{body}</div>
      ) : (
        <button type="button" className={`${grid} -mx-2 w-[calc(100%+1rem)] rounded-lg px-2 transition-colors hover:bg-raised ${focusRing}`} onClick={(e) => onOpen(row.id, e.currentTarget)}>
          {body}
        </button>
      )}
    </li>
  );
}

/** A compact cell in the Owner's desktop columns. */
function CellRow({ row, now, locale, onOpen }: { row: DayRow; now: number; locale: Locale; onOpen: (id: string, el: HTMLElement) => void }) {
  const d = dictionaries[locale].day;
  const dim = isDone(row, now);
  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        <RowName row={row} locale={locale} dim={dim} />
        <span className={`font-mono text-sm font-medium tabular-nums ${dim ? "text-muted" : "text-ink"}`}>{row.price}</span>
      </span>
      <span className="truncate text-sm text-muted">
        {row.service} · <span className="font-mono tabular-nums">{d.min(row.durationMin)}</span>
      </span>
      <span className="mt-1 flex flex-wrap gap-1.5">
        <RowTags row={row} locale={locale} />
      </span>
    </>
  );
  const box = "flex min-h-16 w-full min-w-0 flex-col gap-0.5 rounded-xl border border-line bg-surface px-3 py-2.5 text-left";
  if (row.status === "pending_payment") return <div className={box} data-row={row.id}>{body}</div>;
  return (
    <button type="button" data-row={row.id} className={`${box} transition-colors hover:border-ink/40 ${focusRing}`} onClick={(e) => onOpen(row.id, e.currentTarget)}>
      {body}
    </button>
  );
}

export function DayBoard(props: Props) {
  const { locale, rows, barbers, isOwner, filter, isToday } = props;
  const t = dictionaries[locale];
  const d = t.day;
  const now = useNow(props.serverNow, isToday);
  const listRef = useRef<HTMLOListElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const columns = isOwner && barbers.length > 1;
  const nameOf = (id: string) => barbers.find((b) => b.id === id)?.name ?? "";
  const listRows = filter ? rows.filter((r) => r.barberId === filter) : rows;
  const canWalkIn = isToday && barbers.some((b) => b.services.length > 0);
  const nowLabel = d.now(formatTime(new Date(now), props.timezone, locale));
  const open = useCallback((id: string) => {
    setFlash(null);
    setOpenId(id);
  }, []);

  // Desktop columns: one band per distinct start time, so rows line up across Barbers.
  const bands = [...new Set(rows.map((r) => r.startMs))].sort((a, b) => a - b).map((start) => {
    const inBand = rows.filter((r) => r.startMs === start);
    return { start, end: Math.max(...inBand.map((r) => r.endMs)), rows: inBand, label: inBand[0] };
  });

  const empty = (list: DayRow[]) =>
    list.length === 0 && (
      <div className="flex flex-col items-start gap-3 border-y border-line py-6">
        <p>{isToday ? d.emptyToday : d.emptyOther}</p>
        {props.bookingPath && <ShareLink path={props.bookingPath} shopName={props.shopName} locale={locale} />}
      </div>
    );

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      {props.loadFailed && (
        <Notice role="alert">
          <p>{t.errors.UNKNOWN}</p>
        </Notice>
      )}
      {flash && (
        <Notice role="status">
          <p>{flash}</p>
        </Notice>
      )}

      {/* Phone list (and a Barber's day on any screen). */}
      <div className={columns ? "lg:hidden" : "lg:max-w-3xl"}>
        {empty(listRows) || (
          <div className="relative">
            <ol ref={listRef} className="border-t border-line">
              {listRows.map((r) => (
                <ListRow key={r.id} row={r} now={now} locale={locale} barberName={isOwner && !filter && barbers.length > 1 ? nameOf(r.barberId) : null} onOpen={open} />
              ))}
            </ol>
            {isToday && <NowLine container={listRef} now={now} label={nowLabel} scrollIntoView />}
          </div>
        )}
      </div>

      {/* Owner desktop: one column per Barber under a shared time axis. */}
      {columns && (
        <div className="hidden lg:block">
          {empty(rows) || (
            <div ref={gridRef} className="relative" style={{ ["--cols" as string]: barbers.length }}>
              <div className="grid grid-cols-[5.5rem_repeat(var(--cols),minmax(0,1fr))] gap-x-3 border-b border-line pb-2">
                <span />
                {barbers.map((b) => (
                  <span key={b.id} className="truncate text-sm font-semibold">
                    {b.name}
                  </span>
                ))}
              </div>
              <div>
                {bands.map((band) => (
                  <div key={band.start} data-start={band.start} data-end={band.end} className="grid grid-cols-[5.5rem_repeat(var(--cols),minmax(0,1fr))] gap-x-3 border-b border-line py-2">
                    <span className="flex flex-col pt-2">
                      <span className={`font-mono text-base font-semibold tabular-nums ${band.end <= now ? "text-muted" : "text-ink"}`}>
                        {band.label.startHm}
                        <span className="ml-1 font-sans text-xs font-medium text-muted">{band.label.startPeriod}</span>
                      </span>
                    </span>
                    {barbers.map((b) => (
                      <div key={b.id} className="flex min-w-0 flex-col gap-2">
                        {band.rows
                          .filter((r) => r.barberId === b.id)
                          .map((r) => (
                            <CellRow key={r.id} row={r} now={now} locale={locale} onOpen={open} />
                          ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              {isToday && <NowLine container={gridRef} now={now} label={nowLabel} />}
            </div>
          )}
        </div>
      )}

      {canWalkIn && (
        <div className="sticky z-20 mt-auto flex pt-2 lg:justify-end" style={{ bottom: "calc(var(--shell-bottom, calc(var(--tabbar-h, 64px) + env(safe-area-inset-bottom))) + 0.75rem)" }}>
          <button type="button" className="btn-primary min-h-14 w-full text-base lg:w-auto lg:px-8" onClick={() => { setFlash(null); setWalkInOpen(true); }}>
            <PlusIcon className="h-5 w-5" />
            {d.addWalkIn}
          </button>
        </div>
      )}

      <RowSheet
        row={rows.find((r) => r.id === openId) ?? null}
        barberName={isOwner && openId ? nameOf(rows.find((r) => r.id === openId)?.barberId ?? "") : null}
        locale={locale}
        shopId={props.shopId}
        timezone={props.timezone}
        smsEnabled={props.smsEnabled}
        onClose={() => setOpenId(null)}
        onDone={(msg) => {
          setOpenId(null);
          setFlash(msg);
        }}
      />
      {canWalkIn && (
        <WalkInSheet
          // A fresh sheet each time it opens, starting on the Barber the Owner is filtering by.
          key={walkInOpen ? "open" : "closed"}
          open={walkInOpen}
          locale={locale}
          shopId={props.shopId}
          timezone={props.timezone}
          barbers={barbers.filter((b) => b.services.length > 0)}
          defaultBarber={filter}
          onClose={() => setWalkInOpen(false)}
        />
      )}
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
  const dialogProps = {
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
  return dialogProps;
}

function SheetBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-6">
      <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-line sm:hidden" />
      {children}
    </div>
  );
}

const actionRow = `flex min-h-14 w-full items-center gap-3 px-4 text-left font-medium transition-colors hover:bg-raised disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${focusRing} focus-visible:-outline-offset-2`;

function RowSheet(props: {
  row: DayRow | null;
  barberName: string | null;
  locale: Locale;
  shopId: string;
  timezone: string;
  smsEnabled: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { row, locale } = props;
  const t = dictionaries[locale];
  const d = t.day;
  const router = useRouter();
  const [mode, setMode] = useState<"actions" | "move" | "cancel">("actions");
  const [error, setError] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pending, start] = useTransition();
  const sheet = useSheet(row !== null, () => {
    setMode("actions");
    setError(null);
    setSlot(null);
    props.onClose();
  }, pending);

  const run = (fn: () => Promise<StaffResult>, after: (r: StaffResult) => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(t.errors[r.code] ?? t.errors.UNKNOWN);
      after(r);
      router.refresh();
    });

  const told = props.smsEnabled ? null : d.textsOff;
  const locked = row && (row.kind === "walk_in" ? d.lockedWalkIn : row.status !== "confirmed" ? d.lockedDone : null);

  const errorBox = error && (
    <Notice role="alert">
      <p>{error}</p>
    </Notice>
  );

  return (
    <dialog {...sheet} aria-labelledby="row-sheet-title">
      {row && (
        <SheetBody>
          {mode === "actions" && (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <h2 id="row-sheet-title" className="truncate text-xl font-semibold tracking-tight">
                    {row.kind === "walk_in" ? d.walkIn : row.client}
                  </h2>
                  <p className="text-muted">
                    {row.service} · <span className="font-mono tabular-nums">{d.min(row.durationMin)}</span>
                  </p>
                  <p className="font-mono tabular-nums">{row.range}</p>
                  {props.barberName && <p className="text-sm text-muted">{props.barberName}</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-mono font-medium tabular-nums">{row.price}</span>
                    <RowTags row={row} locale={locale} />
                  </div>
                </div>
                <CloseButton label={d.close} onClick={() => sheet.ref.current?.close()} />
              </div>

              {row.phone && (
                <a href={`tel:${row.phone}`} className="btn-ghost w-full">
                  <PhoneIcon className="h-5 w-5" />
                  {d.call(row.phoneLabel ?? row.phone)}
                </a>
              )}

              {errorBox}

              <div className="overflow-hidden rounded-2xl border border-line">
                {row.kind === "booking" && (
                  <div className="divide-y divide-line">
                    {(["arrived", "no_show"] as const).map((s) => {
                      const on = row.status === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          aria-pressed={on}
                          className={`${actionRow} ${on ? "bg-raised" : ""}`}
                          disabled={pending || on}
                          onClick={() => run(() => setAttendanceAction(row.id, s), () => {})}
                        >
                          {s === "arrived" ? <CheckIcon className="h-6 w-6" /> : <UserOffIcon className="h-6 w-6" />}
                          <span className="flex-1">{s === "arrived" ? d.arrived : d.noShow}</span>
                          {on && <CheckIcon className="h-5 w-5 text-muted" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className={`divide-y divide-line ${row.kind === "booking" ? "border-t border-line" : ""}`}>
                  <button type="button" className={actionRow} disabled={pending || Boolean(locked)} onClick={() => { setError(null); setMode("move"); }}>
                    <ClockIcon className="h-6 w-6" />
                    <span className="flex-1">{d.move}</span>
                  </button>
                  <button type="button" className={actionRow} disabled={pending || Boolean(locked)} onClick={() => { setError(null); setMode("cancel"); }}>
                    <CloseIcon className="h-6 w-6" />
                    <span className="flex-1">{d.cancel}</span>
                  </button>
                </div>
              </div>
              {(row.status === "arrived" || row.status === "no_show") && row.kind === "booking" && <p className="text-sm text-muted">{d.attendanceHint}</p>}
              {locked && <p className="text-sm text-muted">{locked}</p>}
            </>
          )}

          {mode === "move" && (
            <>
              <div className="flex items-center gap-2">
                <BackButton label={d.back} onClick={() => { setMode("actions"); setSlot(null); setError(null); }} />
                <div className="flex min-w-0 flex-col">
                  <h2 id="row-sheet-title" className="text-xl font-semibold tracking-tight">
                    {d.moveTitle}
                  </h2>
                  <p className="truncate text-sm text-muted">
                    {row.client} · <span className="font-mono tabular-nums">{row.range}</span>
                  </p>
                </div>
              </div>
              <Notice>
                <p>{told ?? d.moveTold}</p>
                {row.paid && <p>{d.keepsPayment}</p>}
              </Notice>
              <SlotPicker
                shopId={props.shopId}
                serviceId={row.serviceId}
                barberId={row.barberId}
                timezone={props.timezone}
                locale={locale}
                selected={slot?.startsAt ?? null}
                refreshKey={refreshKey}
                onPick={(s) => {
                  setSlot(s);
                  setError(null);
                }}
              />
              <div className="sticky bottom-0 -mx-5 flex flex-col gap-3 bg-surface px-5 pt-2 pb-1">
                {errorBox}
                {slot && slot.startsAt !== new Date(row.startMs).toISOString() && (
                  <button
                    type="button"
                    className="btn-primary w-full"
                    disabled={pending}
                    aria-busy={pending}
                    onClick={() =>
                      run(
                        () => moveAsStaffAction(row.id, slot.startsAt),
                        (r) => {
                          if (r.ok) props.onDone(d.moved);
                          else if (r.code === "SLOT_TAKEN") {
                            setSlot(null);
                            setRefreshKey((k) => k + 1);
                          }
                        },
                      )
                    }
                  >
                    {pending ? d.moving : d.moveTo(formatTime(slot.startsAt, props.timezone, locale))}
                  </button>
                )}
              </div>
            </>
          )}

          {mode === "cancel" && (
            <>
              <div className="flex flex-col gap-2">
                <h2 id="row-sheet-title" className="text-xl font-semibold tracking-tight">
                  {d.cancelTitle}
                </h2>
                <p className="text-muted">
                  {row.client} · {row.service} · <span className="font-mono tabular-nums">{row.range}</span>
                </p>
              </div>
              <Notice>
                <p>{told ?? d.cancelTold}</p>
                <p>{row.paid ? d.refund(row.price) : d.nothingToRefund}</p>
              </Notice>
              {errorBox}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  className="btn-primary w-full"
                  disabled={pending}
                  aria-busy={pending}
                  onClick={() => run(() => cancelAsStaffAction(row.id), (r) => r.ok && props.onDone(d.cancelled))}
                >
                  {pending ? d.cancelling : d.cancel}
                </button>
                <button type="button" autoFocus className={GRAY_PILL} disabled={pending} onClick={() => { setMode("actions"); setError(null); }}>
                  {d.keep}
                </button>
              </div>
            </>
          )}
        </SheetBody>
      )}
    </dialog>
  );
}

function WalkInSheet(props: {
  open: boolean;
  locale: Locale;
  shopId: string;
  timezone: string;
  barbers: DayBarber[];
  defaultBarber: string | null;
  onClose: () => void;
}) {
  const { locale, barbers } = props;
  const t = dictionaries[locale];
  const d = t.day;
  const router = useRouter();
  const [barberId, setBarberId] = useState<string>(() => barbers.find((b) => b.id === props.defaultBarber)?.id ?? barbers[0]?.id ?? "");
  const barber = barbers.find((b) => b.id === barberId) ?? barbers[0];
  const [serviceId, setServiceId] = useState<string>(barber?.services[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const sheet = useSheet(props.open, () => {
    setError(null);
    props.onClose();
  }, pending);

  const service = barber?.services.find((s) => s.id === serviceId) ?? barber?.services[0];

  const submit = () =>
    start(async () => {
      if (!barber || !service) return;
      setError(null);
      const r = await walkInAction(props.shopId, barber.id, service.id);
      if (r.ok) {
        sheet.ref.current?.close();
        router.refresh();
      } else setError(r.code === "SLOT_TAKEN" ? d.walkInBusy : (t.errors[r.code] ?? t.errors.UNKNOWN));
    });

  const choice = (on: boolean) =>
    `flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 font-medium transition-colors hover:bg-raised has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ink ${on ? "bg-raised" : ""}`;

  return (
    <dialog {...sheet} aria-labelledby="walkin-title">
      {props.open && barber && (
        <SheetBody>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="walkin-title" className="text-xl font-semibold tracking-tight">
                {d.walkInTitle}
              </h2>
              <p className="text-sm text-muted">{d.walkInStarts(formatTime(new Date(), props.timezone, locale))}</p>
            </div>
            <CloseButton label={d.close} onClick={() => sheet.ref.current?.close()} />
          </div>

          {barbers.length > 1 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium text-muted">{d.chooseBarber}</legend>
              <div className="flex flex-wrap gap-2">
                {barbers.map((b) => {
                  const on = b.id === barber.id;
                  return (
                    <label
                      key={b.id}
                      className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink ${on ? "border-ink bg-ink text-paper" : "border-line bg-surface hover:border-ink/40"}`}
                    >
                      <input
                        type="radio"
                        name="walkin-barber"
                        className="sr-only"
                        checked={on}
                        onChange={() => {
                          setBarberId(b.id);
                          setServiceId(b.services[0]?.id ?? "");
                          setError(null);
                        }}
                      />
                      {b.name}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-muted">{d.chooseService}</legend>
            <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
              {barber.services.map((s) => {
                const on = s.id === service?.id;
                return (
                  <label key={s.id} className={choice(on)}>
                    <input
                      type="radio"
                      name="walkin-service"
                      className="sr-only"
                      checked={on}
                      onChange={() => {
                        setServiceId(s.id);
                        setError(null);
                      }}
                    />
                    <span className="flex-1">{s.name}</span>
                    {on && <CheckIcon className="h-5 w-5" />}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {error && (
            <Notice role="alert">
              <p>{error}</p>
            </Notice>
          )}

          <button type="button" className="btn-primary w-full" disabled={pending || !service} aria-busy={pending} onClick={submit}>
            {pending ? d.adding : d.addWalkIn}
          </button>
        </SheetBody>
      )}
    </dialog>
  );
}

/** The booking link as the empty day's one action: the phone's share sheet, else copy. */
function ShareLink({ path, shopName, locale }: { path: string; shopName: string; locale: Locale }) {
  const d = dictionaries[locale].day;
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        className="btn-ghost"
        onClick={async () => {
          const url = `${window.location.origin}${path}`;
          try {
            if (navigator.share) {
              await navigator.share({ title: d.shareTitle(shopName), url });
              return;
            }
          } catch (e) {
            if ((e as Error).name === "AbortError") return;
          }
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        <ShareIcon className="h-5 w-5" />
        {d.shareLink}
      </button>
      <p className="font-mono text-sm break-all text-muted" aria-live="polite">
        {copied ? d.linkCopied : path}
      </p>
    </div>
  );
}

function CloseButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={`-mt-1 -mr-2 inline-grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-ink ${focusRing}`}>
      <CloseIcon className="h-6 w-6" />
    </button>
  );
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={`-ml-2 inline-grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-ink ${focusRing}`}>
      <ArrowLeftIcon className="h-6 w-6" />
    </button>
  );
}
