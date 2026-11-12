import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Crawl the public pages; keep out staff areas, the API, sign-in and the signed booking links (/m/<token>). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/app", "/api", "/auth", "/m/", "/login"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
