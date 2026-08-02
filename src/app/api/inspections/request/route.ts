/**
 * POST /api/inspections/request
 *
 * Endpoint to request a pre-shipment quality inspection (SGS / Bureau Veritas) for an order.
 * Buyers can add an inspection during checkout or order funding to ensure product specs.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleApiError, successResponse } from "@/lib/apiResponse";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, inspectionAgency = "SGS", warehouseAddress } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Missing required field: orderId" }, { status: 400 });
    }

    // Insert inspection request into Supabase
    const { data, error } = await supabase
      .from("inspections")
      .insert({
        order_id: orderId,
        requested_by: user.id,
        inspection_agency: inspectionAgency,
        warehouse_address: warehouseAddress,
        status: "requested",
        fee_usd: 350.0,
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`[INSPECTIONS] Pre-shipment inspection requested for Order #${orderId} with ${inspectionAgency}`);

    return successResponse({
      message: `Pre-shipment inspection request submitted for ${inspectionAgency}. An auditor will be assigned within 24 hours.`,
      inspection: data,
    });
  } catch (error) {
    return handleApiError(error, "Failed to submit inspection request");
  }
}
