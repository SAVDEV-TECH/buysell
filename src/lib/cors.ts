import { NextRequest, NextResponse } from "next/server";

/**
 * Allowed origins for API routes that return session-authenticated data.
 *
 * Reads from ALLOWED_ORIGINS (comma-separated) env var, falling back to
 * NEXT_PUBLIC_APP_URL.
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
 * Resolves the effective Access-Control-Allow-Origin header value.
 *
 * Guaranteed to permit:
 *  1. Same-origin requests (Origin host matches Request Host header)
 *  2. Vercel deployment URLs (*.vercel.app)
 *  3. Origins listed in ALLOWED_ORIGINS / NEXT_PUBLIC_APP_URL
 *  4. Fallback to request origin when no explicit allowlist is configured
 */
export function resolveAllowedOrigin(request: NextRequest): string | null {
  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin) return null;

  // 1. Same-origin check: match Origin host with Request Host / X-Forwarded-Host header
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) {
    try {
      const originUrl = new URL(requestOrigin);
      if (originUrl.host === host) {
        return requestOrigin;
      }
    } catch {
      // Invalid URL string — fallback
    }
  }

  if (requestOrigin === request.nextUrl.origin) {
    return requestOrigin;
  }

  // 2. Explicit ALLOWED_ORIGINS / NEXT_PUBLIC_APP_URL match
  const allowed = getAllowedOrigins();
  if (allowed.includes(requestOrigin)) return requestOrigin;

  // 3. Automatically trust Vercel deployment URL (exact origin or *.vercel.app domain)
  if (process.env.VERCEL_URL && requestOrigin === `https://${process.env.VERCEL_URL}`) {
    return requestOrigin;
  }

  try {
    const originUrl = new URL(requestOrigin);
    if (originUrl.hostname.endsWith(".vercel.app")) {
      return requestOrigin;
    }
  } catch {
    // Ignore invalid URL
  }

  // 4. Safe fallback: If no explicit ALLOWED_ORIGINS env var is defined,
  // permit the request origin to prevent blocking API calls in fresh deployments
  if (allowed.length === 0) {
    return requestOrigin;
  }

  return null;
}

/**
 * Injects CORS headers onto an existing NextResponse.
 */
export function applyCorsHeaders(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const origin = resolveAllowedOrigin(request);
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );
    response.headers.append("Vary", "Origin");
  }
  return response;
}

/**
 * Handles an OPTIONS preflight request.
 * Returns a 204 No Content response with CORS headers.
 */
export function handleCorsPrelight(request: NextRequest): NextResponse {
  const origin = resolveAllowedOrigin(request) || request.headers.get("origin") || "*";

  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods":
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  });
}

/**
 * Higher-Order Function (HOF) wrapper to apply CORS headers to any Next.js API route handler.
 */
export function withCors(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    if (req.method === "OPTIONS") {
      return handleCorsPrelight(req);
    }
    const response = await handler(req);
    return applyCorsHeaders(req, response);
  };
}
