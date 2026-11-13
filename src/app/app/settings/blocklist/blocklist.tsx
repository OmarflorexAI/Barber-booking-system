"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Notice } from "@/components/notice";
import { blockPhoneAction, unblockPhoneAction } from "./actions";

type Labels = {
  empty: string;
  listLabel: string;
  addLabel: string;
  placeholder: string;
  add: string;
  adding: string;
  added: string;
  unblock: string;
  confirm: string;
  keep: string;
  unblocked: string;
  errors: Record<string, string>;
};

type Item = { phone: string; display: string; name: string | null; unblockLabel: string; confirmText: string };

/** The add form on top, then the ruled list; Unblock asks once, inline, before it acts. */
export function Blocklist({ shopId, items, labels }: { shopId: string; items: Item[]; labels: Labels }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const message = (code: string) => labels.errors[code] ?? labels.errors.UNKNOWN;

  function add() {
    setAddError(null);
    setStatus("");
    startTransition(async () => {
      const res = await blockPhoneAction(shopId, phone);
      if (res.ok) {
        setPhone("");
        setStatus(labels.added);
        router.refresh();
      } else {
        setAddError(message(res.code));
      }
    });
  }

  function unblock(p: string) {
    setRowError(null);
    setStatus("");
    startTransition(async () => {
      const res = await unblockPhoneAction(shopId, p);
      if (res.ok) {
        setConfirming(null);
        setStatus(labels.unblocked);
        router.refresh();
      } else {
        setRowError(message(res.code));
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <label htmlFor="block-phone" className="text-sm font-medium">
          {labels.addLabel}
        </label>
        <input
          id="block-phone"
          name="phone"
          className="field font-mono"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          maxLength={25}
          required
          placeholder={labels.placeholder}
          value={phone}
          aria-invalid={addError ? true : undefined}
          aria-describedby={addError ? "block-phone-error" : undefined}
          onChange={(e) => {
            setPhone(e.target.value);
            setAddError(null);
          }}
        />
        {addError && (
          <Notice role="alert" id="block-phone-error">
            <p>{addError}</p>
          </Notice>
        )}
        <button type="submit" className="btn-primary w-full sm:w-auto sm:self-start" disabled={pending || !phone.trim()} aria-busy={pending}>
          {pending ? labels.adding : labels.add}
        </button>
        <p role="status" className="min-h-6 text-sm text-muted">
          {status}
        </p>
      </form>

      <section aria-labelledby="blocked-label" className="flex flex-col gap-3">
        <h2 id="blocked-label" className="text-sm font-medium">
          {labels.listLabel}
        </h2>
        {rowError && (
          <Notice role="alert">
            <p>{rowError}</p>
          </Notice>
        )}
        {items.length === 0 ? (
          <p className="border-t border-line pt-4 text-muted">{labels.empty}</p>
        ) : (
          <ul className="border-t border-line">
            {items.map((it) => (
              <li key={it.phone} className="border-b border-line py-2">
                {confirming === it.phone ? (
                  <div className="flex flex-col gap-3 py-2">
                    <p>{it.confirmText}</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button type="button" className="btn-primary" disabled={pending} aria-busy={pending} onClick={() => unblock(it.phone)}>
                        {labels.confirm}
                      </button>
                      <button type="button" className="btn-ghost" disabled={pending} onClick={() => setConfirming(null)}>
                        {labels.keep}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-12 items-center gap-4">
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-mono font-medium tabular-nums">{it.display}</span>
                      {it.name && <span className="truncate text-sm text-muted">{it.name}</span>}
                    </span>
                    <button
                      type="button"
                      aria-label={it.unblockLabel}
                      className="btn-ghost shrink-0 px-5"
                      onClick={() => {
                        setRowError(null);
                        setConfirming(it.phone);
                      }}
                    >
                      {labels.unblock}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
