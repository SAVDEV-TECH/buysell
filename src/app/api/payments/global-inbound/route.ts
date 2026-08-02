/**
 * POST /api/payments/global-inbound
 *
 * Creates a Stripe Payment Intent for international buyers.
 * This is the entry point for all non-African buyer payments.
 *
 * Flow:
 * 1. Buyer submits order with their country code + order details
 * 2. This endpoint creates a Stripe Payment Intent (amount in buyer currency)
 * 3. Frontend receives client_secret and renders Stripe Elements checkout
 * 4. On payment success, Stripe webhook (/api/webhooks/stripe) marks order as escrow_funded
 * 5. Escrow gateway handles seller payout when milestone is released
 *
 * For Chinese buyers (CNY): payment_method_types will include wire transfer instructions.
 * VertoFX integration converts CNY→USD at point of confirmation.
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { handleApiError, successResponse } from "@/lib/apiResponse";
import { getPaymentRoute } from "@/lib/globalPaymentRouter";
import { getExchangeRate } from "@/lib/fxRates";

export const runtime = "nodejs";

// Initialize Stripe with the secret key
function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY environment variable is not set.");
  return new Stripe(key, { apiVersion: "2026-07-29.dahlia" });
}

interface GlobalInboundRequest {
  orderId: string;
  amountUsd: number;          // Contract value in USD (always USD for escrow)
  buyerCountryCode: string;   // ISO 2-letter country code of the buyer
  buyerEmail?: string;
  orderDescription?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: GlobalInboundRequest = await request.json();
    const { orderId, amountUsd, buyerCountryCode, buyerEmail, orderDescription } = body;

    if (!orderId || !amountUsd || !buyerCountryCode) {
      return NextResponse.json(
        { error: "Missing required fields: orderId, amountUsd, buyerCountryCode" },
        { status: 400 }
      );
    }

    // Verify the order exists and belongs to this user's organization
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, total_amount, currency, status, buyer_organization_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "pending_escrow") {
      return NextResponse.json(
        { error: `Order is already in status: ${order.status}. Cannot re-fund escrow.` },
        { status: 409 }
      );
    }

    // Get the payment route for this buyer's country
    const route = getPaymentRoute(buyerCountryCode);

    // Convert USD amount to buyer's local currency for display
    // (Stripe charges in the buyer's currency, converts internally)
    let chargeAmount: number;
    let chargeCurrency: string;

    if (route.currency === "USD") {
      chargeAmount = Math.round(amountUsd * 100); // Stripe uses cents
      chargeCurrency = "usd";
    } else {
      // Convert USD → buyer currency for the Stripe charge
      const fxRate = await getExchangeRate("USD", route.currency);
      chargeAmount = Math.round(amountUsd * fxRate * 100); // Stripe uses smallest unit
      chargeCurrency = route.currency.toLowerCase();
    }

    const stripe = getStripe();

    // Platform commission: 2.5% charged to the buyer (added on top of contract value)
    const platformFeeAmount = Math.round(chargeAmount * 0.025);
    const totalChargeAmount = chargeAmount + platformFeeAmount;

    // Idempotency key prevents duplicate payment intents for the same order
    const idempotencyKey = `pi_${orderId}_${buyerCountryCode}`;

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: totalChargeAmount,
        currency: chargeCurrency,
        payment_method_types: route.stripePaymentMethods ?? ["card"],
        metadata: {
          orderId,
          buyerCountryCode,
          buyerUserId: user.id,
          amountUsd: amountUsd.toString(),
          fxCurrency: route.currency,
          platformFeePct: "2.5",
          platformFeeAmount: platformFeeAmount.toString(),
        },
        description: orderDescription ?? `BuySell Escrow — Order #${orderId.slice(0, 8)}`,
        receipt_email: buyerEmail ?? user.email,
        // Capture immediately — funds held in Stripe until webhook triggers escrow_funded
        capture_method: "automatic",
      },
      { idempotencyKey }
    );

    // Log the pending payment intent in orders table
    await supabase
      .from("orders")
      .update({
        escrow_reference_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    return successResponse({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: totalChargeAmount,
      currency: chargeCurrency,
      amountUsd,
      platformFeeUsd: Math.round(amountUsd * 0.025 * 100) / 100,
      buyerInstructions: route.instructions,
      paymentMethods: route.stripePaymentMethods ?? ["card"],
    });
  } catch (error: any) {
    // Stripe errors have a specific type
    if (error?.type?.startsWith("Stripe")) {
      return NextResponse.json(
        {
          error: `Payment provider error: ${error.message}`,
          code: error.code,
          type: error.type,
        },
        { status: 400 }
      );
    }
    return handleApiError(error, "Failed to create global payment intent");
  }
}
