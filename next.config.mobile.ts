import type { NextConfig } from "next";

/**
 * Mobile Static Export Config
 *
 * Used exclusively for Capacitor native builds (Android / iOS).
 * Run:  npm run build:mobile
 *
 * This generates a fully static `out/` directory which Capacitor
 * packages into the native WebView.  The standard `next build`
 * (for Vercel) remains unchanged.
 */

const mobileConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  distDir: "out",

  images: {
    // Static export cannot use Next.js Image Optimization server.
    // All remote images must be fetched and cached at build-time
    // or rendered with unoptimized:true.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },

  // Disable API routes for static export — native app talks to
  // Supabase and external APIs directly from the client.
  // API routes (e.g. /api/webhooks) live on Vercel, not in the app bundle.
};

export default mobileConfig;
