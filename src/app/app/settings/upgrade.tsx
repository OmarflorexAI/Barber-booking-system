"use client";

import { useEffect, useId, useRef, useState } from "react";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
/** The app's sheet: a bottom sheet on phones, a centered dialog from 640px; transform + opacity only. */
const SHEET =
  "m-0 mt-auto max-h-[92dvh] w-full max-w-full overflow-y-auto overscroll-contain rounded-t-2xl border border-b-0 border-line bg-surface p-0 text-ink backdrop:bg-black/50 open:translate-y-0 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out starting:open:translate-y-full sm:m-auto sm:w-[30rem] sm:rounded-2xl sm:border-b sm:motion-safe:transition-[transform,opacity] sm:starting:open:translate-y-3 sm:starting:open:opacity-0";

/** The gray "Pro" tag on a locked row (DESIGN.md: never red). */
export function ProTag({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded-full border border-line bg-raised px-2.5 py-0.5 text-xs font-semibold text-ink" data-testid="pro-tag">
      {label}
    </span>
  );
}

/**
 * A Settings row for a Pro feature on a Free Shop: tapping it opens the "Ask us to upgrade"
 * sheet instead of the feature's page. `children` is the row's icon, title and description.
 */
export function ProRow({ locale, rowClass, children }: { locale: Locale; rowClass: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const p = dictionaries[locale].plans;
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={`${rowClass} w-[calc(100%+1rem)] rounded-md text-left transition-colors hover:bg-surface ${focusRing}`}
      >
        {children}
        <ProTag label={p.tag} />
      </button>
      <UpgradeSheet locale={locale} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/**
 * "Ask us to upgrade": what Pro adds, its price and how to ask. No checkout: plans are switched
 * by hand by our team (PLAN.md Q24), so the one action is a link to the landing's contact form.
 * A native modal <dialog>: Escape, the backdrop and Close all close it, and focus returns to the row.
 */
export function UpgradeSheet({ locale, open, onClose }: { locale: Locale; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const s = dictionaries[locale].plans.sheet;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className={SHEET}
    >
      {open && (
        <div className="flex flex-col gap-5 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-6">
          <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-line sm:hidden" />
          <div className="flex items-start justify-between gap-3">
            <h2 id={titleId} className="min-w-0 text-xl font-semibold tracking-tight break-words">
              {s.title}
            </h2>
            <button
              type="button"
              aria-label={s.close}
              onClick={() => ref.current?.close()}
              className={`-mt-1 -mr-2 inline-grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-ink ${focusRing}`}
            >
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-6 w-6">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <p className="leading-relaxed text-muted">{s.intro}</p>
          <ul className="border-t border-line">
            {s.features.map((f, i) => (
              <li key={f.title} className="flex min-h-14 items-start gap-4 border-b border-line py-3">
                <FeatureIcon index={i} className="mt-0.5 h-6 w-6 shrink-0 text-muted" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-semibold">{f.title}</span>
                  <span className="text-sm leading-snug text-muted">{f.desc}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="text-lg font-semibold">
            <Price text={s.price} />
          </p>
          <p className="leading-relaxed text-muted">{s.how}</p>

          <a href={locale === "es" ? "/es#contact" : "/#contact"} className="btn-primary w-full">
            {s.talk}
          </a>
        </div>
      )}
    </dialog>
  );
}

/** Sets the dollar amount in the mono face (DESIGN.md: Mono Means Time, and prices). */
function Price({ text }: { text: string }) {
  const parts = text.split(/(\$\d+)/);
  return parts.map((part, i) =>
    /^\$\d+$/.test(part) ? (
      <span key={i} className="font-mono tabular-nums">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/** Card, chat bubble, paper plane: the three Pro features, in the Settings icons' 1.5px stroke. */
function FeatureIcon({ index, className }: { index: number; className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {index === 0 ? (
        <>
          <rect x="3" y="5.5" width="18" height="13" rx="2" />
          <path d="M3 10h18M7 15h3" />
        </>
      ) : index === 1 ? (
        <path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4 3.5v-3.5h0a2 2 0 0 1-1.5-2v-8Z" />
      ) : (
        <path d="M20.5 4 3.5 11l6 2.5m11-9.5-4 15.5-7-6m11-9.5-11 9.5m0 0v5l2.75-3" />
      )}
    </svg>
  );
}
