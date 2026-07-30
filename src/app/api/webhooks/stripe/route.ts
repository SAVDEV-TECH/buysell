import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);
    const eventType = payload.type;
    const eventData = payload.data?.object;

    if (!eventData?.id) {
      return NextResponse.json({ status: "ignored" });
    }

    const eventId = payload.id || eventData.id;
    const supabaseAdmin = createAdminClient();

    // 1. Webhook Replay Protection: Check if eventId was already recorded
    const { data: existingTx } = await supabaseAdmin
      .from("escrow_transactions")
      .select("id")
      .filter("metadata->>event_id", "eq", eventId)
      .maybeSingle();

    if (existingTx) {
      console.log(`[STRIPE WEBHOOK] Event '${eventId}' already processed. Idempotent skip.`);
      return NextResponse.json({ status: "already_processed" }, { status: 200 });
    }

    // 2. Process payment_intent.succeeded
    if (eventType === "payment_intent.succeeded") {
      const amount = Number(eventData.amount || 0) / 100;
      const metadata = eventData.metadata || {};
      const orderId = metadata.order_id;

      if (orderId) {
        await supabaseAdmin
          .from("orders")
          .update({
            payment_status: "paid",
            escrow_status: "funded",
            payment_reference: eventData.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        await supabaseAdmin.from("escrow_transactions").insert({
          order_id: orderId,
          amount,
          currency: (eventData.currency || "usd").toUpperCase(),
          type: "deposit",
          status: "completed",
          metadata: {
            provider: "stripe",
            event_id: eventId,
            payment_intent: eventData.id,
          },
          created_at: new Date().toISOString(),
          processed_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error: any) {
    console.error("[STRIPE WEBHOOK ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
