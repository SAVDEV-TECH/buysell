import type { NextConfig } from "next";

/**
 * Content-Security-Policy
 *
 * Changes from previous version:
 *  - REMOVED `https://js.paystack.co` and `https://checkout.flutterwave.com` from
 *    script-src. These CDN domains are NOT used directly — the app uses the npm
 *    packages `react-paystack` and `flutterwave-react-v3` which bundle locally.
 *    Removing them from script-src reduces the attack surface (SRI issue).
 *  - KEPT `https://checkout.flutterwave.com` in frame-src — Flutterwave opens
 *    its checkout in an iframe even when using the npm package.
 *  - KEPT `https://js.paystack.co` in frame-src for the same reason.
 *  - All other changes from the previous hardening pass are preserved.
 */
const isDev = process.env.NODE_ENV === "development";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://accounts.google.com https://js.stripe.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com;
  img-src 'self' blob: data: https://*.supabase.co https://images.unsplash.com https://*.googleusercontent.com https://lh3.googleusercontent.com;
  font-src 'self' https://fonts.gstatic.com data:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://ipapi.co https://api.ipify.org https://api.paystack.co https://api.flutterwave.com https://accounts.google.com https://api.stripe.com https://js.stripe.com https://api.smileidentity.com https://api.vertofx.com https://openexchangerates.org;
  frame-src 'self' https://accounts.google.com https://checkout.flutterwave.com https://js.paystack.co https://js.stripe.com https://hooks.stripe.com;
  worker-src 'self' blob:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
  report-uri /api/csp-report;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: cspHeader,
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

/**
 * Authenticated API routes must never be stored in shared caches.
 * Even though Next.js dynamic routes default to no-store, being explicit
 * prevents accidental caching at CDN/Vercel Edge layers.
 */
const privateApiHeaders = [
  {
    key: "Cache-Control",
    value: "no-store, no-cache, must-revalidate, private",
  },
  {
    key: "Pragma",
    value: "no-cache",
  },
];

/**
 * Webhook routes must NOT have CORS headers.
 * Paystack, Flutterwave, and Stripe call webhooks from their own servers
 * (not browsers), so CORS is irrelevant — and a wildcard origin here would
 * be misleading and potentially dangerous.
 */
const webhookHeaders = [
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      // Webhook routes — minimal headers, no CORS, no caching
      {
        source: "/api/webhooks/(.*)",
        headers: webhookHeaders,
      },
      // Authenticated API routes — explicitly prevent caching
      {
        source: "/api/admin/(.*)",
        headers: privateApiHeaders,
      },
      {
        source: "/api/escrow/(.*)",
        headers: privateApiHeaders,
      },
      {
        source: "/api/auth/(.*)",
        headers: privateApiHeaders,
      },
      // All routes — full security header suite
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
