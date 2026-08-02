import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Flutterwave Webhook Handler
 *
 * Security: Flutterwave authenticates webhooks via a shared secret hash.
 * Flutterwave sends the secret in the `verif-hash` HTTP header.
 * We compare it against FLW_SECRET_HASH using a timing-safe comparison.
 *
 * Setup:
 *  1. Set FLW_SECRET_HASH in your environment (Vercel / .env.local).
 *  2. In the Flutterwave dashboard → Settings → Webhooks, set the same value
 *     as your "Secret Hash".
 *
 * Reference: https://developer.flutterwave.com/docs/integration-guides/webhooks/
 */
export async function POST(request: NextRequest) {
  try {
    // ── 1. Signature Verification ──────────────────────────────────────────
    const secretHash = process.env.FLW_SECRET_HASH;
    const receivedHash = request.headers.get("verif-hash");

    if (!secretHash) {
      // Env var not configured — block the request; don't process blindly
      console.error(
        "[FLW WEBHOOK] FLW_SECRET_HASH env var is not set. " +
          "Requests are rejected until this is configured."
      );
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 503 }
      );
    }

    if (!receivedHash) {
      console.warn("[FLW WEBHOOK] Missing verif-hash header — rejected");
      return NextResponse.json(
        { error: "Missing signature header" },
        { status: 401 }
      );
    }

    // Timing-safe comparison to prevent timing oracle attacks
    const expectedBuf = Buffer.from(secretHash, "utf8");
    const receivedBuf = Buffer.from(receivedHash, "utf8");
    const signaturesMatch =
      expectedBuf.length === receivedBuf.length &&
      // timingSafeEqual requires same-length buffers
      require("crypto").timingSafeEqual(expectedBuf, receivedBuf);

    if (!signaturesMatch) {
      console.warn(
        "[FLW WEBHOOK] Invalid verif-hash — possible spoofed request"
      );
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // ── 2. Parse Body ──────────────────────────────────────────────────────
    const body = await request.json() as {
      event: string;
      data: {
        tx_ref?: string;
        id?: string | number;
        status?: string;
        amount?: number;
        currency?: string;
        flw_ref?: string;
      };
    };
    const { event, data: eventData } = body;

    // ── 3. Idempotency Guard ───────────────────────────────────────────────
    const txRef = eventData?.tx_ref;
    if (!txRef) {
      return NextResponse.json({ status: "ignored — no tx_ref" }, { status: 200 });
    }

    const supabaseAdmin = createAdminClient();

    // ── 4. Process charge.completed ────────────────────────────────────────
    if (event === "charge.completed") {
      const { status, amount, currency, flw_ref } = eventData;

      if (status !== "successful") {
        // Payment was attempted but not successful — ignore
        return NextResponse.json({ status: "ignored — not successful" }, { status: 200 });
      }

      // Deduplicate: check if this tx_ref was already processed
      const { data: existingTx } = await supabaseAdmin
        .from("escrow_transactions")
        .select("id")
        .eq("type", "deposit")
        .filter("metadata->>flw_tx_ref", "eq", txRef)
        .maybeSingle();

      if (existingTx) {
        console.log(`[FLW WEBHOOK] tx_ref '${txRef}' already processed — idempotent skip`);
        return NextResponse.json({ status: "already_processed" }, { status: 200 });
      }

      const now = new Date().toISOString();

      // Update the order by tx_ref (which maps to order id or payment_reference)
      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "paid",
          escrow_status: "funded",
          payment_reference: txRef,
          updated_at: now,
        })
        .eq("id", txRef);

      // Record the escrow deposit transaction
      await supabaseAdmin.from("escrow_transactions").insert({
        order_id: txRef,
        amount: amount ?? 0,
        currency: currency ?? "USD",
        type: "deposit",
        status: "completed",
        metadata: {
          provider: "flutterwave",
          flw_tx_ref: txRef,
          flw_ref: flw_ref,
          event,
        },
        created_at: now,
        processed_at: now,
      });

      console.log(`[FLW WEBHOOK] charge.completed processed for tx_ref='${txRef}'`);
    }

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[FLW WEBHOOK ERROR]", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
