import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse";
import { requireSuperAdmin, AuthError } from "@/lib/serverAuth";

export async function GET(req: NextRequest) {
  try {
    // 1. Enforce Server-Side Super Admin Authorization
    try {
      await requireSuperAdmin(req);
    } catch (authErr: any) {
      if (authErr instanceof AuthError) {
        return errorResponse(authErr.message, authErr.status);
      }
      return errorResponse("Forbidden: Super Admin access required", 403);
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const offset = page * limit;

    const supabaseAdmin = createAdminClient();

    // 2. Fetch financial transactions from escrow_transactions
    const { data: transactions, count, error } = await supabaseAdmin
      .from("escrow_transactions")
      .select(`
        *,
        order:orders(id, total_amount, currency, status, buyer_organization_id, supplier_organization_id)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    let txList = transactions || [];

    // Fallback query if join fails
    if (error || !transactions) {
      console.warn("[Escrow Ledger API] Joined query notice, running raw select:", error?.message);
      const { data: rawTx, count: rawCount } = await supabaseAdmin
        .from("escrow_transactions")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      txList = rawTx || [];
    }

    const totalCount = count || txList.length;

    return NextResponse.json({
      success: true,
      data: txList,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      message: `Retrieved ${txList.length} escrow transactions from financial ledger.`,
    });
  } catch (error) {
    return handleApiError(error, "Failed to retrieve escrow financial ledger");
  }
}
