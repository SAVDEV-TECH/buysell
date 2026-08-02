import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyCorsHeaders, handleCorsPrelight } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPrelight(request);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { provider, phoneNumber, amount, currency, productId } = body;

    if (!phoneNumber || !amount || !currency || !productId) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const ussdCode = `*165*3*${Math.round(amount)}*${phoneNumber.replace(/\D/g, "").slice(-10)}#`;
    const reference = `mm-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    return applyCorsHeaders(request, NextResponse.json({
      success: true,
      reference,
      ussdCode,
      message: `Dial ${ussdCode} to complete payment`,
    }));
  } catch (error: unknown) {
    console.error("Mobile money API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to initialize mobile money payment",
      },
      { status: 500 }
    );
  }
}
