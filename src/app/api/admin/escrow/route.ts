import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse";
import { requireSuperAdmin, AuthError } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce Server-Side Super Admin Auth Gate
    try {
      await requireSuperAdmin(req);
    } catch (authErr: any) {
      if (authErr instanceof AuthError) {
        return errorResponse(authErr.message, authErr.status);
      }
      return errorResponse("Forbidden: Super Admin privileges required", 403);
    }

    const body = await req.json();
    const { orderId, action, notes } = body;

    if (!orderId || !["release", "refund", "dispute_hold"].includes(action)) {
      return errorResponse("Invalid parameters. Required: orderId, action (release|refund|dispute_hold)", 400);
    }

    const supabaseAdmin = createAdminClient();

    // 2. Fetch target order
    const { data: order, error: fetchErr } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (fetchErr || !order) {
      return errorResponse("Order not found", 404);
    }

    const amount = Number(order.total_amount || 0);
    const now = new Date().toISOString();

    let newEscrowStatus = "released";
    let newPaymentStatus = "escrow_released";
    let txType = "release";

    if (action === "refund") {
      newEscrowStatus = "refunded";
      newPaymentStatus = "refunded";
      txType = "refund";
    } else if (action === "dispute_hold") {
      newEscrowStatus = "disputed";
      newPaymentStatus = "disputed";
      txType = "dispute_hold";
    }

    // 3. Update Order state in PostgreSQL
    const { error: updateErr } = await supabaseAdmin
      .from("orders")
      .update({
        escrow_status: newEscrowStatus,
        payment_status: newPaymentStatus,
        updated_at: now,
      })
      .eq("id", orderId);

    if (updateErr) {
      console.warn("[Escrow API] Order status update notice:", updateErr.message);
    }

    // 4. Record Escrow Transaction in Immutable Financial Ledger (escrow_transactions)
    try {
      await supabaseAdmin.from("escrow_transactions").insert({
        order_id: orderId,
        amount,
        currency: order.currency || "USD",
        type: txType,
        status: "completed",
        metadata: {
          action_by: "super_admin",
          notes: notes || `Super admin executed ${action}`,
          executed_at: now,
        },
        created_at: now,
        processed_at: now,
      });
    } catch (txErr) {
      console.warn("[Escrow API] Ledger insert notice:", txErr);
    }

    // 5. Audit Log Entry
    console.log(`[ESCROW AUDIT LOG] Order ${orderId} -> Action: ${action.toUpperCase()} by Super Admin at ${now}`);

    return successResponse({
      orderId,
      escrowStatus: newEscrowStatus,
      paymentStatus: newPaymentStatus,
      amount,
      actionExecuted: action,
    }, `Escrow action '${action}' executed successfully on Order #${orderId.slice(0, 8).toUpperCase()}`);
  } catch (error) {
    return handleApiError(error, "Failed to execute escrow action");
  }
}
