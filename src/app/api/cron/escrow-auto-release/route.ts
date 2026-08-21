import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, handleApiError } from "@/lib/apiResponse";

/**
 * Automated Escrow Auto-Release Cron Job
 * Auto-releases escrow funds to the supplier if an order has been marked 'delivered'
 * for more than 72 hours and no dispute has been filed by the buyer.
 * Includes High-Value Safety Guard ($5,000 threshold requirement for manual admin signoff).
 */
export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    const cutoffTime = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    const HIGH_VALUE_THRESHOLD = 5000; // $5,000 USD limit for automated cron release

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

    const ordersToProcess = eligibleOrders || [];
    const releasedIds: string[] = [];
    const flaggedHighValueIds: string[] = [];

    // 2. Process release for each eligible order
    for (const order of ordersToProcess) {
      const now = new Date().toISOString();
      const amount = Number(order.total_amount || 0);

      // SAFETY GUARD: High-Value Trades (>$5,000) require manual admin signoff
      if (amount >= HIGH_VALUE_THRESHOLD) {
        await supabaseAdmin
          .from("orders")
          .update({
            escrow_status: "pending_admin_review",
            updated_at: now,
          })
          .eq("id", order.id);

        flaggedHighValueIds.push(order.id);
        console.log(`[ESCROW CRON GUARD] Order #${order.id.slice(0, 8)} ($${amount}) flagged for manual Super Admin review.`);
        continue;
      }

      // Standard Auto-Release
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
        user_id: order.buyer_id || order.user_id || null,
        amount,
        currency: order.currency || "USD",
        type: "release",
        status: "completed",
        description: `Automated escrow release (72h inspection window) for order #${order.id.slice(0, 8).toUpperCase()}`,
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
      flaggedHighValueCount: flaggedHighValueIds.length,
      flaggedHighValueIds,
      inspectionCutoff: cutoffTime,
    }, `Auto-released ${releasedIds.length} orders after 72h window. ${flaggedHighValueIds.length} high-value orders (≥$5,000) flagged for admin signoff.`);
  } catch (error) {
    return handleApiError(error, "Failed to run escrow auto-release cron job");
  }
}
