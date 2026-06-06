"use client";

import { useState, useEffect } from "react";
import { Zap, CreditCard, Smartphone } from "lucide-react";

interface CountryInfo {
  country: string;
  currency: string;
  currencySymbol: string;
  preferredMethod: "paystack" | "flutterwave" | "mobile-money";
}

const COUNTRY_CONFIG: Record<string, CountryInfo> = {
  NG: { country: "Nigeria", currency: "NGN", currencySymbol: "₦", preferredMethod: "paystack" },
  KE: { country: "Kenya", currency: "KES", currencySymbol: "Ksh", preferredMethod: "flutterwave" },
  GH: { country: "Ghana", currency: "GHS", currencySymbol: "GH₵", preferredMethod: "flutterwave" },
  UG: { country: "Uganda", currency: "UGX", currencySymbol: "USh", preferredMethod: "mobile-money" },
  TZ: { country: "Tanzania", currency: "TZS", currencySymbol: "TSh", preferredMethod: "flutterwave" },
  RW: { country: "Rwanda", currency: "RWF", currencySymbol: "FRw", preferredMethod: "flutterwave" },
  CM: { country: "Cameroon", currency: "XAF", currencySymbol: "FCFA", preferredMethod: "flutterwave" },
  CI: { country: "Côte d'Ivoire", currency: "XOF", currencySymbol: "CFA", preferredMethod: "flutterwave" },
  SN: { country: "Senegal", currency: "XOF", currencySymbol: "CFA", preferredMethod: "flutterwave" },
  MA: { country: "Morocco", currency: "MAD", currencySymbol: "د.م.", preferredMethod: "flutterwave" },
  EG: { country: "Egypt", currency: "EGP", currencySymbol: "£", preferredMethod: "flutterwave" },
  ZA: { country: "South Africa", currency: "ZAR", currencySymbol: "R", preferredMethod: "paystack" },
  ET: { country: "Ethiopia", currency: "ETB", currencySymbol: "Br", preferredMethod: "mobile-money" },
  MW: { country: "Malawi", currency: "MWK", currencySymbol: "MK", preferredMethod: "mobile-money" },
  ZM: { country: "Zambia", currency: "ZMW", currencySymbol: "ZK", preferredMethod: "mobile-money" },
  BW: { country: "Botswana", currency: "BWP", currencySymbol: "P", preferredMethod: "flutterwave" },
};

export async function detectCountry(): Promise<CountryInfo> {
  try {
    // Try to get country from geolocation API
    const response = await fetch("https://ipapi.co/json/");
    const data = await response.json();
    const countryCode = data.country_code;

    return (
      COUNTRY_CONFIG[countryCode] || {
        country: data.country_name || "Unknown",
        currency: "USD",
        currencySymbol: "$",
        preferredMethod: "flutterwave",
      }
    );
  } catch {
    // Fallback to default
    return {
      country: "Unknown",
      currency: "USD",
      currencySymbol: "$",
      preferredMethod: "flutterwave",
    };
  }
}

interface PaymentMethodSelectorProps {
  onMethodChange: (method: "paystack" | "flutterwave" | "mobile-money") => void;
  selectedMethod: "paystack" | "flutterwave" | "mobile-money";
}

export default function PaymentMethodSelector({ onMethodChange, selectedMethod }: PaymentMethodSelectorProps) {
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    detectCountry().then((info) => {
      setCountryInfo(info);
      onMethodChange(info.preferredMethod);
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

  const methods = [
    {
      id: "paystack",
      name: "Paystack",
      description: "Fast & Secure (Nigeria, Kenya, South Africa)",
      icon: <CreditCard size={20} />,
      available: ["NG", "KE", "ZA"].includes(countryInfo?.country || ""),
    },
    {
      id: "flutterwave",
      name: "Flutterwave",
      description: `Available in ${countryInfo?.country}. Works with cards & wallets.`,
      icon: <Zap size={20} />,
      available: true,
    },
    {
      id: "mobile-money",
      name: "Mobile Money",
      description: "Pay with MTN, Airtel, Vodafone - Works on any phone",
      icon: <Smartphone size={20} />,
      available: true,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Payment Method</h3>
        {countryInfo && (
          <span className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-full font-medium">
            {countryInfo.country} • {countryInfo.currency}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {methods.map((method) => (
          <label
            key={method.id}
            className={`flex items-start gap-4 p-4 border-2 rounded-2xl cursor-pointer transition-all ${
              selectedMethod === method.id
                ? "border-primary bg-primary/5"
                : "border-borderline hover:border-primary/50 bg-background"
            } ${!method.available ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input
              type="radio"
              name="payment-method"
              value={method.id}
              checked={selectedMethod === method.id}
              onChange={() => onMethodChange(method.id as "paystack" | "flutterwave" | "mobile-money")}
              disabled={!method.available}
              className="mt-1 accent-primary"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {method.icon}
                <span className="font-bold">{method.name}</span>
                {!method.available && <span className="text-xs text-destructive font-medium">Not available in your region</span>}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{method.description}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="p-4 bg-accent/50 rounded-xl border border-borderline text-sm text-muted-foreground">
        <p className="font-medium mb-1">💡 Pro Tip:</p>
        <p>Mobile Money is fastest for amounts under ₦500,000. Cards work for larger purchases.</p>
      </div>
    </div>
  );
}
