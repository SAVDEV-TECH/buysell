"use server";

import { createClient } from "@/lib/supabase/server";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";

function validateBankDetails(bankDetails: any): { valid: boolean; error?: string } {
  if (!bankDetails || typeof bankDetails !== "object") {
    return { valid: false, error: "Bank details are required" };
  }

  const { accountName, accountNumber, bankCode } = bankDetails;

  if (!accountName || typeof accountName !== "string" || accountName.length < 2 || accountName.length > 100) {
    return { valid: false, error: "Account name must be 2-100 characters" };
  }

  if (!accountNumber || !/^\d{10}$/.test(accountNumber)) {
    return { valid: false, error: "Account number must be exactly 10 digits" };
  }

  if (!bankCode || !/^\d{3}$/.test(bankCode)) {
    return { valid: false, error: "Bank code must be exactly 3 digits" };
  }

  return { valid: true };
}

export async function processPaystackPayout(
  adminUid: string,
  payoutId: string,
  userId: string,
  amount: number,
  bankDetails: any
) {
  try {
    if (!PAYSTACK_SECRET) {
      throw new Error("Paystack Secret Key is missing from environment.");
    }

    if (!adminUid) {
      throw new Error("Unauthorized: administrative identity required.");
    }

    if (!payoutId || !userId || amount <= 0) {
      throw new Error("Invalid payout parameters");
    }

    const bankValidation = validateBankDetails(bankDetails);
    if (!bankValidation.valid) {
      throw new Error(bankValidation.error);
    }

    const supabase = await createClient();

    // Verify admin identity
    const { data: adminRecord, error: adminErr } = await supabase
      .from("users")
      .select("role")
      .eq("id", adminUid)
      .single();

    if (adminErr || !adminRecord) {
      throw new Error("Unauthorized: administrator record not found.");
    }

    if (adminRecord.role !== "super_admin") {
      throw new Error("Access Denied: administrative clearance required.");
    }

    const idempotencyKey = `${payoutId}-${userId}-${amount}-${bankDetails.accountNumber}`;

    // 1. Create Transfer Recipient
    const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        type: "nuban",
        name: bankDetails.accountName,
        account_number: bankDetails.accountNumber,
        bank_code: bankDetails.bankCode,
        currency: "NGN",
      }),
    });

    const recipientData = await recipientRes.json();
    if (!recipientData.status) {
      throw new Error(`Recipient creation failed: ${recipientData.message}`);
    }

    const recipientCode = recipientData.data.recipient_code;

    // 2. Initiate Transfer
    const transferRes = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `${idempotencyKey}-transfer`,
      },
      body: JSON.stringify({
        source: "balance",
        amount: Math.round(amount * 100),
        recipient: recipientCode,
        reason: `Payout Request ID: ${payoutId}`,
      }),
    });

    const transferData = await transferRes.json();
    if (!transferData.status) {
      throw new Error(`Transfer initiation failed: ${transferData.message}`);
    }

    return { success: true, message: "Payout processed successfully via Paystack" };
  } catch (error: any) {
    console.error("Payout Processing Error:", error);
    return { success: false, message: error.message || "Failed to process payout" };
  }
}
