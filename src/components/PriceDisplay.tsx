"use client";

import { useCurrency } from "@/context/CurrencyContext";
import { convertCurrency, formatCurrency } from "@/lib/geolocation";

interface PriceDisplayProps {
  amount: number;
  basePrice?: number; // If different from amount
  baseCurrency?: string; // Default: "NGN"
  showLabel?: boolean;
  className?: string;
}

export default function PriceDisplay({
  amount,
  basePrice = amount,
  baseCurrency = "NGN",
  showLabel = false,
  className = "",
}: PriceDisplayProps) {
  const { country, currency } = useCurrency();

  // Convert price to user's currency
  const convertedPrice = convertCurrency(basePrice, baseCurrency, currency);
  const formattedPrice = formatCurrency(convertedPrice, currency, country.currencySymbol);

  return (
    <span className={className} title={`${formattedPrice} in ${country.name}`}>
      {formattedPrice}
      {showLabel && <span className="text-xs text-muted-foreground ml-1">({country.currencyCode})</span>}
    </span>
  );
}
