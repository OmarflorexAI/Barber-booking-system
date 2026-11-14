"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Notice } from "@/components/notice";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { removePriceAction, savePriceAction } from "./prices-actions";

export type PriceItem = {
  serviceId: string;
  name: string;
  shopDurationMin: number;
  offer: {
    priceCents: number;
    durationOverrideMin: number | null;
    special: { cents: number; endDate: string } | null;
  } | null;
};

export const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
/** The gray pill for the quiet actions: never red (DESIGN.md → "App buttons"). */
const GRAY_PILL = "btn bg-raised text-ink hover:bg-line";
const TEXT_BTN = `-ml-2 inline-flex min-h-11 items-center gap-2 self-start rounded-md px-2 text-sm font-medium text-ink underline underline-offset-4 decoration-line hover:decoration-ink ${focusRing}`;

/** The 15-minute grid from 15 min to 4 h. */
const DURATIONS = Array.from({ length: 16 }, (_, i) => (i + 1) * 15);

/** "30" or "27.50" (a leading "$" is fine) → cents; null when it isn't a price. */
function parseMoney(raw: string): number | null {
  const m = /^\$?\s*(\d{1,5})(?:\.(\d{1,2}))?$/.exec(raw.trim());
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

/** Cents → what goes back in the field: "30" or "27.50". */
const moneyField = (cents: number) => (cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2));

/**
 * The on/off switch (a real `role="switch"` button, 44px tap target). The track is ink when on,
 * a hairline tone when off; the thumb slides with a transform only. Never red.
 */
export function Switch({
  checked,
  onChange,
  disabled,
  labelledBy,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  labelledBy?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`group inline-grid h-11 w-14 shrink-0 place-items-center rounded-full disabled:opacity-40 ${focusRing}`}
    >
      <span
        aria-hidden="true"
        className={`relative block h-7 w-12 rounded-full border transition-colors ${checked ? "border-ink bg-ink" : "border-line bg-line"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 block h-5.5 w-5.5 rounded-full motion-safe:transition-transform motion-safe:duration-150 ${
            checked ? "translate-x-5 bg-paper" : "translate-x-0 bg-muted"
          }`}
        />
      </span>
    </button>
  );
}

/** Every active Shop Service with this Barber's switch, price, duration and special price. */
export function PriceList(props: { shopId: string; barberId: string; locale: Locale; today: string; items: PriceItem[] }) {
  const p = dictionaries[props.locale].settings.barberProfile.prices;
  if (props.items.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="max-w-prose">{p.empty}</p>
        <Link href="/app/settings/services" className="btn-ghost self-start">
          {p.emptyAction}
        </Link>
      </div>
    );
  }
  return (
    <ul aria-label={p.listLabel} className="border-t border-line">
      {props.items.map((it) => (
        <PriceRow key={it.serviceId} {...props} item={it} />
      ))}
    </ul>
  );
}

