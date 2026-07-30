import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, handleApiError } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();

    // 1. Query all platform trade orders on the server bypassing RLS
    const { data: dbOrders, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select(`
        *,
        buyer_organization:organizations!orders_buyer_organization_id_fkey(company_name, is_verified),
        supplier_organization:organizations!orders_supplier_organization_id_fkey(company_name, is_verified)
      `)
      .order("created_at", { ascending: false })
      .limit(300);

    let ordersList = dbOrders || [];

    // Fallback if joined query failed due to FK constraint name
    if (orderErr || !dbOrders) {
      console.warn("[Admin API] Joined orders query notice, running raw select:", orderErr?.message);
      const { data: rawOrders } = await supabaseAdmin
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      ordersList = rawOrders || [];
    }

    return successResponse(ordersList, `Retrieved ${ordersList.length} platform orders successfully.`);
  } catch (error) {
    return handleApiError(error, "Failed to retrieve super admin orders");
  }
}
