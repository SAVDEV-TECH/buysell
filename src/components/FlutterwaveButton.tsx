"use client";

import { ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";

interface Product {
  id: number | string;
  name: string;
  price: number;
  category: string;
  image?: React.ReactNode;
  imageUrl?: string;
  desc: string;
  rating: number;
  reviews: number;
}

interface FlutterwaveButtonProps {
  product: Product;
  user: any;
  currency?: string;
}

export default function FlutterwaveButton({
  product,
  user,
  currency = "USD",
}: FlutterwaveButtonProps) {
  const router = useRouter();

  const handleFlutterPayment = async () => {
    if (!user) {
      alert("Please login to purchase");
      return;
    }

    try {
      const config = {
        public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || "pk_test_placeholder",
        tx_ref: `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        amount: product.price,
        currency: currency,
        payment_options: "card, account, ussd, mobilemoney, payattitude",
        customer: {
          email: user?.email || "customer@example.com",
          phone_number: user?.phone || "",
          name: user?.full_name || "Customer",
        },
        customizations: {
          title: `Buy ${product.name}`,
          description: product.desc,
          logo: "https://buysell.com/logo.png",
        },
      };

      const flutterPaymentResponse = await fetch("/api/payments/flutterwave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          productId: product.id,
          userId: user.id,
        }),
      });

      const response = await flutterPaymentResponse.json();

      if (response.success) {
        router.push(`/checkout/success?ref=${response.reference}`);
      }
    } catch (error) {
      console.error("Flutterwave payment error:", error);
      alert("Failed to process payment");
    }
  };

  return (
    <button
      onClick={handleFlutterPayment}
      className="p-4 bg-gradient-to-r from-orange-500 to-red-600 dark:from-orange-600 dark:to-red-700 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-orange-500/30"
      title="Pay with Flutterwave"
    >
      <ShoppingCart size={20} />
    </button>
  );
}
