"use server";

import { db } from "@/lib/firebase";
import { doc, updateDoc, Timestamp, addDoc, collection, getDoc, query, where, getDocs } from "firebase/firestore";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";

// Validate bank account details
function validateBankDetails(bankDetails: any): { valid: boolean; error?: string } {
  if (!bankDetails || typeof bankDetails !== "object") {
    return { valid: false, error: "Bank details are required" };
  }

  const { accountName, accountNumber, bankCode } = bankDetails;

  // Validate account name (2-100 characters)
  if (!accountName || typeof accountName !== "string" || accountName.length < 2 || accountName.length > 100) {
    return { valid: false, error: "Account name must be 2-100 characters" };
  }

  // Validate account number (10 digits for Nigerian accounts)
  if (!accountNumber || !/^\d{10}$/.test(accountNumber)) {
    return { valid: false, error: "Account number must be exactly 10 digits" };
  }

  // Validate bank code (3 digits)
  if (!bankCode || !/^\d{3}$/.test(bankCode)) {
    return { valid: false, error: "Bank code must be exactly 3 digits" };
  }

  return { valid: true };
}

// Check for duplicate payout to prevent double processing
async function checkDuplicatePayout(userId: string, amount: number, accountNumber: string): Promise<{ isDuplicate: boolean; message?: string }> {
  const payoutsRef = collection(db, "payouts");
  const recentPayoutsQuery = query(
    payoutsRef,
    where("userId", "==", userId),
    where("amount", "==", amount),
    where("accountNumber", "==", accountNumber),
    where("createdAt", ">", new Date(Date.now() - 3600000)) // Within last hour
  );

  const snapshot = await getDocs(recentPayoutsQuery);
  if (!snapshot.empty) {
    const recentPayout = snapshot.docs[0].data();
    if (recentPayout.status === "Completed" || recentPayout.status === "Pending") {
      return {
        isDuplicate: true,
        message: `Duplicate payout detected. Reference: ${recentPayout.paystackRef}`,
      };
    }
  }

  return { isDuplicate: false };
}

export async function processPaystackPayout(
  adminUid: string,
  payoutId: string,
  userId: string,
  amount: number,
  bankDetails: any
) {
  try {
    // Validate inputs
    if (!PAYSTACK_SECRET) {
      throw new Error("Paystack Secret Key is missing from environment.");
    }

    if (!adminUid) {
      throw new Error("Unauthorized: administrative identity required.");
    }

    if (!payoutId || !userId || amount <= 0) {
      throw new Error("Invalid payout parameters");
    }

    // Validate bank details
    const bankValidation = validateBankDetails(bankDetails);
    if (!bankValidation.valid) {
      throw new Error(bankValidation.error);
    }

    // Check for duplicate payout
    const duplicateCheck = await checkDuplicatePayout(userId, amount, bankDetails.accountNumber);
    if (duplicateCheck.isDuplicate) {
      throw new Error(duplicateCheck.message);
    }

    // Verify admin identity
    const adminDocRef = doc(db, "users", adminUid);
    const adminSnap = await getDoc(adminDocRef);

    if (!adminSnap.exists()) {
      throw new Error("Unauthorized: administrator record not found.");
    }

    if (adminSnap.data().role !== "ADMIN") {
      throw new Error("Access Denied: administrative clearance required.");
    }

    // Generate idempotency key
    const idempotencyKey = `${payoutId}-${userId}-${amount}-${bankDetails.accountNumber}`;

    // Check if this payout already exists in the database
    const payoutRef = doc(db, "payoutRequests", payoutId);
    const payoutSnap = await getDoc(payoutRef);

    if (payoutSnap.exists() && payoutSnap.data().status === "Paid") {
      return {
        success: true,
        message: "Payout already processed",
        reference: payoutSnap.data().paystackTransferCode,
      };
    }

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
        amount: Math.round(amount * 100), // convert to kobo
        recipient: recipientCode,
        reason: `Payout Request ID: ${payoutId}`,
      }),
    });

    const transferData = await transferRes.json();
    if (!transferData.status) {
      throw new Error(`Transfer initiation failed: ${transferData.message}`);
    }

    // 3. Update Firestore Records
    // Mark the request as paid
    await updateDoc(doc(db, "payoutRequests", payoutId), {
      status: "Paid",
      paidAt: Timestamp.now(),
      paystackTransferCode: transferData.data.transfer_code,
      recipientCode: recipientCode,
      idempotencyKey,
    });

    // Create a transaction record in the payouts historical ledger
    await addDoc(collection(db, "payouts"), {
      userId,
      amount,
      status: "Completed",
      createdAt: Timestamp.now(),
      paystackRef: transferData.data.reference || transferData.data.transfer_code,
      requestId: payoutId,
      accountNumber: bankDetails.accountNumber,
      idempotencyKey,
    });

    return { success: true, message: "Payout processed successfully via Paystack" };
  } catch (error: any) {
    console.error("Payout Processing Error:", error);
    return { success: false, message: error.message || "Failed to process payout" };
  }
}

