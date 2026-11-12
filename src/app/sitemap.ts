import type { MetadataRoute } from "next";
import { legalPaths } from "@/lib/i18n/legal";
import { SITE_URL } from "@/lib/site";

/** The public pages, each with its other-language version (hreflang). Booking pages are per Shop and stay out. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { en: "/", es: "/es", priority: 1 },
    ...Object.values(legalPaths).map((p) => ({ ...p, priority: 0.3 })),
  ];
  return pages.flatMap(({ en, es, priority }) => {
    const languages = { en: `${SITE_URL}${en}`, es: `${SITE_URL}${es}`, "x-default": `${SITE_URL}${en}` };
    return [
      { url: `${SITE_URL}${en}`, changeFrequency: "monthly" as const, priority, alternates: { languages } },
      { url: `${SITE_URL}${es}`, changeFrequency: "monthly" as const, priority, alternates: { languages } },
    ];
  });
}
