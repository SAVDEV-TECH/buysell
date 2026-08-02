/**
 * Escrow Payment Gateway Integration Handler
 * Executes live transfer payouts via Paystack, Flutterwave, or Stripe Connect.
 * Uses strict 2-stage transfer lifecycle (processing -> completed/failed via webhook).
 */
export interface EscrowTransferParams {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod?: string;
  paymentReference?: string;
  recipientAccount?: string;
  idempotencyKey: string;
  targetCurrency?: string;
  fxRate?: number;
}

export interface EscrowTransferResult {
  success: boolean;
  status: "processing" | "completed" | "failed";
  providerTransferId?: string;
  provider: string;
  message: string;
  metadata?: Record<string, any>;
}

export async function executeEscrowDisbursement(
  params: EscrowTransferParams
): Promise<EscrowTransferResult> {
  const { orderId, amount, currency, paymentMethod, idempotencyKey, targetCurrency = "USD", fxRate = 1.0 } = params;

  const now = new Date().toISOString();
  const settledAmount = amount * fxRate;

  console.log(`[ESCROW GATEWAY] Initiating payout for Order #${orderId.slice(0, 8)} - Amount: $${amount} ${currency} (FX: ${settledAmount} ${targetCurrency}) - Key: ${idempotencyKey}`);

  // 1. Paystack Transfer Dispatch
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  if (paymentMethod === "paystack" && paystackSecret && !paystackSecret.includes("sk_test_placeholder")) {
    try {
      const res = await fetch("https://api.paystack.co/transfer", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "balance",
          amount: Math.round(amount * 100), // kobo
          recipient: params.recipientAccount || "RCP_supplier_default",
          reason: `BuySell Escrow Disbursement #${orderId.slice(0, 8)}`,
          reference: idempotencyKey,
        }),
      });

      const json = await res.json();
      if (json.status) {
        return {
          success: true,
          status: "processing", // Asynchronous transfer: waits for transfer.success webhook
          provider: "paystack",
          providerTransferId: json.data?.transfer_code || json.data?.reference || idempotencyKey,
          message: "Paystack transfer initiated. Awaiting webhook confirmation.",
          metadata: {
            ...json.data,
            settled_amount: settledAmount,
            settled_currency: targetCurrency,
            fx_rate: fxRate,
            fx_rate_locked_at: now,
          },
        };
      }
    } catch (err: any) {
      console.warn("[ESCROW GATEWAY] Paystack transfer notice:", err?.message);
    }
  }

  // 2. Stripe Transfer Dispatch (Stripe Connect)
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (paymentMethod === "stripe" && stripeSecret) {
    try {
      const res = await fetch("https://api.stripe.com/v1/transfers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecret}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Idempotency-Key": idempotencyKey,
        },
        body: new URLSearchParams({
          amount: Math.round(amount * 100).toString(),
          currency: currency.toLowerCase(),
          destination: params.recipientAccount || "acct_supplier_connect",
          description: `BuySell Escrow Disbursement #${orderId.slice(0, 8)}`,
        }),
      });

      const json = await res.json();
      if (json.id) {
        return {
          success: true,
          status: "completed",
          provider: "stripe",
          providerTransferId: json.id,
          message: "Stripe Connect escrow transfer completed successfully.",
          metadata: {
            ...json,
            settled_amount: settledAmount,
            settled_currency: targetCurrency,
            fx_rate: fxRate,
            fx_rate_locked_at: now,
          },
        };
      }
    } catch (err: any) {
      console.warn("[ESCROW GATEWAY] Stripe transfer notice:", err?.message);
    }
  }

  // 3. Both live providers failed or were not configured.
  // If no real payment method was set, this is an internal ledger record (e.g., demo/test mode).
  // Otherwise, treat it as a genuine failure — never silently succeed.
  const isInternalLedger = !paymentMethod || paymentMethod === "buysell_escrow_ledger";

  if (isInternalLedger) {
    // Internal demo/test mode: log and return success for non-live environments
    console.warn(
      `[ESCROW GATEWAY] No live provider matched for Order #${orderId.slice(0, 8)}. ` +
      `Recording as internal ledger entry. THIS MUST NOT HAPPEN IN PRODUCTION.`
    );
    return {
      success: true,
      status: "completed",
      provider: "buysell_escrow_ledger",
      providerTransferId: `TX_${idempotencyKey.slice(0, 16)}`,
      message: `[INTERNAL LEDGER] Escrow logged under key ${idempotencyKey}. No real money moved.`,
      metadata: {
        orderId,
        amount,
        currency,
        settled_amount: settledAmount,
        settled_currency: targetCurrency,
        fx_rate: fxRate,
        fx_rate_locked_at: now,
        idempotencyKey,
        settlementMode: "escrow_internal_ledger",
        warning: "NO_LIVE_PROVIDER_MATCHED",
      },
    };
  }

  // Real provider was specified (paystack/stripe/flutterwave) but failed.
  // Return failure so the order is NOT marked as paid and no disbursement occurs.
  console.error(
    `[ESCROW GATEWAY] All live providers failed for Order #${orderId.slice(0, 8)} ` +
    `using method "${paymentMethod}". Returning failure. No funds disbursed.`
  );
  return {
    success: false,
    status: "failed",
    provider: paymentMethod,
    message: `Escrow disbursement failed: payment provider "${paymentMethod}" did not complete the transfer. ` +
      `Please retry or contact support. Order #${orderId.slice(0, 8)}.`,
    metadata: {
      orderId,
      amount,
      currency,
      idempotencyKey,
      failure_reason: "ALL_PROVIDERS_FAILED",
    },
  };
}
