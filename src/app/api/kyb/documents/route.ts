/**
 * POST /api/kyb/documents
 *
 * Records uploaded KYB documents (CAC certificates, factory photos, tax clearances)
 * in the kyb_documents Supabase table.
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
    const { organizationId, documentType, fileUrl } = body;

    if (!organizationId || !documentType || !fileUrl) {
      return NextResponse.json(
        { error: "Missing required fields: organizationId, documentType, fileUrl" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("kyb_documents")
      .insert({
        organization_id: organizationId,
        document_type: documentType,
        file_url: fileUrl,
        verified: false,
      })
      .select()
      .single();

    if (error) throw error;

    return successResponse({
      message: "Document recorded for verification review.",
      document: data,
    });
  } catch (error) {
    return handleApiError(error, "Failed to record KYB document");
  }
}
