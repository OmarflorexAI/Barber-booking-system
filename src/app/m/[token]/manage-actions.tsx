"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { SlotPicker, type Slot } from "@/components/slot-picker";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { cancelByTokenAction, payByTokenAction, rescheduleByTokenAction } from "./actions";
import { shortWhen } from "./format";
import { ArrowLeftIcon, CardIcon } from "./icons";
import { Notice } from "@/components/notice";

/** The gray pill for Cancel: never red (DESIGN.md → "App buttons"). */
const GRAY_PILL = "btn w-full bg-raised text-ink hover:bg-line";

type Result = { ok: true } | { ok: false; code: string };

/**
 * Change time and Cancel for a confirmed Booking still before the cutoff. Change swaps the
 * actions for the same time picker as /b; Cancel opens a confirm sheet that says whether
 * a refund is coming. After either, the server page re-renders with the new state.
 */
export function ManageActions(props: {
  token: string;
  locale: Locale;
  shopId: string;
  serviceId: string;
  barberId: string;
  timezone: string;
  startsAt: string;
  paidOnline: boolean;
  price: string;
  recap: string;
}) {
  const t = dictionaries[props.locale];
  const m = t.manage;
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "change">("idle");
  const [slot, setSlot] = useState<Slot | null>(null);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pending, start] = useTransition();
  const noticeRef = useRef<HTMLDivElement>(null);
  const changeButtonRef = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);

  // Bring a fresh notice into view and to assistive tech's attention.
  useEffect(() => {
    if (notice) noticeRef.current?.focus({ preventScroll: false });
  }, [notice]);

  const failed = (r: Extract<Result, { ok: false }>) => {
    setNotice({ text: t.errors[r.code] ?? t.errors.UNKNOWN, error: true });
    // The rules changed under us (cutoff passed, cancelled elsewhere): show the real state.
    if (r.code === "CUTOFF_PASSED" || r.code === "BOOKING_NOT_ACTIVE") router.refresh();
  };

  const move = (startsAt: string) =>
    start(async () => {
      const r = await rescheduleByTokenAction(props.token, startsAt);
      if (r.ok) {
        setMode("idle");
        setSlot(null);
        setNotice({ text: props.paidOnline ? m.timeChangedPaid : m.timeChanged, error: false });
        router.refresh();
      } else {
        failed(r);
        if (r.code === "SLOT_TAKEN") {
          setSlot(null);
          setRefreshKey((k) => k + 1);
        }
      }
    });

  const cancel = () =>
    start(async () => {
      const r = await cancelByTokenAction(props.token);
      if (r.ok) {
        sheet.current?.close();
        router.refresh();
      } else {
        sheet.current?.close();
        failed(r);
      }
    });

  const noticeBox = notice && (
    <div ref={noticeRef} tabIndex={-1} className="outline-none">
      <Notice role={notice.error ? "alert" : "status"}>
        <p>{notice.text}</p>
      </Notice>
    </div>
  );

  if (mode === "change") {
    return (
      <section aria-labelledby="change-title" className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("idle");
              setSlot(null);
              setNotice(null);
              requestAnimationFrame(() => changeButtonRef.current?.focus());
            }}
            aria-label={t.back}
            className="-ml-2 inline-grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <div className="flex min-w-0 flex-col">
            <h2 id="change-title" className="text-xl font-semibold tracking-tight">
              {m.changeTitle}
            </h2>
            <p className="text-sm text-muted">
              {m.now}: <span className="tabular-nums">{shortWhen(props.startsAt, props.timezone, props.locale)}</span>
            </p>
          </div>
        </div>

        {props.paidOnline && (
          <Notice icon={<CardIcon className="h-5 w-5" />}>
            <p>{m.keepsPayment}</p>
          </Notice>
        )}

        <SlotPicker
          shopId={props.shopId}
          serviceId={props.serviceId}
          barberId={props.barberId}
          timezone={props.timezone}
          locale={props.locale}
          selected={slot?.startsAt ?? null}
          refreshKey={refreshKey}
          onPick={(s) => {
            setSlot(s);
            setNotice(null);
          }}
        />

        {/* Stays within thumb reach while the list of times scrolls. */}
        <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 bg-paper px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {noticeBox}
          {slot && slot.startsAt !== props.startsAt && (
            <button type="button" className="btn-primary w-full" disabled={pending} aria-busy={pending} onClick={() => move(slot.startsAt)}>
              {pending ? m.moving : m.moveTo(shortWhen(slot.startsAt, props.timezone, props.locale))}
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {noticeBox}
      <button
        ref={changeButtonRef}
        type="button"
        className="btn-primary w-full"
        disabled={pending}
        onClick={() => {
          setNotice(null);
          setMode("change");
        }}
      >
        {t.changeTime}
      </button>
      <button
        type="button"
        className={GRAY_PILL}
        disabled={pending}
        onClick={() => {
          setNotice(null);
          sheet.current?.showModal();
        }}
      >
        {t.cancelBooking}
      </button>

      {/*
        The confirm step: a native modal <dialog>, so focus is trapped, Escape closes it and
        focus returns to "Cancel booking". A bottom sheet on phones, a centered dialog from 640px.
        It slides/fades in with transform + opacity; instant under reduced motion.
      */}
      <dialog
        ref={sheet}
        aria-labelledby="cancel-title"
        onClick={(e) => {
          if (e.target === e.currentTarget && !pending) e.currentTarget.close();
        }}
        onCancel={(e) => {
          if (pending) e.preventDefault();
        }}
        className="m-0 mt-auto max-h-[90dvh] w-full max-w-full rounded-t-2xl border border-b-0 border-line bg-surface p-0 text-ink backdrop:bg-black/50 open:translate-y-0 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out starting:open:translate-y-full sm:m-auto sm:w-[28rem] sm:rounded-2xl sm:border-b sm:motion-safe:transition-[transform,opacity] sm:starting:open:translate-y-3 sm:starting:open:opacity-0"
      >
        <div className="flex flex-col gap-5 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-6">
          <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-line sm:hidden" />
          <div className="flex flex-col gap-2">
            <h2 id="cancel-title" className="text-xl font-semibold tracking-tight">
              {m.cancelTitle}
            </h2>
            <p className="text-muted">
              {props.recap} · <span className="tabular-nums">{shortWhen(props.startsAt, props.timezone, props.locale)}</span>
            </p>
          </div>
          {props.paidOnline ? (
            <Notice icon={<CardIcon className="h-5 w-5" />}>
              <p>{m.refundComing(props.price)}</p>
            </Notice>
          ) : (
            <Notice>
              <p>{m.nothingToPay}</p>
            </Notice>
          )}
          <div className="flex flex-col gap-3">
            <button type="button" className="btn-primary w-full" disabled={pending} aria-busy={pending} onClick={cancel}>
              {pending ? m.cancelling : t.cancelBooking}
            </button>
            <button type="button" autoFocus className={GRAY_PILL} disabled={pending} onClick={() => sheet.current?.close()}>
              {m.keepIt}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

/**
 * Back from Checkout with ?paid=1 while the Booking is still held: the webhook hasn't
 * confirmed it yet. Re-check every 3 seconds for a minute, then hand over a Refresh button.
 */
export function AwaitingPayment({ locale }: { locale: Locale }) {
  const m = dictionaries[locale].manage;
  const router = useRouter();
  const [slow, setSlow] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (slow) return;
    const started = Date.now();
    const id = setInterval(() => {
      if (Date.now() - started >= 60_000) {
        setSlow(true);
        return;
      }
      router.refresh();
    }, 3_000);
    return () => clearInterval(id);
  }, [router, slow]);

  return (
    <>
      <Notice role="status">
        <p>{slow ? m.awaitingSlow : m.awaitingBody}</p>
      </Notice>
      {slow && (
        <button
          type="button"
          className="btn-primary w-full"
          disabled={pending}
          onClick={() =>
            start(() => {
              setSlow(false);
              router.refresh();
            })
          }
        >
          {m.refresh}
        </button>
      )}
    </>
  );
}

