"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SlotPicker, type Slot } from "@/components/slot-picker";
import { dictionaries, formatDateTime, type Locale } from "@/lib/i18n/dictionaries";
import { cancelByTokenAction, rescheduleByTokenAction } from "./actions";

export function ManageActions(props: {
  token: string;
  locale: Locale;
  shopId: string;
  serviceId: string;
  barberId: string;
  timezone: string;
}) {
  const t = dictionaries[props.locale];
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "change">("idle");
  const [slot, setSlot] = useState<Slot | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: true } | { ok: false; code: string }>, okText: string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setMessage({ tone: "ok", text: okText });
        setMode("idle");
        router.refresh();
      } else {
        setMessage({ tone: "error", text: t.errors[r.code] ?? t.errors.UNKNOWN });
        if (r.code === "SLOT_TAKEN") {
          setSlot(null);
          setRefreshKey((k) => k + 1);
        }
      }
    });

  return (
    <section className="flex flex-col gap-4">
      {message && (
        <p role="status" className={`rounded-xl px-4 py-3 text-sm ${message.tone === "ok" ? "bg-ok-soft text-ok" : "bg-accent-soft text-accent"}`}>
          {message.text}
        </p>
      )}

      {mode === "idle" ? (
        <div className="flex flex-col gap-3">
          <button type="button" className="btn-ghost" onClick={() => setMode("change")} disabled={pending}>
            {t.changeTime}
          </button>
          <button
            type="button"
            className="btn text-accent"
            disabled={pending}
            onClick={() => {
              if (window.confirm(t.cancelConfirm)) run(() => cancelByTokenAction(props.token), t.cancelled);
            }}
          >
            {t.cancelBooking}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <button type="button" className="w-fit text-sm text-muted" onClick={() => setMode("idle")}>
            ← {t.back}
          </button>
          <SlotPicker
            shopId={props.shopId}
            serviceId={props.serviceId}
            barberId={props.barberId}
            timezone={props.timezone}
            locale={props.locale}
            selected={slot?.startsAt ?? null}
            refreshKey={refreshKey}
            onPick={setSlot}
          />
          {slot && (
            <button
              type="button"
              className="btn-primary"
              disabled={pending}
              onClick={() => run(() => rescheduleByTokenAction(props.token, slot.startsAt), t.moved)}
            >
              {t.saveNewTime}: {formatDateTime(slot.startsAt, props.timezone, props.locale)}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
