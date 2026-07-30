import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const paystackSignature = req.headers.get("x-paystack-signature");
    const secret = process.env.PAYSTACK_SECRET_KEY || "";

    // 1. Verify Paystack Signature
    if (secret && paystackSignature) {
      const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
      if (hash !== paystackSignature) {
        return NextResponse.json({ error: "Invalid Paystack signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const data = payload.data;

    // 2. Webhook Replay Protection: Check if event/reference was already processed
    const reference = data?.reference;
    if (!reference) {
      return NextResponse.json({ status: "ignored" });
    }

    const supabaseAdmin = createAdminClient();

    const { data: existingTx } = await supabaseAdmin
      .from("escrow_transactions")
      .select("id")
      .eq("type", "deposit")
      .filter("metadata->>reference", "eq", reference)
      .maybeSingle();

    if (existingTx) {
      console.log(`[PAYSTACK WEBHOOK] Event reference '${reference}' already processed. Idempotent skip.`);
      return NextResponse.json({ status: "already_processed" }, { status: 200 });
    }

    // 3. Process charge.success / transfer.success
    if (event === "charge.success") {
      const amount = Number(data.amount) / 100;
      const metadata = data.metadata || {};
      const orderId = metadata.order_id || metadata.custom_fields?.find((f: any) => f.variable_name === "order_id")?.value;

      if (orderId) {
        // Mark order as funded
        await supabaseAdmin
          .from("orders")
          .update({
            payment_status: "paid",
            escrow_status: "funded",
            payment_reference: reference,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        // Record deposit transaction
        await supabaseAdmin.from("escrow_transactions").insert({
          order_id: orderId,
          amount,
          currency: data.currency || "USD",
          type: "deposit",
          status: "completed",
          metadata: {
            provider: "paystack",
            reference,
            event: event,
            paystack_channel: data.channel,
          },
          created_at: new Date().toISOString(),
          processed_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error: any) {
    console.error("[PAYSTACK WEBHOOK ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
