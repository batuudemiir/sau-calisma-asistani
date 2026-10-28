import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Eski bağlantılar (paylaşılmış linkler) yeni rotalara gider; sorgu (d, at, b) korunur.
  redirects() {
    return [
      { source: "/results", destination: "/", permanent: false },
      { source: "/liste", destination: "/", permanent: false },
      { source: "/spaces/:id", destination: "/yer/:id", permanent: false },
      { source: "/map", destination: "/harita", permanent: false },
    ];
  },
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
