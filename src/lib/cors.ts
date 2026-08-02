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
 * Strictly verifies against:
 *  1. Same-origin requests (Origin host matches Request Host header or nextUrl.origin)
 *  2. Exact process.env.VERCEL_URL matching
 *  3. Explicit ALLOWED_ORIGINS / NEXT_PUBLIC_APP_URL allowlist
 *
 * Never returns "*" or reflects unverified wildcards.
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
      // Invalid URL string
    }
  }

  if (requestOrigin === request.nextUrl.origin) {
    return requestOrigin;
  }

  // 2. Explicit ALLOWED_ORIGINS / NEXT_PUBLIC_APP_URL match
  const allowed = getAllowedOrigins();
  if (allowed.includes(requestOrigin)) return requestOrigin;

  // 3. Exact Vercel deployment URL match (without wildcard subdomains)
  if (process.env.VERCEL_URL && requestOrigin === `https://${process.env.VERCEL_URL}`) {
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
 * Returns a 204 No Content response with CORS headers if permitted, or 403 Forbidden.
 */
export function handleCorsPrelight(request: NextRequest): NextResponse {
  const origin = resolveAllowedOrigin(request);
  if (!origin) {
    return new NextResponse(null, { status: 403 });
  }

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
