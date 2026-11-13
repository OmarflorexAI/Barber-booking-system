import type { NavKey } from "./staff";

/*
 * The shell's 24px line icons (DESIGN.md → "Shape, icons and motion in the app"): one 1.5px
 * round-capped stroke. `filled` is the active tab's version: the main shape filled with ink
 * and its inner marks cut out in the bar's --surface tone.
 */
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

// The cut-out tone: the bar's --surface, or whatever the row sets in --icon-cut.
const cut = { stroke: "var(--icon-cut, var(--surface))" };

export function NavIcon({ name, filled = false, className = "h-6 w-6" }: { name: NavKey | "admin"; filled?: boolean; className?: string }) {
  const fill = filled ? "currentColor" : "none";
  switch (name) {
    case "day":
    case "today":
      // A calendar page.
      return (
        <svg {...base} className={className}>
          <rect x="3.75" y="5" width="16.5" height="15.25" rx="2.5" fill={fill} />
          <path d="M8 3v4M16 3v4" />
          <path d="M3.75 10h16.5" {...(filled ? cut : {})} />
          <path d="M8 14h3" {...(filled ? cut : {})} />
        </svg>
      );
    case "dashboard":
      // Three bars.
      return (
        <svg {...base} className={className}>
          <rect x="4" y="12" width="4" height="8" rx="1" fill={fill} />
          <rect x="10" y="4" width="4" height="16" rx="1" fill={fill} />
          <rect x="16" y="8.5" width="4" height="11.5" rx="1" fill={fill} />
        </svg>
      );
    case "settings":
      // Two sliders.
      return (
        <svg {...base} className={className}>
          <path d="M4 8h2.5M11.5 8H20M4 16h8.5M17.5 16H20" />
          <circle cx="9" cy="8" r="2.5" fill={fill} />
          <circle cx="15" cy="16" r="2.5" fill={fill} />
        </svg>
      );
    case "me":
      // A person.
      return (
        <svg {...base} className={className}>
          <circle cx="12" cy="8" r="3.75" fill={fill} />
          <path d="M4.75 20a7.25 7.25 0 0 1 14.5 0Z" fill={fill} />
        </svg>
      );
    case "admin":
      // A shield.
      return (
        <svg {...base} className={className}>
          <path d="M12 3.5 5 6v5.5c0 4.2 3 7.6 7 9 4-1.4 7-4.8 7-9V6Z" fill={fill} />
        </svg>
      );
  }
}

/** The chevron that marks a row as a link to another page. */
export function ChevronIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
