import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { event, data: eventData } = body;

    if (event === "charge.success") {
      const { reference, status } = eventData;
      if (status === "success") {
        await supabase
          .from("orders")
          .update({ payment_status: "paid", status: "processing" })
          .eq("id", reference);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Paystack webhook error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
