"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { cancelAsStaffAction, setAttendanceAction, walkInAction, type StaffResult } from "./actions";

function useStaffAction(locale: Locale) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = dictionaries[locale];
  const run = (fn: () => Promise<StaffResult>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r.ok) router.refresh();
      else setError(t.errors[r.code] ?? t.errors.UNKNOWN);
    });
  return { pending, error, run, t };
}

export function BookingRowActions({ bookingId, status, locale }: { bookingId: string; status: string; locale: Locale }) {
  const { pending, error, run, t } = useStaffAction(locale);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn min-h-10 border px-4 text-sm ${status === "arrived" ? "border-ok bg-ok-soft text-ok" : "border-line"}`}
          disabled={pending}
          onClick={() => run(() => setAttendanceAction(bookingId, "arrived"))}
        >
          {t.arrived}
        </button>
        <button
          type="button"
          className={`btn min-h-10 border px-4 text-sm ${status === "no_show" ? "border-warn bg-warn-soft text-warn" : "border-line"}`}
          disabled={pending}
          onClick={() => run(() => setAttendanceAction(bookingId, "no_show"))}
        >
          {t.noShow}
        </button>
        {status === "confirmed" && (
          <button
            type="button"
            className="btn min-h-10 px-4 text-sm text-accent"
            disabled={pending}
            onClick={() => {
              if (window.confirm(t.cancelConfirm)) run(() => cancelAsStaffAction(bookingId));
            }}
          >
            {t.cancel}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-accent">{error}</p>}
    </div>
  );
}

export function WalkInButton(props: { locale: Locale; shopId: string; barberId: string; services: { id: string; name: string }[] }) {
  const { pending, error, run, t } = useStaffAction(props.locale);
  const [serviceId, setServiceId] = useState(props.services[0]?.id ?? "");
  if (props.services.length === 0) return null;
  return (
    <div className="card flex flex-col gap-2 p-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <select className="field" value={serviceId} onChange={(e) => setServiceId(e.target.value)} aria-label={t.service}>
          {props.services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-primary shrink-0"
          disabled={pending || !serviceId}
          onClick={() => run(() => walkInAction(props.shopId, props.barberId, serviceId))}
        >
          {t.logWalkIn}
        </button>
      </div>
      {error && <p className="text-sm text-accent">{error}</p>}
    </div>
  );
}
