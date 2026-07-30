import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse";
import { requireSuperAdmin, AuthError } from "@/lib/serverAuth";

export async function GET(req: NextRequest) {
  try {
    // 1. Authorization Gate: Verify super admin session
    try {
      await requireSuperAdmin(req);
    } catch (authErr: any) {
      if (authErr instanceof AuthError) {
        return errorResponse(authErr.message, authErr.status);
      }
      return errorResponse("Forbidden: Super Admin access required", 403);
    }

    const supabaseAdmin = createAdminClient();

    const [
      usersRes,
      profilesRes,
      productsRes,
      ordersRes,
      pendingRes,
      verifiedRes,
      recentOrgsRes,
      recentOrdersRes,
    ] = await Promise.all([
      supabaseAdmin.from("users").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("products").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("orders").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("organizations").select("*", { count: "exact", head: true }).eq("verification_level", "pending"),
      supabaseAdmin.from("organizations").select("*", { count: "exact", head: true }).eq("verification_level", "verified"),
      supabaseAdmin.from("organizations").select("id, company_name, verification_level, created_at, updated_at").order("updated_at", { ascending: false }).limit(6),
      supabaseAdmin.from("orders").select(`
        *,
        buyer_organization:organizations!orders_buyer_organization_id_fkey(company_name),
        supplier_organization:organizations!orders_supplier_organization_id_fkey(company_name)
      `).order("created_at", { ascending: false }).limit(10),
    ]);

    const uCount = usersRes.count ?? profilesRes.count ?? 0;
    const pCount = productsRes.count ?? 0;
    const oCount = ordersRes.count ?? recentOrdersRes.data?.length ?? 0;
    const pendingCount = pendingRes.count ?? 0;
    const verifiedCount = verifiedRes.count ?? 0;

    let ordersList = recentOrdersRes.data || [];
    if (!recentOrdersRes.data) {
      const raw = await supabaseAdmin.from("orders").select("*").order("created_at", { ascending: false }).limit(10);
      ordersList = raw.data || [];
    }

    const totalRevenue = ordersList.reduce((acc: number, o: any) => {
      const val = Number(o.total_amount || o.amount || 0);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);

    const formattedOrders = ordersList.map((o: any) => ({
      id: o.id,
      buyer_name: o.buyer_organization?.company_name || o.shipping_address?.full_name || "B2B Buyer",
      supplier_name: o.supplier_organization?.company_name || "Verified Supplier",
      total_amount: Number(o.total_amount || 0),
      status: o.status || "processing",
      payment_method: o.payment_method || "mobile_money",
      created_at: o.created_at,
    }));

    const activity = (recentOrgsRes.data || []).map((org: any) => ({
      id: org.id,
      org_name: org.company_name || "Business Account",
      action:
        org.verification_level === "verified"
          ? "Approved & verified"
          : org.verification_level === "rejected"
          ? "Application rejected"
          : "New application submitted",
      created_at: org.updated_at || org.created_at,
      type:
        org.verification_level === "verified"
          ? "approved"
          : org.verification_level === "rejected"
          ? "rejected"
          : "new",
    }));

    return successResponse({
      totalUsers: uCount,
      totalProducts: pCount,
      totalOrders: Math.max(oCount, ordersList.length),
      pendingVerifications: pendingCount,
      verifiedOrgs: verifiedCount,
      totalRevenue,
      recentActivity: activity,
      recentOrders: formattedOrders,
    }, "Super admin telemetry retrieved successfully.");
  } catch (error) {
    return handleApiError(error, "Failed to retrieve super admin telemetry");
  }
}
