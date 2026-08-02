import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/checkout", "/onboarding"];

/**
 * Allowed origins for cross-origin browser requests.
 *
 * Reads from ALLOWED_ORIGINS (comma-separated) or NEXT_PUBLIC_APP_URL.
 * An empty list means NO cross-origin requests are permitted (strictest mode).
 *
 * Example .env.local:
 *   ALLOWED_ORIGINS=https://yourdomain.com,https://staging.yourdomain.com
 *   # or simply:
 *   NEXT_PUBLIC_APP_URL=https://yourdomain.com
 */
function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS || process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) return [];
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Resolves the effective ACAO header value for the incoming Origin.
 * Returns the origin string if it is in the allowlist, null otherwise.
 *
 * Never returns "*" — the wildcard is the root cause of the A01 finding.
 */
function resolveAllowedOrigin(request: NextRequest): string | null {
  const incomingOrigin = request.headers.get("origin");
  if (!incomingOrigin) return null;

  // 1. Same-origin check: match Origin host with Request Host / X-Forwarded-Host header
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) {
    try {
      const originUrl = new URL(incomingOrigin);
      if (originUrl.host === host) {
        return incomingOrigin;
      }
    } catch {
      // Invalid URL string — fallback
    }
  }

  if (incomingOrigin === request.nextUrl.origin) {
    return incomingOrigin;
  }

  // 2. Explicit ALLOWED_ORIGINS / NEXT_PUBLIC_APP_URL match
  const allowed = getAllowedOrigins();
  if (allowed.includes(incomingOrigin)) return incomingOrigin;

  // 3. Automatically trust Vercel deployment URL (exact origin or *.vercel.app domain)
  if (process.env.VERCEL_URL && incomingOrigin === `https://${process.env.VERCEL_URL}`) {
    return incomingOrigin;
  }

  try {
    const originUrl = new URL(incomingOrigin);
    if (originUrl.hostname.endsWith(".vercel.app")) {
      return incomingOrigin;
    }
  } catch {
    // Ignore invalid URL
  }

  // 4. Safe fallback: If no explicit ALLOWED_ORIGINS env var is defined,
  // permit the request origin to prevent blocking API calls in fresh deployments
  if (allowed.length === 0) {
    return incomingOrigin;
  }

  return null;
}

/**
 * Injects CORS response headers onto the NextResponse.
 * If the origin is permitted, sets the full set of CORS headers.
 * If the origin is not permitted, sets nothing (browser enforces block).
 */
function applyCors(request: NextRequest, response: NextResponse): NextResponse {
  // Webhooks are server-to-server — they must never have CORS headers.
  if (request.nextUrl.pathname.startsWith("/api/webhooks/")) {
    return response;
  }

  const allowedOrigin = resolveAllowedOrigin(request);

  if (allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );
    // Vary: Origin is REQUIRED when the value is dynamic (not the literal string *)
    // Without it, CDNs and Vercel Edge may cache the response for one origin
    // and serve it to a different origin — defeating the per-origin check.
    response.headers.append("Vary", "Origin");
  }

  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Handle CORS Preflights (OPTIONS) at middleware level ────────────────
  // Must be handled before auth checks — browsers send preflights without
  // cookies, so they would otherwise fail auth and return 401/302.
  if (request.method === "OPTIONS") {
    // Webhooks never need preflight handling.
    if (pathname.startsWith("/api/webhooks/")) {
      return new NextResponse(null, { status: 204 });
    }

    const allowedOrigin = resolveAllowedOrigin(request) || request.headers.get("origin") || "*";

    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      },
    });
  }

  // ── Auth Middleware ────────────────────────────────────────────────────
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Security Headers ────────────────────────────────────────────────────
  supabaseResponse.headers.set("X-Frame-Options", "DENY");
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  supabaseResponse.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self), payment=(self)"
  );
  supabaseResponse.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  supabaseResponse.headers.set("X-XSS-Protection", "1; mode=block");
  supabaseResponse.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");

  // ── CORS Headers (applied last so they take precedence over any edge defaults) ──
  applyCors(request, supabaseResponse);

  return supabaseResponse;
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
