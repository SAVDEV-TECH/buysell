import type { NextConfig } from "next";

/**
 * Content-Security-Policy Hardening Suite
 */
const isDev = process.env.NODE_ENV === "development";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://accounts.google.com https://js.stripe.com https://www.clarity.ms https://c.clarity.ms https://scripts.clarity.ms;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com;
  img-src 'self' blob: data: https://*.supabase.co https://images.unsplash.com https://*.googleusercontent.com https://lh3.googleusercontent.com https://c.clarity.ms;
  font-src 'self' https://fonts.gstatic.com data:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://ipapi.co https://api.ipify.org https://api.paystack.co https://api.flutterwave.com https://accounts.google.com https://api.stripe.com https://js.stripe.com https://api.smileidentity.com https://api.vertofx.com https://openexchangerates.org https://buysell-ai-agent-production.up.railway.app https://www.clarity.ms https://c.clarity.ms https://scripts.clarity.ms;
  frame-src 'self' https://accounts.google.com https://checkout.flutterwave.com https://js.paystack.co https://js.stripe.com https://hooks.stripe.com https://buysell-ai-agent-production.up.railway.app;
  worker-src 'self' blob:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
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
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
];

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

const webhookHeaders = [
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async headers() {
    return [
      // Webhook routes — minimal headers, no CORS, no caching
      {
        source: "/api/webhooks/:path*",
        headers: webhookHeaders,
      },
      // Authenticated API routes — explicitly prevent caching
      {
        source: "/api/admin/:path*",
        headers: privateApiHeaders,
      },
      {
        source: "/api/escrow/:path*",
        headers: privateApiHeaders,
      },
      {
        source: "/api/auth/:path*",
        headers: privateApiHeaders,
      },
      // ALL app pages except Next.js static asset bundles
      {
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
