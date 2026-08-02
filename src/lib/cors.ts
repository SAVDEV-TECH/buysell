import { NextRequest, NextResponse } from "next/server";

/**
 * Allowed origins for API routes that return session-authenticated data.
 *
 * Reads from ALLOWED_ORIGINS (comma-separated) env var, falling back to
 * NEXT_PUBLIC_APP_URL, and finally to a safe default of 'self' (no wildcard).
 *
 * Example .env.local:
 *   ALLOWED_ORIGINS=https://yourdomain.com,https://staging.yourdomain.com
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
 * Returns the appropriate Access-Control-Allow-Origin header value for the
 * given request origin, or null if the origin is not permitted.
 */
export function resolveAllowedOrigin(request: NextRequest): string | null {
  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin) return null;

  const allowed = getAllowedOrigins();
  if (allowed.length === 0) {
    // No env var set — fail closed (deny cross-origin)
    return null;
  }

  return allowed.includes(requestOrigin) ? requestOrigin : null;
}

/**
 * Injects CORS headers onto an existing NextResponse.
 * Returns the same response with headers mutated in place.
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
    // Vary: Origin is required when the value is dynamic (not *)
    response.headers.append("Vary", "Origin");
  }
  return response;
}

/**
 * Handles an OPTIONS preflight request.
 * Returns a 204 No Content response with CORS headers, or 403 if the origin
 * is not in the allowlist.
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
 * Automatically handles OPTIONS preflights and injects CORS response headers.
 *
 * Usage:
 *   export const POST = withCors(async (req: NextRequest) => { ... });
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
