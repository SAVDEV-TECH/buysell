import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse";
import { requireSuperAdmin, AuthError } from "@/lib/serverAuth";
import { executeEscrowDisbursement } from "@/lib/escrowGateway";
import { applyCorsHeaders, handleCorsPrelight } from "@/lib/cors";

/** Block cross-origin preflight for this sensitive endpoint */
export async function OPTIONS(request: NextRequest) {
  return handleCorsPrelight(request);
}

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

    // 3. IDEMPOTENCY CHECK: Prevent double-release or double-refund
    const idempotencyKey = `escrow-${action}-${orderId}`;
    if (order.escrow_status === newEscrowStatus) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        data: { orderId, escrowStatus: newEscrowStatus },
        message: `Order #${orderId.slice(0, 8).toUpperCase()} is already in state '${newEscrowStatus}'. Idempotent skip executed.`,
      });
    }

    const amount = Number(order.total_amount || 0);
    const now = new Date().toISOString();

    // 4. Execute Payment Gateway Transfer (Paystack / Stripe Connect / Mobile Money)
    const transferResult = await executeEscrowDisbursement({
      orderId,
      amount,
      currency: order.currency || "USD",
      paymentMethod: order.payment_method,
      paymentReference: order.payment_reference,
      idempotencyKey,
    });

    const txStatus = transferResult.success ? "completed" : "failed";

    // 5. Update Order state in PostgreSQL
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

    // 6. Record Escrow Transaction in Immutable Financial Ledger with Idempotency Key
    try {
      await supabaseAdmin.from("escrow_transactions").insert({
        order_id: orderId,
        user_id: order.buyer_id || order.user_id || null,
        amount,
        currency: order.currency || "USD",
        type: txType,
        status: txStatus,
        description: `Escrow ${action} executed by Super Admin for order #${orderId.slice(0, 8).toUpperCase()}`,
        metadata: {
          action_by: "super_admin",
          idempotency_key: idempotencyKey,
          provider: transferResult.provider,
          provider_transfer_id: transferResult.providerTransferId,
          notes: notes || `Super admin executed ${action}`,
          executed_at: now,
        },
        created_at: now,
        processed_at: now,
      });
    } catch (txErr) {
      console.warn("[Escrow API] Ledger insert notice:", txErr);
    }

    // 7. Audit Log Entry
    console.log(`[ESCROW AUDIT LOG] Order ${orderId} -> Action: ${action.toUpperCase()} by Super Admin at ${now} (Key: ${idempotencyKey})`);

    return applyCorsHeaders(req, successResponse({
      orderId,
      escrowStatus: newEscrowStatus,
      paymentStatus: newPaymentStatus,
      amount,
      actionExecuted: action,
      providerTransferId: transferResult.providerTransferId,
    }, `Escrow action '${action}' executed successfully on Order #${orderId.slice(0, 8).toUpperCase()}`));
  } catch (error) {
    return handleApiError(error, "Failed to execute escrow action");
  }
}
