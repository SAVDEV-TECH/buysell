import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { event, data: eventData } = body;

    if (event === "charge.completed") {
      const { tx_ref, status, amount } = eventData;
      if (status === "successful") {
        await supabase
          .from("orders")
          .update({ payment_status: "paid" })
          .eq("id", tx_ref);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Flutterwave webhook error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
