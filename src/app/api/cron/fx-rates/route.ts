/**
 * GET /api/cron/fx-rates
 *
 * Cron job endpoint that refreshes all tracked currency pairs in Supabase.
 * Called every 4 hours by Vercel Cron (see vercel.json).
 *
 * Security: Protected by CRON_SECRET header (set in Vercel env vars).
 */

import { NextRequest, NextResponse } from "next/server";
import { refreshAllRates } from "@/lib/fxRates";
import { handleApiError, successResponse } from "@/lib/apiResponse";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    // Verify this request came from Vercel Cron (or an authorized internal caller)
    const authHeader = request.headers.get("authorization");
    const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;

    if (process.env.CRON_SECRET && authHeader !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();
    const result = await refreshAllRates();
    const durationMs = Date.now() - startTime;

    console.log(`[CRON/FX-RATES] Refreshed ${result.updated.length} pairs in ${durationMs}ms. Failed: ${result.failed.length}`);

    return successResponse({
      message: "FX rates refreshed",
      updated: result.updated,
      failed: result.failed,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error, "FX rates cron job failed");
  }
}
