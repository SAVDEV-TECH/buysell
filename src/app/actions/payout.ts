"use server";

import { db } from "@/lib/firebase";
import { doc, updateDoc, Timestamp, addDoc, collection } from "firebase/firestore";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";

export async function processPaystackPayout(payoutId: string, userId: string, amount: number, bankDetails: any) {
  try {
    if (!PAYSTACK_SECRET) {
      throw new Error("Paystack Secret Key is missing from environment.");
    }

    // 1. Create Transfer Recipient
    const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
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
      recipientCode: recipientCode
    });
    
    // Create a transaction record in the payouts historical ledger
    await addDoc(collection(db, "payouts"), {
      userId,
      amount,
      status: "Completed",
      createdAt: Timestamp.now(),
      paystackRef: transferData.data.reference || transferData.data.transfer_code,
      requestId: payoutId
    });

    return { success: true, message: "Payout processed successfully via Paystack" };
  } catch (error: any) {
    console.error("Payout Processing Error:", error);
    return { success: false, message: error.message || "Failed to process payout" };
  }
}
