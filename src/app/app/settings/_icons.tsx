/*
 * Settings row icons: 24px line drawings in the shell's one 1.5px round-capped stroke
 * (DESIGN.md → "Shape, icons and motion in the app").
 */
export type SettingsKey = "services" | "hours" | "barbers" | "rules" | "blocklist" | "payments" | "link" | "export";

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

const paths: Record<SettingsKey, React.ReactNode> = {
  // A price tag.
  services: (
    <>
      <path d="M3.75 12.6V4.75a1 1 0 0 1 1-1h7.85a1 1 0 0 1 .7.3l7.1 7.1a1 1 0 0 1 0 1.4l-7.85 7.85a1 1 0 0 1-1.4 0l-7.1-7.1a1 1 0 0 1-.3-.7Z" />
      <circle cx="8.25" cy="8.25" r="1.25" />
    </>
  ),
  // A clock.
  hours: (
    <>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  // Two people.
  barbers: (
    <>
      <circle cx="9" cy="8.5" r="3.25" />
      <path d="M3 19.5a6 6 0 0 1 12 0" />
      <path d="M15.5 5.6a3.25 3.25 0 0 1 0 5.8M17.5 14.2a6 6 0 0 1 3.5 5.3" />
    </>
  ),
  // A checklist.
  rules: (
    <>
      <path d="m4 7 1.5 1.5L8.5 5.5M4 15l1.5 1.5 3-3" />
      <path d="M11.5 7.25H20M11.5 15.25H20" />
    </>
  ),
  // A circle with a slash.
  blocklist: (
    <>
      <circle cx="12" cy="12" r="8.25" />
      <path d="m6.2 6.2 11.6 11.6" />
    </>
  ),
  // A card.
  payments: (
    <>
      <rect x="3" y="5.75" width="18" height="12.5" rx="2" />
      <path d="M3 10h18M6.5 14.5h3" />
    </>
  ),
  // A QR code.
  link: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h2.5v2.5M20 14v.01M14 20h.01M17 20h3v-3" />
    </>
  ),
  // A tray with a down arrow.
  export: (
    <>
      <path d="M12 4v10M8 10.5l4 4 4-4" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </>
  ),
};

export function SettingsIcon({ name, className = "h-6 w-6" }: { name: SettingsKey; className?: string }) {
  return (
    <svg {...base} className={className}>
      {paths[name]}
    </svg>
  );
}
