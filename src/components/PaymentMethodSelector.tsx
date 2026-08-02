"use client";

import { useState, useEffect } from "react";
import { Zap, CreditCard, Smartphone, Globe, Landmark } from "lucide-react";
import { getPaymentRoute, GlobalPaymentMethod } from "@/lib/globalPaymentRouter";
import { COUNTRY_CONFIG, getCountryFromIP } from "@/lib/geolocation";

interface PaymentMethodSelectorProps {
  onMethodChange: (method: GlobalPaymentMethod) => void;
  selectedMethod: GlobalPaymentMethod;
}

export default function PaymentMethodSelector({ onMethodChange, selectedMethod }: PaymentMethodSelectorProps) {
  const [countryCode, setCountryCode] = useState<string>("NG");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCountryFromIP().then((code) => {
      setCountryCode(code);
      const route = getPaymentRoute(code);
      onMethodChange(route.method);
      setLoading(false);
    });
  }, [onMethodChange]);

  if (loading) {
    return (
      <div className="space-y-4 p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl">
        <div className="h-6 bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
      </div>
    );
  }

  const countryInfo = COUNTRY_CONFIG[countryCode] || {
    name: countryCode,
    currencyCode: "USD",
    currencySymbol: "$",
  };
  const route = getPaymentRoute(countryCode);

  const methods: Array<{
    id: GlobalPaymentMethod;
    name: string;
    description: string;
    icon: React.ReactNode;
    recommended: boolean;
  }> = [
    {
      id: "stripe",
      name: "Stripe International",
      description: "Escrow-protected · Card, ACH, SEPA & international wire",
      icon: <Globe size={20} className="text-blue-500" />,
      recommended: route.method === "stripe",
    },
    {
      id: "verto_fx",
      name: "VertoFX Wholesale Wire",
      description: "Pay with CNY, EUR, GBP or USD SWIFT transfer. Direct wholesale FX conversion.",
      icon: <Landmark size={20} className="text-emerald-500" />,
      recommended: route.method === "verto_fx",
    },
    {
      id: "paystack",
      name: "Paystack",
      description: "Escrow-protected · Card, bank transfer or USSD (African markets)",
      icon: <CreditCard size={20} className="text-indigo-500" />,
      recommended: route.method === "paystack",
    },
    {
      id: "flutterwave",
      name: "Flutterwave",
      description: `Available in ${countryInfo.name}. Works with cards & local wallets.`,
      icon: <Zap size={20} className="text-amber-500" />,
      recommended: route.method === "flutterwave",
    },
    {
      id: "mobile-money",
      name: "Mobile Money",
      description: "Pay with MTN, Airtel, Vodafone - Works on any mobile phone",
      icon: <Smartphone size={20} className="text-rose-500" />,
      recommended: route.method === "mobile-money",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Payment Method</h3>
        <span className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-full font-medium">
          {countryInfo.name} • {countryInfo.currencyCode} ({countryInfo.currencySymbol})
        </span>
      </div>

      <div className="space-y-3">
        {methods.map((method) => (
          <label
            key={method.id}
            className={`flex items-start gap-4 p-4 border-2 rounded-2xl cursor-pointer transition-all ${
              selectedMethod === method.id
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-borderline hover:border-primary/50 bg-background opacity-80 hover:opacity-100"
            }`}
          >
            <input
              type="radio"
              name="payment-method"
              value={method.id}
              checked={selectedMethod === method.id}
              onChange={() => onMethodChange(method.id)}
              className="mt-1 accent-primary"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {method.icon}
                <span className="font-bold">{method.name}</span>
                {method.recommended && (
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-primary text-white rounded-full">
                    Recommended for {countryInfo.name}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{method.description}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="p-4 bg-accent/10 rounded-xl border border-accent/20 text-sm text-muted-foreground">
        <p className="font-medium mb-1 text-accent-foreground">💡 Escrow Protection Active:</p>
        <p className="text-xs">
          All payments on BuySell are held in secure escrow. Funds are released to African suppliers only after inspection &amp; milestone approval.
        </p>
      </div>
    </div>
  );
}