/** "Time left to pay 7:42", ticking down; at zero the page re-renders as expired. */
export function HoldCountdown({ expiresAt, serverNow, label }: { expiresAt: string; serverNow: number; label: string }) {
  const router = useRouter();
  const end = new Date(expiresAt).getTime();
  const [now, setNow] = useState(serverNow);
  const left = Math.max(0, Math.ceil((end - now) / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (left === 0) router.refresh();
  }, [left, router]);

  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");
  return (
    <p className="text-muted">
      {label}{" "}
      <span className="font-mono font-medium text-ink tabular-nums" aria-live="off">
        {mm}:{ss}
      </span>
    </p>
  );
}

/** A Booking still held for its online payment: go (back) to the payment page. */
export function PayNowButton(props: { token: string; locale: Locale }) {
  const t = dictionaries[props.locale];
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      {error && (
        <Notice role="alert">
          <p>{error}</p>
        </Notice>
      )}
      <button
        type="button"
        className="btn-primary w-full"
        disabled={pending}
        aria-busy={pending}
        onClick={() =>
          start(async () => {
            const r = await payByTokenAction(props.token);
            if (r.ok) window.location.assign(r.url);
            else setError(t.errors[r.code] ?? t.errors.UNKNOWN);
          })
        }
      >
        <CardIcon className="h-5 w-5" />
        {t.payNow}
      </button>
    </div>
  );
}