function PriceRow({ shopId, barberId, locale, today, item }: { shopId: string; barberId: string; locale: Locale; today: string; item: PriceItem }) {
  const t = dictionaries[locale].settings;
  const p = t.barberProfile.prices;
  const hours = t.services.hours;
  const router = useRouter();
  const id = useId();
  const saved = item.offer;

  const [on, setOn] = useState(saved !== null);
  const [price, setPrice] = useState(saved ? moneyField(saved.priceCents) : "");
  const [duration, setDuration] = useState<number | null>(saved?.durationOverrideMin ?? null);
  const [hasSpecial, setHasSpecial] = useState(saved?.special != null);
  const [specialPrice, setSpecialPrice] = useState(saved?.special ? moneyField(saved.special.cents) : "");
  const [specialEnd, setSpecialEnd] = useState(saved?.special?.endDate ?? "");
  const [confirmOff, setConfirmOff] = useState(false);
  const [error, setError] = useState<{ text: string; field?: "price" | "special" | "specialEnd" } | null>(null);
  const [status, setStatus] = useState("");
  const [pending, start] = useTransition();

  const errText = (code: string) => p.errors[code as keyof typeof p.errors] ?? p.errors.UNKNOWN;
  const errId = `${id}-error`;
  const invalid = (f: "price" | "special" | "specialEnd") => (error?.field === f ? { "aria-invalid": true, "aria-describedby": errId } : {});

  function turnOff() {
    setError(null);
    setStatus("");
    if (!saved) {
      setOn(false);
      return;
    }
    if (saved.special && !confirmOff) {
      setConfirmOff(true);
      return;
    }
    setOn(false);
    start(async () => {
      const res = await removePriceAction({ shopId, barberId, serviceId: item.serviceId });
      if (res.ok) {
        setConfirmOff(false);
        setStatus(p.removed(item.name));
        router.refresh();
      } else {
        setOn(true);
        setConfirmOff(false);
        setError({ text: errText(res.code) });
      }
    });
  }

  function save() {
    const priceCents = parseMoney(price);
    if (!price.trim()) return setError({ text: p.errors.PRICE_REQUIRED, field: "price" });
    if (priceCents === null) return setError({ text: p.errors.PRICE_INVALID, field: "price" });
    let special: { cents: number; endDate: string } | null = null;
    if (hasSpecial) {
      const cents = parseMoney(specialPrice);
      if (cents === null) return setError({ text: p.errors.SPECIAL_INVALID, field: "special" });
      if (!specialEnd) return setError({ text: p.errors.SPECIAL_DATE_REQUIRED, field: "specialEnd" });
      if (specialEnd < today) return setError({ text: p.errors.SPECIAL_PAST, field: "specialEnd" });
      special = { cents, endDate: specialEnd };
    }
    setError(null);
    setStatus("");
    start(async () => {
      const res = await savePriceAction({
        shopId,
        barberId,
        serviceId: item.serviceId,
        priceCents,
        durationOverrideMin: duration,
        special,
      });
      if (res.ok) {
        setStatus(p.saved(item.name));
        router.refresh();
      } else setError({ text: errText(res.code), field: res.code === "SPECIAL_PAST" ? "specialEnd" : undefined });
    });
  }

  const durations = [...new Set([...DURATIONS, ...(saved?.durationOverrideMin ? [saved.durationOverrideMin] : [])])].sort((a, b) => a - b);

  return (
    <li className="flex flex-col border-b border-line py-2">
      <div className="flex min-h-14 items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span id={`${id}-name`} className="truncate font-semibold">
            {item.name}
          </span>
          <span className="font-mono text-sm text-muted tabular-nums">{hours(item.shopDurationMin)}</span>
        </div>
        <span id={`${id}-offers`} className="text-sm text-muted">
          {p.offers}
        </span>
        <Switch
          checked={on}
          disabled={pending}
          labelledBy={`${id}-offers ${id}-name`}
          onChange={(next) => {
            if (!next) return turnOff();
            setOn(true);
            setError(null);
            setStatus("");
          }}
        />
      </div>

      {confirmOff && (
        <div className="flex flex-col gap-3 pb-4">
          <p className="leading-relaxed">{p.confirmOff(item.name)}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" className="btn-primary w-full sm:w-auto" disabled={pending} aria-busy={pending} onClick={turnOff}>
              {pending ? p.removing : p.confirmOffYes}
            </button>
            <button type="button" autoFocus className={`${GRAY_PILL} w-full sm:w-auto`} disabled={pending} onClick={() => setConfirmOff(false)}>
              {p.keep}
            </button>
          </div>
        </div>
      )}

      {on && !confirmOff && (
        <form
          noValidate
          aria-labelledby={`${id}-name`}
          className="flex flex-col gap-4 pb-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-sm font-medium">{p.price}</span>
              <span className="relative">
                <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-mono text-muted">
                  $
                </span>
                <input
                  className="field pl-8 font-mono tabular-nums"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="30"
                  maxLength={9}
                  value={price}
                  {...invalid("price")}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    if (error) setError(null);
                  }}
                />
              </span>
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-sm font-medium">{p.duration}</span>
              <select
                className="field font-mono tabular-nums"
                value={duration ?? ""}
                onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">{p.sameAsShop(hours(item.shopDurationMin))}</option>
                {durations.map((m) => (
                  <option key={m} value={m}>
                    {hours(m)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {hasSpecial ? (
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1.5 text-sm font-medium">{p.special}</legend>
              <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2">
                <label className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-sm text-muted">{p.specialPrice}</span>
                  <span className="relative">
                    <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-mono text-muted">
                      $
                    </span>
                    <input
                      className="field pl-8 font-mono tabular-nums"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="25"
                      maxLength={9}
                      value={specialPrice}
                      {...invalid("special")}
                      onChange={(e) => {
                        setSpecialPrice(e.target.value);
                        if (error) setError(null);
                      }}
                    />
                  </span>
                </label>
                <label className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-sm text-muted">{p.specialEnds}</span>
                  <input
                    type="date"
                    className="field font-mono tabular-nums"
                    min={today}
                    value={specialEnd}
                    {...invalid("specialEnd")}
                    onChange={(e) => {
                      setSpecialEnd(e.target.value);
                      if (error) setError(null);
                    }}
                  />
                </label>
              </div>
              <p className="text-sm text-muted">{p.specialHint}</p>
              <button
                type="button"
                className={TEXT_BTN}
                onClick={() => {
                  setHasSpecial(false);
                  setSpecialPrice("");
                  setSpecialEnd("");
                  if (error) setError(null);
                }}
              >
                {p.removeSpecial}
              </button>
            </fieldset>
          ) : (
            <button type="button" className={TEXT_BTN} onClick={() => setHasSpecial(true)}>
              {p.addSpecial}
            </button>
          )}

          {error && (
            <Notice role="alert" id={errId}>
              <p>{error.text}</p>
            </Notice>
          )}

          <button type="submit" className="btn-ghost w-full sm:w-auto sm:self-start" disabled={pending} aria-busy={pending}>
            {pending ? p.saving : p.save}
          </button>
        </form>
      )}

      {!on && !confirmOff && error && (
        <div className="pb-4">
          <Notice role="alert" id={errId}>
            <p>{error.text}</p>
          </Notice>
        </div>
      )}

      <p role="status" className="text-sm text-muted">
        {status}
      </p>
    </li>
  );
}
