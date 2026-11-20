import { landingText } from "@/lib/i18n/landing";
import { ogCard } from "./_landing/og-card";

/* The shared-link card: black ground, the open-scissors mark, the name and the tagline,
   set in Hanken Grotesk from the
   TTFs in _landing/fonts (read from disk, nothing is fetched). */
export const alt = "Barber Master";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return ogCard(landingText.footer);
}
