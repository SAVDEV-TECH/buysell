"use client";

import { useState } from "react";
import { Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getAuthHeaders } from "@/lib/clientAuth";

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

interface MobileMoneyButtonProps {
  product: Product;
  user: any;
  currency?: string;
}

const MOBILE_MONEY_PROVIDERS = [
  { id: "mtn", name: "MTN Mobile Money", code: "256", countries: ["UG", "GH", "CI", "CM"] },
  { id: "airtel", name: "Airtel Money", code: "256", countries: ["UG", "TZ", "KE", "DRC"] },
  { id: "vodafone", name: "Vodafone Cash", code: "233", countries: ["GH", "CI"] },
  { id: "equity", name: "Equity Money", code: "254", countries: ["KE"] },
  { id: "orange", name: "Orange Money", code: "256", countries: ["SN", "CM", "MA"] },
];

export default function MobileMoneyButton({
  product,
  user,
  currency = "USD",
}: MobileMoneyButtonProps) {
  const [showProviders, setShowProviders] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleMobileMoneyPayment = async (provider: string) => {
    if (!phoneNumber || phoneNumber.length < 9) {
      alert("Please enter a valid phone number");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/payments/mobile-money", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          provider,
          phoneNumber,
          amount: product.price,
          currency,
          productId: product.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`${data.ussdCode}\n\nDial this code to complete payment`);
        router.push(`/checkout/success?ref=${data.reference}`);
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error("Mobile Money error:", error);
      alert("Failed to process mobile money payment");
    } finally {
      setLoading(false);
      setShowProviders(false);
    }
  };

  if (showProviders) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      >
        <div className="bg-background rounded-2xl p-6 max-w-md w-full shadow-2xl">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Smartphone size={24} className="text-primary" />
            Mobile Money Payment
          </h2>

          <div className="space-y-2 mb-6">
            <label className="block text-sm font-medium mb-2">Phone Number</label>
            <input
              type="tel"
              placeholder="Enter your phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-3 border border-borderline rounded-xl focus:ring-2 focus:ring-primary/50 outline-none"
            />
            <p className="text-xs text-muted-foreground">Include country code (e.g., +256700000000)</p>
          </div>

          <div className="space-y-2 mb-6">
            <label className="block text-sm font-medium mb-2">Select Provider</label>
            <div className="grid grid-cols-1 gap-2">
              {MOBILE_MONEY_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleMobileMoneyPayment(provider.id)}
                  disabled={loading}
                  className="p-3 border-2 border-borderline rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left font-medium disabled:opacity-50"
                >
                  {provider.name}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowProviders(false)}
            className="w-full py-2 border border-borderline rounded-xl hover:bg-muted transition-all"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <button
      onClick={() => {
        if (!user) {
          alert("Please login to purchase");
          return;
        }
        setShowProviders(true);
      }}
      className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-blue-500/30"
      title="Pay with Mobile Money"
    >
      <Smartphone size={20} />
    </button>
  );
}
