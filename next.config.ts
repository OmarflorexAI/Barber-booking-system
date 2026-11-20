import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Baseline hardening. No full CSP yet (Turnstile, Stripe and the shaders would need a nonce setup);
  // frame-ancestors alone stops clickjacking on the manage link and the staff app.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  // The Spanish landing and legal pages were retired (2026-11-20): the site is English and
  // browsers offer a translation. Old links and search results land on the English page.
  async redirects() {
    return [
      { source: "/es", destination: "/", permanent: true },
      { source: "/es/privacy", destination: "/privacy", permanent: true },
      { source: "/es/terms", destination: "/terms", permanent: true },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
