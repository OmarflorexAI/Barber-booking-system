"use client";

import { useActionState } from "react";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { sendMagicLink, type LoginState } from "./actions";

export function LoginForm({ locale }: { locale: Locale }) {
  const t = dictionaries[locale];
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, { status: "idle" });

  if (state.status === "sent") {
    return <p className="rounded-xl bg-ok-soft px-4 py-3 text-ok">{t.linkSent}</p>;
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t.email}</span>
        <input className="field" type="email" name="email" autoComplete="email" required />
      </label>
      {state.status === "error" && (
        <p role="alert" className="text-sm text-accent">
          {t.errors[state.message ?? "UNKNOWN"] ?? t.errors.UNKNOWN}
        </p>
      )}
      <button className="btn-primary" disabled={pending}>
        {t.sendLink}
      </button>
    </form>
  );
}
