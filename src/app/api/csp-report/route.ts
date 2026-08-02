import { NextRequest, NextResponse } from "next/server";

/**
 * CSP Violation Report endpoint.
 *
 * Browsers send violation reports to this URL when a Content-Security-Policy
 * directive is violated. Reports arrive as POST requests with
 * Content-Type: application/csp-report (JSON body).
 *
 * Violations are logged to stderr so they appear in Vercel / server logs.
 * Returns 204 No Content — no auth required (browsers send anonymously).
 *
 * Wire this up in next.config.ts CSP header:
 *   report-uri /api/csp-report
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const report = JSON.parse(body) as {
      "csp-report"?: {
        "document-uri"?: string;
        "blocked-uri"?: string;
        "violated-directive"?: string;
        "effective-directive"?: string;
        "original-policy"?: string;
        disposition?: string;
        "status-code"?: number;
        referrer?: string;
        "line-number"?: number;
        "column-number"?: number;
        "source-file"?: string;
      };
    };

    const csp = report["csp-report"];
    if (csp) {
      console.error(
        "[CSP VIOLATION]",
        JSON.stringify({
          documentUri: csp["document-uri"],
          blockedUri: csp["blocked-uri"],
          violatedDirective: csp["violated-directive"],
          effectiveDirective: csp["effective-directive"],
          disposition: csp["disposition"],
          sourceFile: csp["source-file"],
          lineNumber: csp["line-number"],
          columnNumber: csp["column-number"],
        })
      );
    }
  } catch {
    // Malformed report — log and ignore
    console.warn("[CSP REPORT] Received malformed report body");
  }

  // Always respond 204 — browsers don't process the body
  return new NextResponse(null, { status: 204 });
}
