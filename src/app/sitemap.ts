import type { MetadataRoute } from "next";
import { legalPaths } from "@/lib/i18n/legal";
import { SITE_URL } from "@/lib/site";

/** The public pages (English only). Booking pages are per Shop and stay out. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [{ path: "/", priority: 1 }, ...Object.values(legalPaths).map((path) => ({ path, priority: 0.3 }))];
  return pages.map(({ path, priority }) => ({ url: `${SITE_URL}${path}`, changeFrequency: "monthly" as const, priority }));
}
