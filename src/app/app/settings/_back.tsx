import Link from "next/link";
import { focusRing } from "./_owner";

/** "‹ Settings": the way back from a Settings page, a 44px tap target. */
export function BackToSettings({ label }: { label: string }) {
  return (
    <Link
      href="/app/settings"
      className={`-ml-2 inline-flex min-h-11 items-center gap-1 self-start rounded-md px-2 text-sm font-medium text-muted transition-colors hover:text-ink ${focusRing}`}
    >
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="m15 6-6 6 6 6" />
      </svg>
      {label}
    </Link>
  );
}
