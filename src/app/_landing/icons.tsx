import type { ReactNode } from "react";

/* Small line icons for the landing page, drawn on a 24px grid in one 1.5px stroke. */
function Icon({ children, className = "h-6 w-6" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

type P = { className?: string };

/** A phone with an open screen: nothing to install. */
export const PhoneIcon = (p: P) => (
  <Icon {...p}>
    <rect x="6.5" y="2.75" width="11" height="18.5" rx="2.25" />
    <path d="M10.5 5.5h3M11 18.25h2" />
  </Icon>
);

/** Two speech bubbles: two languages. */
export const LanguagesIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3.75 5.75a2 2 0 0 1 2-2h7.5a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2H8.5l-3 2.5v-2.5h0a1.75 1.75 0 0 1-1.75-1.75z" />
    <path d="M17.75 9.25h.5a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2v2.5l-3-2.5h-4.75a2 2 0 0 1-2-2v-.5" />
  </Icon>
);

/** A card and a bill: online or in person. */
export const PayIcon = (p: P) => (
  <Icon {...p}>
    <rect x="2.75" y="5.75" width="18.5" height="12.5" rx="2" />
    <path d="M2.75 9.75h18.5M6.5 14.5h3" />
  </Icon>
);

/** A barber chair: the first free one. */
export const ChairIcon = (p: P) => (
  <Icon {...p}>
    <path d="M7.75 3.75h8.5v7.5h-8.5z" />
    <path d="M5.75 11.25h12.5v3h-12.5zM5.75 11.25v-3M18.25 11.25v-3M12 14.25v4.5M8.25 20.25h7.5" />
  </Icon>
);

/** An open door: walk-ins. */
export const DoorIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3.75 20.25h16.5M6.25 20.25V4.75a1 1 0 0 1 1-1h9.5a1 1 0 0 1 1 1v15.5" />
    <path d="M14.25 12v.01" />
  </Icon>
);

/** A list with an arrow out: take your clients with you. */
export const ExportIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4.75 6.75h9.5M4.75 11.25h9.5M4.75 15.75h5.5" />
    <path d="M17.75 13.25v7M15 17.5l2.75 2.75 2.75-2.75" />
  </Icon>
);

/** A storefront awning: we come to your shop. */
export const ShopIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3.75 9.25 5.25 3.75h13.5l1.5 5.5" />
    <path d="M3.75 9.25a2.75 2.75 0 0 0 5.5 0 2.75 2.75 0 0 0 5.5 0 2.75 2.75 0 0 0 5.5 0" />
    <path d="M5.25 11.75v8.5h13.5v-8.5M10 20.25v-4.5h4v4.5" />
  </Icon>
);

/** A QR code: your link at the counter. */
export const QrIcon = (p: P) => (
  <Icon {...p}>
    <rect x="3.75" y="3.75" width="6" height="6" rx="1" />
    <rect x="14.25" y="3.75" width="6" height="6" rx="1" />
    <rect x="3.75" y="14.25" width="6" height="6" rx="1" />
    <path d="M14.25 14.25h2.5v2.5M20.25 14.25v.01M14.25 20.25h.01M17.5 20.25h2.75v-3" />
  </Icon>
);

/** A speech bubble with a person: a real person answers. */
export const SupportIcon = (p: P) => (
  <Icon {...p}>
    <path d="M20.25 11.5a7.75 7.75 0 0 1-11.3 6.9L3.75 20.25l1.85-5.2A7.75 7.75 0 1 1 20.25 11.5z" />
    <path d="M8.75 11.5h.01M12 11.5h.01M15.25 11.5h.01" />
  </Icon>
);
