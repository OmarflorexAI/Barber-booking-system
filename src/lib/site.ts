/** The public address of the site (no trailing slash), for absolute URLs in metadata, the sitemap and structured data. */
/** LAUNCH: set NEXT_PUBLIC_SITE_URL at build time; these URLs are baked into the static pages. On Vercel the production domain is the fallback. */
const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? (vercel ? `https://${vercel}` : "http://localhost:3000")).replace(/\/+$/, "");
