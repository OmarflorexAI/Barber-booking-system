import { landingDictionaries } from "@/lib/i18n/landing";
import { ogCard } from "../_landing/og-card";

/* The Spanish landing's shared-link card: the same card with the Spanish tagline. A page that
   sets its own openGraph text doesn't inherit the parent segment's image, so /es needs its own. */
export const alt = "Barber Master";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return ogCard(landingDictionaries.es.footer);
}
