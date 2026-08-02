/**
 * Security utility functions for sanitizing user-controlled values before
 * they are rendered into the DOM or used in redirects.
 *
 * These functions are intentionally strict — they fail closed (safe fallback)
 * rather than attempting to clean or transform dangerous input.
 */

// ── safeHref ─────────────────────────────────────────────────────────────────

/**
 * Allowed URL protocols for href attributes.
 * Anything else (javascript:, data:, vbscript:, blob:, etc.) is rejected.
 */
const ALLOWED_HREF_PROTOCOLS = ["https:", "http:"];

/**
 * Validates a URL string before use in an `href` attribute.
 *
 * Returns the original URL if it has an allowed protocol (https/http).
 * Returns `"#"` for:
 *  - `javascript:` URLs (XSS vector)
 *  - `data:` URLs (XSS / data-exfiltration vector)
 *  - Relative paths (use Next.js <Link href="..."> for those instead)
 *  - Empty, null, undefined, or malformed strings
 *
 * Usage:
 *   <a href={safeHref(org.website)}>Visit</a>
 *   <Link href={safeHref(notif.link)}>View</Link>
 */
export function safeHref(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "#";

  const trimmed = url.trim();
  if (!trimmed) return "#";

  try {
    // URL constructor will throw for relative paths without a base.
    // We use a dummy base so relative URLs parse, then check their protocol.
    const parsed = new URL(trimmed, "https://placeholder.invalid");

    if (!ALLOWED_HREF_PROTOCOLS.includes(parsed.protocol)) {
      console.warn(`[safeHref] Blocked disallowed protocol: "${parsed.protocol}" in "${trimmed}"`);
      return "#";
    }

    // Verify the URL actually has an explicit protocol (not inherited from base).
    // e.g. "//evil.com" would resolve to https://evil.com with our base —
    // we must reject protocol-relative URLs too.
    if (!trimmed.startsWith("https://") && !trimmed.startsWith("http://")) {
      console.warn(`[safeHref] Blocked protocol-relative or relative URL: "${trimmed}"`);
      return "#";
    }

    return trimmed;
  } catch {
    console.warn(`[safeHref] Failed to parse URL: "${trimmed}"`);
    return "#";
  }
}

// ── safeRedirectPath ──────────────────────────────────────────────────────────

const SAFE_REDIRECT_FALLBACK = "/dashboard";

/**
 * Validates a redirect/next path parameter before using it in a redirect.
 *
 * Returns the path if it is a safe relative path:
 *  - Must start with "/"
 *  - Must NOT start with "//" (protocol-relative URL that browsers treat as absolute)
 *  - Must NOT contain ":" (catches "javascript:", "http:", etc.)
 *  - Must NOT contain "@" (catches "//user@evil.com" style bypasses)
 *  - Must NOT be longer than 512 characters (guards against log injection)
 *
 * Returns `SAFE_REDIRECT_FALLBACK` ("/dashboard") for anything else.
 *
 * Usage:
 *   const redirectPath = safeRedirectPath(searchParams.get("next"));
 *   return NextResponse.redirect(`${origin}${redirectPath}`);
 */
export function safeRedirectPath(
  path: string | null | undefined,
  fallback: string = SAFE_REDIRECT_FALLBACK
): string {
  if (!path || typeof path !== "string") return fallback;

  const trimmed = path.trim();

  if (
    !trimmed.startsWith("/") ||      // Must be an absolute-root relative path
    trimmed.startsWith("//") ||      // Protocol-relative URL — looks relative, acts absolute
    trimmed.includes(":") ||         // Any protocol (javascript:, http:, etc.)
    trimmed.includes("@") ||         // Auth-embedding bypass
    trimmed.length > 512             // Excessive length guard
  ) {
    console.warn(`[safeRedirectPath] Blocked unsafe redirect path: "${trimmed}"`);
    return fallback;
  }

  return trimmed;
}
