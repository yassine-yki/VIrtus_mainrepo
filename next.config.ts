import type { NextConfig } from "next";

const config: NextConfig = {
  outputFileTracingIncludes: {
    "/api/profile/extract": ["./.cv-runtime/**/*"],
  },
  poweredByHeader: false,
  async redirects() {
    // Preserve old shared search links while keeping the entry page static.
    return [
      "q",
      "city",
      "contract",
      "workplace",
      "source",
      "days",
      "sort",
      "kind",
      "tech",
      "family",
      "technology",
      "seniority",
      "pfe",
      "language",
      "page",
    ].map((key) => ({
      source: "/",
      has: [{ type: "query" as const, key }],
      destination: "/offres#offres",
      permanent: false,
    }));
  },
  async headers() {
    return [
      {
        source: "/profil",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
          },
        ],
      },
    ];
  },
};
export default config;
