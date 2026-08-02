import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

/**
 * Stripe Webhook Handler
 *
 * Security: Stripe signs every webhook with an HMAC-SHA256 signature.
 * The signature is sent in the `Stripe-Signature` header as a comma-separated
 * list of key=value pairs, e.g.:
 *   t=1614556800,v1=abc123...,v0=...
 *
 * Verification steps:
 *  1. Extract `t` (timestamp) and `v1` (HMAC-SHA256 signature) from header.
 *  2. Build the signed payload: `<timestamp>.<raw_body>`.
 *  3. Compute HMAC-SHA256 of signed payload using STRIPE_WEBHOOK_SECRET.
 *  4. Compare with v1 using timing-safe equality.
 *  5. Reject if the timestamp is older than 5 minutes (replay protection).
 *
 * Setup:
 *  1. Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
 *     to get a local signing secret for development.
 *  2. In the Stripe Dashboard → Webhooks → your endpoint → "Signing secret",
 *     copy the value into STRIPE_WEBHOOK_SECRET in .env.local / Vercel.
 *
 * Reference: https://docs.stripe.com/webhooks#verify-manually
 */

const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300; // 5 minutes

function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): { valid: boolean; reason?: string } {
  // Parse the Stripe-Signature header
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => part.split("=") as [string, string])
  );

  const timestamp = parts["t"];
  const v1Signature = parts["v1"];

  if (!timestamp || !v1Signature) {
    return { valid: false, reason: "Malformed Stripe-Signature header" };
  }

  // Replay protection: reject webhooks older than tolerance window
  const nowSeconds = Math.floor(Date.now() / 1000);
  const webhookAge = nowSeconds - parseInt(timestamp, 10);
  if (webhookAge > STRIPE_SIGNATURE_TOLERANCE_SECONDS) {
    return {
      valid: false,
      reason: `Webhook timestamp is too old (${webhookAge}s ago, tolerance=${STRIPE_SIGNATURE_TOLERANCE_SECONDS}s)`,
    };
  }

  // Compute expected signature
  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");

  // Timing-safe comparison
  const expectedBuf = Buffer.from(expectedSignature, "hex");
  const receivedBuf = Buffer.from(v1Signature, "hex");

  if (expectedBuf.length !== receivedBuf.length) {
    return { valid: false, reason: "Signature length mismatch" };
  }

  const signaturesMatch = crypto.timingSafeEqual(expectedBuf, receivedBuf);
  return signaturesMatch
    ? { valid: true }
    : { valid: false, reason: "Signature mismatch" };
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. Read Raw Body ───────────────────────────────────────────────────
    const rawBody = await req.text();

    // ── 2. Signature Verification ──────────────────────────────────────────
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error(
        "[STRIPE WEBHOOK] STRIPE_WEBHOOK_SECRET env var is not set. " +
          "Requests are rejected until this is configured."
      );
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 503 }
      );
    }

    const stripeSignature = req.headers.get("stripe-signature");
    if (!stripeSignature) {
      console.warn("[STRIPE WEBHOOK] Missing stripe-signature header — rejected");
      return NextResponse.json(
        { error: "Missing signature header" },
        { status: 401 }
      );
    }

    const verification = verifyStripeSignature(rawBody, stripeSignature, webhookSecret);
    if (!verification.valid) {
      console.warn(`[STRIPE WEBHOOK] Signature verification failed: ${verification.reason}`);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // ── 3. Parse Verified Payload ──────────────────────────────────────────
    const payload = JSON.parse(rawBody) as {
      id?: string;
      type: string;
      data?: {
        object?: {
          id?: string;
          amount?: number;
          currency?: string;
          metadata?: Record<string, string>;
        };
      };
    };

    const eventType = payload.type;
    const eventData = payload.data?.object;

    if (!eventData?.id) {
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    const eventId = payload.id || eventData.id;
    const supabaseAdmin = createAdminClient();

    // ── 4. Idempotency Guard ───────────────────────────────────────────────
    const { data: existingTx } = await supabaseAdmin
      .from("escrow_transactions")
      .select("id")
      .filter("metadata->>event_id", "eq", eventId)
      .maybeSingle();

    if (existingTx) {
      console.log(`[STRIPE WEBHOOK] Event '${eventId}' already processed — idempotent skip`);
      return NextResponse.json({ status: "already_processed" }, { status: 200 });
    }

    // ── 5. Process payment_intent.succeeded ───────────────────────────────
    if (eventType === "payment_intent.succeeded") {
      const amount = Number(eventData.amount ?? 0) / 100;
      const metadata = eventData.metadata ?? {};
      const orderId = metadata.order_id;

      if (orderId) {
        const now = new Date().toISOString();

        await supabaseAdmin
          .from("orders")
          .update({
            payment_status: "paid",
            escrow_status: "funded",
            payment_reference: eventData.id,
            updated_at: now,
          })
          .eq("id", orderId);

        await supabaseAdmin.from("escrow_transactions").insert({
          order_id: orderId,
          amount,
          currency: (eventData.currency ?? "usd").toUpperCase(),
          type: "deposit",
          status: "completed",
          metadata: {
            provider: "stripe",
            event_id: eventId,
            payment_intent: eventData.id,
          },
          created_at: now,
          processed_at: now,
        });

        console.log(`[STRIPE WEBHOOK] payment_intent.succeeded processed for order '${orderId}'`);
      }
    }

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[STRIPE WEBHOOK ERROR]", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
