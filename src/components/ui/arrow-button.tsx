import type { AnchorHTMLAttributes, ReactNode } from "react";
import { focusRing } from "@/app/_landing/ui";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children"> & {
  href: string;
  /** `primary`: the light button that leads. `quiet`: a raised panel button beside it. */
  tone?: "primary" | "quiet";
  className?: string;
  children: ReactNode;
};

/**
 * A full-width pill link with a label and an arrow (`.arrow-btn` in globals.css). At rest the
 * arrow is only a chevron; on hover or focus its shaft appears and the chevron slides right.
 * Under reduced motion only the colors change. It is a plain `<a>` because it points at a
 * section on the same page.
 */
export function ArrowButton({ href, tone = "primary", className = "", children, ...rest }: Props) {
  return (
    <a href={href} data-tone={tone} className={`arrow-btn ${focusRing} ${className}`} {...rest}>
      <span>{children}</span>
      <span className="arrow-btn__arrow" aria-hidden="true" />
    </a>
  );
}
