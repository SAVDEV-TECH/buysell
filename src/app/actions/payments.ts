"use server";

import { createClient } from "@/lib/supabase/server";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
const FLUTTERWAVE_SECRET = process.env.FLUTTERWAVE_SECRET_KEY || "";

interface PaymentPayload {
  provider: "paystack" | "flutterwave" | "mobile-money";
  userId: string;
  productId: string | number;
  amount: number;
  currency: string;
  userEmail: string;
  phone?: string;
}

export async function initializePayment(payload: PaymentPayload) {
  try {
    const { provider, userId, productId, amount, currency, userEmail, phone } = payload;

    if (!userId) {
      throw new Error("User ID is required");
    }

    if (amount <= 0) {
      throw new Error("Invalid amount");
    }

    const supabase = await createClient();

    // Create order or transaction record in Supabase
    // Insert into orders or a custom transactions table
    const { data: order, error: dbError } = await supabase
      .from("orders")
      .insert({
        buyer_organization_id: userId, // Assuming user ID or org ID
        supplier_organization_id: userId,
        total_amount: amount,
        currency,
        status: "pending_escrow",
        shipping_details: { email: userEmail, phone: phone || null, provider },
      })
      .select()
      .single();

    if (dbError || !order) {
      console.error("Order creation failed in database:", dbError);
      throw new Error("Could not initialize order transaction.");
    }

    const txId = order.id;

    switch (provider) {
      case "paystack":
        return initializePaystack(amount, currency, userEmail, txId);
      case "flutterwave":
        return initializeFlutterwave(amount, currency, userEmail, txId);
      case "mobile-money":
        return initializeMobileMoneyTransaction(amount, currency, phone, txId);
      default:
        throw new Error("Unsupported payment provider");
    }
  } catch (error: any) {
    console.error("Payment initialization error:", error);
    return { success: false, message: error.message };
  }
}

function initializePaystack(amount: number, currency: string, email: string, txId: string) {
  const paystackAmount = convertToNGN(amount, currency) * 100;

  return {
    success: true,
    provider: "paystack",
    config: {
      reference: txId,
      amount: paystackAmount,
      email,
      currency: "NGN",
    },
  };
}

function initializeFlutterwave(amount: number, currency: string, email: string, txId: string) {
  return {
    success: true,
    provider: "flutterwave",
    config: {
      public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
      tx_ref: txId,
      amount,
      currency,
      customer: {
        email,
      },
    },
  };
}

function initializeMobileMoneyTransaction(
  amount: number,
  currency: string,
  phone: string | undefined,
  txId: string
) {
  if (!phone) {
    throw new Error("Phone number is required for mobile money");
  }

  const ussdCode = generateUSSDCode(amount, phone);

  return {
    success: true,
    provider: "mobile-money",
    ussdCode,
    reference: txId,
    instructions: `Dial ${ussdCode} from your mobile phone to complete payment`,
  };
}

function generateUSSDCode(amount: number, phone: string): string {
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  return `*165*3*${Math.round(amount)}*${cleanPhone}#`;
}

function convertToNGN(amount: number, currency: string): number {
  const rates: Record<string, number> = {
    NGN: 1,
    GHS: 50,
    KES: 5,
    UGX: 0.03,
    TZS: 0.04,
    RWF: 0.08,
    XAF: 0.6,
    ZAR: 20,
    USD: 1650,
    EUR: 1800,
  };

  return (amount * (rates[currency] || rates.USD)) / rates.NGN;
}

export async function verifyPayment(provider: string, reference: string) {
  try {
    switch (provider) {
      case "paystack":
        return verifyPaystackPayment(reference);
      case "flutterwave":
        return verifyFlutterwavePayment(reference);
      default:
        throw new Error("Unsupported provider");
    }
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return { success: false, message: error.message };
  }
}

async function verifyPaystackPayment(reference: string) {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
    },
  });

  const data = await response.json();

  if (!data.status) {
    throw new Error("Payment verification failed");
  }

  return {
    success: data.data.status === "success",
    amount: data.data.amount / 100,
    currency: "NGN",
    reference: data.data.reference,
  };
}

async function verifyFlutterwavePayment(txRef: string) {
  const response = await fetch(`https://api.flutterwave.com/v3/transactions/${txRef}/verify`, {
    headers: {
      Authorization: `Bearer ${FLUTTERWAVE_SECRET}`,
    },
  });

  const data = await response.json();

  if (data.status !== "success") {
    throw new Error("Payment verification failed");
  }

  return {
    success: data.data.status === "successful",
    amount: data.data.amount,
    currency: data.data.currency,
    reference: data.data.flw_ref,
  };
}
