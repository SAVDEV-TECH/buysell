import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, Timestamp } from "firebase/firestore";
import crypto from "crypto";

const FLUTTERWAVE_SECRET = process.env.FLUTTERWAVE_SECRET_KEY || "";

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get("verif-hash");
    const body = await request.text();

    if (!verifyFlutterwaveSignature(body, signature || "")) {
      return NextResponse.json(
        { success: false, message: "Invalid signature" },
        { status: 401 }
      );
    }

    const data = JSON.parse(body);
    const { event, data: eventData } = data;

    if (event === "charge.completed") {
      const { tx_ref, status, amount } = eventData;

      // Find transaction by reference
      const txQuery = query(
        collection(db, "transactions"),
        where("reference", "==", tx_ref)
      );

      const txSnapshot = await getDocs(txQuery);

      if (!txSnapshot.empty) {
        const txDoc = txSnapshot.docs[0];

        // Update transaction status
        await updateDoc(txDoc.ref, {
          status: status === "successful" ? "completed" : "failed",
          amount,
          verifiedAt: Timestamp.now(),
          provider: "flutterwave",
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Flutterwave webhook error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

function verifyFlutterwaveSignature(body: string, signature: string): boolean {
  const hash = crypto.createHmac("sha256", FLUTTERWAVE_SECRET).update(body).digest("hex");
  return hash === signature;
}
