"use client";

import { ShoppingCart } from "lucide-react";
import { usePaystackPayment } from "react-paystack";
import { User as FirebaseUser } from "firebase/auth";
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

export default function PaystackButton({ product, user }: { product: Product, user: FirebaseUser | null }) {
  const router = useRouter();

  const config = {
    reference: (new Date()).getTime().toString(),
    email: user?.email || "customer@example.com",
    amount: product.price * 100, // Paystack amount is in kobo
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_placeholder",
  };

  const initializePayment = usePaystackPayment(config);

  const onSuccess = (reference: { reference: string }) => {
    // Implementation for successful transaction
    console.log("Success", reference);
    router.push(`/checkout/success?ref=${reference.reference}`);
  };

  const onClose = () => {
    // Implementation for when the Paystack dialog closes
    console.log("closed");
  };

  return (
    <button 
      onClick={() => {
        if (!user) {
          alert("Please login to purchase");
          return;
        }
        initializePayment({ onSuccess, onClose });
      }}
      className="w-full p-2 sm:p-2.5 lg:p-3 bg-slate-900 dark:bg-primary text-white rounded-lg sm:rounded-xl hover:scale-100 sm:hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-primary/20 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold"
    >
      <ShoppingCart size={14} className="sm:block hidden" />
      <span className="hidden sm:inline">Buy Now</span>
      <span className="sm:hidden">Buy</span>
    </button>
  );
}
