/**
 * POST /api/kyb/verify
 *
 * Verifies a supplier organization's corporate registration number via Smile ID
 * and updates organizations.verification_level and organizations.kyb_data in Supabase.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { smileId } from "@/lib/smileId";
import { handleApiError, successResponse } from "@/lib/apiResponse";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, countryCode, businessType, registrationNumber, companyName } = body;

    if (!organizationId || !countryCode || !registrationNumber) {
      return NextResponse.json(
        { error: "Missing required fields: organizationId, countryCode, registrationNumber" },
        { status: 400 }
      );
    }

    // Call Smile ID verification
    const result = await smileId.verifyBusiness({
      country: countryCode,
      business_type: businessType || (countryCode === "NG" ? "cac" : "rccm"),
      registration_number: registrationNumber,
      company_name: companyName,
    });

    // Update organization record in Supabase
    const verificationStatus = result.is_verified ? "verified" : "pending";
    const kybData = {
      cac_verified: result.is_verified,
      registration_number: registrationNumber,
      verification_date: new Date().toISOString(),
      smile_id_job_id: result.job_id,
      company_name: result.company_name,
      address: result.address,
    };

    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        verification_level: verificationStatus,
        kyb_data: kybData,
        legal_registration_number: registrationNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", organizationId);

    if (updateError) {
      throw updateError;
    }

    return successResponse({
      verified: result.is_verified,
      status: verificationStatus,
      message: result.message,
      jobId: result.job_id,
    });
  } catch (error) {
    return handleApiError(error, "KYB verification failed");
  }
}
