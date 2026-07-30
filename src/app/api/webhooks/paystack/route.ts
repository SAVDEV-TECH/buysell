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
    const now = new Date().toISOString();

    const supabaseAdmin = createAdminClient();

    // 2. Webhook Replay Protection: Deduplicate by reference or transfer code
    const reference = data?.reference || data?.transfer_code;
    if (!reference) {
      return NextResponse.json({ status: "ignored" });
    }

    // 3. Process Deposit Success: charge.success
    if (event === "charge.success") {
      const amount = Number(data.amount) / 100;
      const metadata = data.metadata || {};
      const orderId = metadata.order_id || metadata.custom_fields?.find((f: any) => f.variable_name === "order_id")?.value;

      if (orderId) {
        const { data: existingTx } = await supabaseAdmin
          .from("escrow_transactions")
          .select("id")
          .eq("type", "deposit")
          .filter("metadata->>reference", "eq", reference)
          .maybeSingle();

        if (existingTx) {
          return NextResponse.json({ status: "already_processed" }, { status: 200 });
        }

        await supabaseAdmin
          .from("orders")
          .update({
            payment_status: "paid",
            escrow_status: "funded",
            payment_reference: reference,
            updated_at: now,
          })
          .eq("id", orderId);

        await supabaseAdmin.from("escrow_transactions").insert({
          order_id: orderId,
          amount,
          currency: data.currency || "USD",
          type: "deposit",
          status: "completed",
          metadata: {
            provider: "paystack",
            reference,
            event,
            paystack_channel: data.channel,
          },
          created_at: now,
          processed_at: now,
        });
      }
    }

    // 4. Process Transfer Payout Async Confirmation: transfer.success
    if (event === "transfer.success") {
      console.log(`[PAYSTACK WEBHOOK] Transfer SUCCESS for reference '${reference}'`);
      await supabaseAdmin
        .from("escrow_transactions")
        .update({
          status: "completed",
          processed_at: now,
        })
        .filter("metadata->>provider_transfer_id", "eq", reference);
    }

    // 5. Process Transfer Failure: transfer.failed / transfer.reversed
    if (event === "transfer.failed" || event === "transfer.reversed") {
      console.warn(`[PAYSTACK WEBHOOK ALERT] Transfer FAILED/REVERSED for reference '${reference}'`);
      await supabaseAdmin
        .from("escrow_transactions")
        .update({
          status: "failed",
          metadata: {
            failure_reason: data?.reason || "Transfer failed at gateway level",
            failed_at: now,
          },
          processed_at: now,
        })
        .filter("metadata->>provider_transfer_id", "eq", reference);
    }

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error: any) {
    console.error("[PAYSTACK WEBHOOK ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
