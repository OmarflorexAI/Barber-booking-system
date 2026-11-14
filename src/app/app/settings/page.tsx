import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronIcon, NavIcon } from "../_shell/icons";
import { SignOutButton } from "../_shell/sign-out";
import { ADMIN_PANEL_READY } from "../_shell/staff";
import { RowsSkeleton } from "../_shell/skeleton";
import { shopPlan } from "@/server/booking-engine/plans";
import { getSql } from "@/server/db";
import { SettingsIcon, type SettingsKey } from "./_icons";
import { focusRing, ownerContext } from "./_owner";
import { ProRow } from "./upgrade";

export const metadata: Metadata = { title: "Settings" };

/**
 * Settings index (Owner only): one 56px row per page, each fixing one thing. Rows whose page
 * is built link to it; the others stay plain, muted and marked "Soon" (no dead links).
 * Under the title, the Shop's plan (M7). On Free, the Pro rows (online payments, Client texts,
 * Telegram alerts) carry a gray "Pro" tag and open the "Ask us to upgrade" sheet instead.
 * At the bottom: the Shop's name, the Platform admin link when it applies, and Sign out.
 */
export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Suspense fallback={<RowsSkeleton rows={8} />}>
        <Settings />
      </Suspense>
    </div>
  );
}

type RowKey = SettingsKey | "shop" | "texts" | "telegram";

/** The rows, in order, with the pages that exist so far. `pro` rows are locked on the Free plan. */
const ROWS: { key: RowKey; href?: string; pro?: true }[] = [
  { key: "shop", href: "/app/settings/shop" },
  { key: "services", href: "/app/settings/services" },
  { key: "hours" },
  { key: "barbers", href: "/app/settings/barbers" },
  { key: "rules", href: "/app/settings/rules" },
  { key: "blocklist", href: "/app/settings/blocklist" },
  { key: "payments", pro: true },
  { key: "texts", pro: true },
  { key: "telegram", pro: true },
  { key: "link", href: "/app/settings/link" },
  { key: "export", href: "/app/settings/export" },
];

const row = "-mx-2 flex min-h-14 items-center gap-4 px-2 py-3";

async function Settings() {
  const ctx = await ownerContext();
  if (!ctx) return null;
  const { staff, membership, t, locale } = ctx;
  const s = t.settings;
  const p = t.plans;
  const sql = getSql();
  const [plan, [texting]] = await Promise.all([
    shopPlan(sql, membership.shopId),
    sql<{ on: boolean }[]>`select sms_enabled as on from public.shops where id = ${membership.shopId}`,
  ]);
  const textsOn = plan === "pro" && (texting?.on ?? false);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-[-0.015em]">{t.shell.settings.title}</h1>
        <p className="max-w-prose leading-relaxed text-muted">{s.note}</p>
      </div>

      <section aria-labelledby="plan-name" className="flex flex-col gap-1 rounded-2xl border border-line bg-surface px-4 py-3">
        <h2 id="plan-name" className="font-semibold" data-testid="plan-name">
          {plan === "pro" ? p.pro : p.free}
        </h2>
        <p className="text-sm leading-snug text-muted">{plan === "pro" ? p.proNote : p.freeNote}</p>
      </section>

      <ul className="border-t border-line">
        {ROWS.map(({ key, href, pro }) => {
          const { title, desc } = key === "texts" || key === "telegram" ? p.rows[key] : s.rows[key];
          const locked = pro && plan !== "pro";
          const body = (
            <>
              {key === "shop" ? (
                <ShopIcon className="h-6 w-6 shrink-0 text-muted" />
              ) : key === "texts" ? (
                <TextsIcon className="h-6 w-6 shrink-0 text-muted" />
              ) : key === "telegram" ? (
                <TelegramIcon className="h-6 w-6 shrink-0 text-muted" />
              ) : (
                <SettingsIcon name={key} className="h-6 w-6 shrink-0 text-muted" />
              )}
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={`font-semibold ${href || locked ? "" : "text-muted"}`}>{title}</span>
                <span className="text-sm leading-snug text-muted">{desc}</span>
              </span>
            </>
          );
          return (
            <li key={key} className="border-b border-line">
              {href ? (
                <Link href={href} className={`${row} rounded-md transition-colors hover:bg-surface ${focusRing}`}>
                  {body}
                  <ChevronIcon className="h-5 w-5 shrink-0 text-muted" />
                </Link>
              ) : locked ? (
                <ProRow locale={locale} rowClass={row}>
                  {body}
                </ProRow>
              ) : (
                <div className={row}>
                  {body}
                  {/* Texts work on Pro (switched on by our team), so they show their state; the rest aren't built yet. */}
                  <span className="shrink-0 rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-muted" data-testid={`row-state-${key}`}>
                    {key === "texts" ? (textsOn ? p.textsOn : p.textsOff) : s.soon}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <ul className="border-t border-line">
        <li className="flex min-h-14 items-center justify-between gap-4 border-b border-line">
          <span className="font-medium">{t.shell.settings.shop}</span>
          <span className="min-w-0 truncate text-muted">{membership.shopName}</span>
        </li>
        {staff.isPlatformAdmin && ADMIN_PANEL_READY && (
          <li className="border-b border-line">
            <Link
              href="/admin"
              className={`flex min-h-14 items-center justify-between gap-4 rounded-md transition-colors hover:text-muted ${focusRing}`}
            >
              <span className="flex items-center gap-3 font-medium">
                <NavIcon name="admin" className="h-5 w-5 text-muted" />
                {t.shell.platformAdmin}
              </span>
              <ChevronIcon className="h-5 w-5 text-muted" />
            </Link>
          </li>
        )}
      </ul>

      <SignOutButton label={t.signOut} />
    </div>
  );
}

/** A chat bubble: texts to Clients. */
function TextsIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4 3.5v-3.5a2 2 0 0 1-1.5-2v-8Z" />
      <path d="M8.5 9.5h7M8.5 12.5h4" />
    </svg>
  );
}

/** A paper plane: Telegram alerts. */
function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20.5 4 3.5 11l6 2.5m11-9.5-4 15.5-7-6m11-9.5-11 9.5m0 0v5l2.75-3" />
    </svg>
  );
}

/** A storefront with an awning, in the Settings icons' 1.5px round-capped stroke. */
function ShopIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 9.5 5.5 4.5h13L20 9.5a2.67 2.67 0 0 1-5.33 0 2.67 2.67 0 0 1-5.34 0A2.67 2.67 0 0 1 4 9.5Z" />
      <path d="M5.5 12v7.5h13V12M10 19.5v-4.5h4v4.5" />
    </svg>
  );
}
