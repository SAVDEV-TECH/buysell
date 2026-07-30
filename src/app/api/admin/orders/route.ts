import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse";
import { requireSuperAdmin, AuthError } from "@/lib/serverAuth";

export async function GET(req: NextRequest) {
  try {
    // 1. Authorization Gate: Verify super admin session before creating admin client
    try {
      await requireSuperAdmin(req);
    } catch (authErr: any) {
      if (authErr instanceof AuthError) {
        return errorResponse(authErr.message, authErr.status);
      }
      return errorResponse("Forbidden: Super Admin access required", 403);
    }

    // 2. Parse pagination query params
    const { searchParams } = new URL(req.url);
    const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const offset = page * limit;

    const supabaseAdmin = createAdminClient();

    // 3. Query platform trade orders on the server bypassing RLS
    const { data: dbOrders, error: orderErr, count } = await supabaseAdmin
      .from("orders")
      .select(`
        *,
        buyer_organization:organizations!orders_buyer_organization_id_fkey(company_name, is_verified),
        supplier_organization:organizations!orders_supplier_organization_id_fkey(company_name, is_verified)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    let ordersList = dbOrders || [];
    let totalCount = count || 0;

    // Fallback if joined query failed due to FK constraint name
    if (orderErr || !dbOrders) {
      console.warn("[Admin API] Joined orders query notice, running raw select:", orderErr?.message);
      const { data: rawOrders, count: rawCount } = await supabaseAdmin
        .from("orders")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      ordersList = rawOrders || [];
      totalCount = rawCount || ordersList.length;
    }

    return NextResponse.json({
      success: true,
      data: ordersList,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      message: `Retrieved ${ordersList.length} platform orders successfully.`,
    });
  } catch (error) {
    return handleApiError(error, "Failed to retrieve super admin orders");
  }
}
