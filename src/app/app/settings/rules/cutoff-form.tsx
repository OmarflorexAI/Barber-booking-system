"use client";

import { useState, useTransition } from "react";
import { Notice } from "@/components/notice";
import { setCutoffAction } from "./actions";

type Labels = {
  cutoffLabel: string;
  save: string;
  saving: string;
  saved: string;
  reminderTitle: string;
  reminderBody: string;
  errors: Record<string, string>;
};

type Choice = { minutes: number; label: string; current: string };

const row = (on: boolean) =>
  `flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 font-medium transition-colors hover:bg-raised has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ink ${on ? "bg-raised" : ""}`;

/** One ruled list of cutoff choices, one Save; "Saved" on success, the reminder warning when it applies. */
export function CutoffForm({ shopId, initial, choices, labels }: { shopId: string; initial: number; choices: Choice[]; labels: Labels }) {
  const [saved, setSaved] = useState(initial);
  const [picked, setPicked] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const [warning, setWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const savedLabel = choices.find((c) => c.minutes === saved)?.current ?? "";

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await setCutoffAction(shopId, picked);
      if (res.ok) {
        setSaved(picked);
        setStatus("saved");
        setWarning(res.warning === "REMINDER_AFTER_CUTOFF");
      } else {
        setStatus("idle");
        setError(labels.errors[res.code] ?? labels.errors.UNKNOWN);
      }
    });
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <fieldset>
        <legend className="mb-1 text-sm font-medium">{labels.cutoffLabel}</legend>
        <p data-testid="cutoff-current" className="mb-3 text-sm text-muted">
          {savedLabel}
        </p>
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {choices.map((c) => {
            const on = c.minutes === picked;
            return (
              <label key={c.minutes} className={row(on)}>
                <input
                  type="radio"
                  name="cutoff"
                  value={c.minutes}
                  className="sr-only"
                  checked={on}
                  onChange={() => {
                    setPicked(c.minutes);
                    setStatus("idle");
                    setError(null);
                  }}
                />
                <span className="flex-1">{c.label}</span>
                {on && (
                  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                )}
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

      <button type="submit" className="btn-primary w-full sm:w-auto sm:self-start" disabled={pending} aria-busy={pending}>
        {pending ? labels.saving : labels.save}
      </button>

      <p role="status" className="min-h-6 text-sm text-muted">
        {status === "saved" ? labels.saved : ""}
      </p>

      {status === "saved" && warning && (
        <Notice role="status">
          <p className="font-medium">{labels.reminderTitle}</p>
          <p className="text-muted">{labels.reminderBody}</p>
        </Notice>
      )}
    </form>
  );
}
