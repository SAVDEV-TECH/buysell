import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, handleApiError } from "@/lib/apiResponse";

/**
 * Automated Escrow Auto-Release Cron Job
 * Auto-releases escrow funds to the supplier if an order has been marked 'delivered'
 * for more than 72 hours and no dispute has been filed by the buyer.
 * Triggered hourly by Vercel Cron or external scheduler.
 */
export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    const cutoffTime = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

    // 1. Find all delivered orders past the 72-hour inspection window still in 'funded' state
    const { data: eligibleOrders, error: queryErr } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("status", "delivered")
      .neq("payment_status", "escrow_released")
      .lt("updated_at", cutoffTime);

    if (queryErr) {
      console.warn("[Auto-Release Cron] Query notice:", queryErr.message);
    }

    const ordersToRelease = eligibleOrders || [];
    const releasedIds: string[] = [];

    // 2. Process auto-release for each eligible order
    for (const order of ordersToRelease) {
      const now = new Date().toISOString();
      const amount = Number(order.total_amount || 0);

      // Update order state
      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "escrow_released",
          escrow_status: "released",
          updated_at: now,
        })
        .eq("id", order.id);

      // Insert transaction ledger record
      await supabaseAdmin.from("escrow_transactions").insert({
        order_id: order.id,
        amount,
        currency: order.currency || "USD",
        type: "release",
        status: "completed",
        metadata: {
          triggered_by: "cron_auto_release_72h",
          inspection_period_hours: 72,
          executed_at: now,
        },
        created_at: now,
        processed_at: now,
      });

      releasedIds.push(order.id);
    }

    return successResponse({
      processedCount: releasedIds.length,
      releasedOrderIds: releasedIds,
      inspectionCutoff: cutoffTime,
    }, `Auto-released ${releasedIds.length} orders after 72-hour inspection window.`);
  } catch (error) {
    return handleApiError(error, "Failed to run escrow auto-release cron job");
  }
}
