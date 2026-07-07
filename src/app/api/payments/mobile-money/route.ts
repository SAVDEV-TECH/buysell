import { NextRequest, NextResponse } from "next/server";
import { admin, adminDb } from "@/lib/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, phoneNumber, amount, currency, productId, userId } = body;

    if (!phoneNumber || !amount || !currency || !productId || !userId) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate USSD code for mobile money
    const ussdCode = generateUSSDCode(amount, phoneNumber);
    const reference = `mm-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create transaction record using Admin SDK (bypasses Firestore security rules)
    await adminDb.collection("transactions").add({
      type: "mobile_money",
      provider,
      phoneNumber,
      amount,
      currency,
      productId,
      userId,
      reference,
      status: "initiated",
      ussdCode,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      reference,
      ussdCode,
      message: `Dial ${ussdCode} to complete payment`,
    });
  } catch (error: any) {
    console.error("Mobile money API error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to initialize mobile money payment" },
      { status: 500 }
    );
  }
}

function generateUSSDCode(amount: number, phone: string): string {
  // Format USSD code for African mobile money
  // Common format: *165*3*amount*phone#
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  return `*165*3*${Math.round(amount)}*${cleanPhone}#`;
}
