import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, Timestamp } from "firebase/firestore";
import crypto from "crypto";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get("x-paystack-signature");
    const body = await request.text();

    if (!verifyPaystackSignature(body, signature || "")) {
      return NextResponse.json(
        { success: false, message: "Invalid signature" },
        { status: 401 }
      );
    }

    const data = JSON.parse(body);
    const { event, data: eventData } = data;

    if (event === "charge.success") {
      const { reference, status, amount } = eventData;

      // Find transaction by reference
      const txQuery = query(
        collection(db, "transactions"),
        where("reference", "==", reference)
      );

      const txSnapshot = await getDocs(txQuery);

      if (!txSnapshot.empty) {
        const txDoc = txSnapshot.docs[0];

        // Update transaction status
        await updateDoc(txDoc.ref, {
          status: status === "success" ? "completed" : "failed",
          amount: amount / 100,
          verifiedAt: Timestamp.now(),
          provider: "paystack",
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Paystack webhook error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

function verifyPaystackSignature(body: string, signature: string): boolean {
  const hash = crypto.createHmac("sha512", PAYSTACK_SECRET).update(body).digest("hex");
  return hash === signature;
}
