"use client";

import React, { useState } from "react";
import { useCurrency } from "@/context/CurrencyContext";
import { HelpCircle, Info } from "lucide-react";

interface DualPriceTagProps {
  /** Base price in USD */
  amountInUsd?: number;
  /** Optional minimum price for tiered or range display */
  minPriceUsd?: number;
  /** Optional maximum price for tiered or range display */
  maxPriceUsd?: number;
  /** Unit of measure suffix, e.g. "unit", "pcs", "kg", "carton" */
  unit?: string;
  /** Sizing variant */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  /** Layout direction: stacked (default for cards) or inline (for tables/headers) */
  layout?: "stacked" | "inline" | "badge" | "hero";
  /** Custom extra styling */
  className?: string;
  /** Show the interactive info tooltip with exchange rate breakdown */
  showTooltip?: boolean;
}

export function DualPriceTag({
  amountInUsd,
  minPriceUsd,
  maxPriceUsd,
  unit,
  size = "md",
  layout = "stacked",
  className = "",
  showTooltip = false,
}: DualPriceTagProps) {
  const { currency, currencySymbol, convertPrice, exchangeRates } = useCurrency();
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const isRange = typeof minPriceUsd === "number" && typeof maxPriceUsd === "number" && minPriceUsd !== maxPriceUsd;
  const isSingle = typeof amountInUsd === "number" || (!isRange && typeof minPriceUsd === "number");
  const singleUsd = amountInUsd ?? minPriceUsd ?? 0;

  const unitSuffix = unit ? ` / ${unit}` : "";
  const isTargetUsd = currency === "USD";
  const currentRate = exchangeRates[currency] || 1;

  // Single price computation
  const singleConverted = convertPrice(singleUsd);
  const formattedUsd = `$${singleUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} USD`;
  const formattedConverted = `${currencySymbol}${singleConverted.toLocaleString()} ${currency}`;

  // Range price computation
  const minConverted = isRange ? convertPrice(minPriceUsd!) : 0;
  const maxConverted = isRange ? convertPrice(maxPriceUsd!) : 0;
  const formattedUsdRange = isRange ? `$${minPriceUsd!.toLocaleString()} - $${maxPriceUsd!.toLocaleString()} USD` : "";
  const formattedConvertedRange = isRange ? `${currencySymbol}${minConverted.toLocaleString()} - ${currencySymbol}${maxConverted.toLocaleString()} ${currency}` : "";

  // Size styling maps
  const primarySizeClasses = {
    xs: "text-[11px] font-black",
    sm: "text-xs font-black",
    md: "text-sm font-black",
    lg: "text-lg font-black",
    xl: "text-2xl md:text-3xl font-black",
    "2xl": "text-3xl md:text-4xl font-black",
  }[size];

  const secondarySizeClasses = {
    xs: "text-[9px] font-bold text-muted-foreground",
    sm: "text-[10px] font-bold text-muted-foreground",
    md: "text-xs font-bold text-muted-foreground",
    lg: "text-sm font-bold text-muted-foreground",
    xl: "text-base font-bold text-muted-foreground",
    "2xl": "text-lg font-bold text-muted-foreground",
  }[size];

  // Tooltip content
  const tooltipText = `Estimated conversion (1 USD ≈ ${currencySymbol}${currentRate.toLocaleString()} ${currency}). Final pricing & contract settlement are based on USD or supplier terms.`;

  return (
    <div className={`flex flex-col min-w-0 ${layout === "inline" ? "sm:flex-row sm:items-baseline sm:gap-2" : "gap-0.5"} ${className}`}>
      
      {/* ── Primary Price (USD Base) ── */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`tracking-tight text-primary truncate ${primarySizeClasses}`}>
          {isRange ? formattedUsdRange : formattedUsd}
          {unitSuffix && <span className="font-normal text-muted-foreground text-[0.75em]">{unitSuffix}</span>}
        </span>

        {showTooltip && !isTargetUsd && (
          <div className="relative inline-block">
            <button
              type="button"
              onMouseEnter={() => setTooltipOpen(true)}
              onMouseLeave={() => setTooltipOpen(false)}
              onClick={() => setTooltipOpen(!tooltipOpen)}
              className="text-muted-foreground hover:text-primary transition-colors p-0.5"
              aria-label="Currency exchange info"
            >
              <Info size={size === "xl" || size === "2xl" ? 16 : 12} />
            </button>

            {tooltipOpen && (
              <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-card border border-border text-foreground text-[11px] rounded-xl shadow-2xl z-50 pointer-events-none leading-relaxed">
                <p className="font-bold text-primary mb-1">Estimated Local Pricing</p>
                <p className="text-muted-foreground">{tooltipText}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Secondary Local Price (e.g. ≈ ₦75,000 NGN) ── */}
      {!isTargetUsd && (
        <div className={`flex items-center gap-1 min-w-0 ${secondarySizeClasses}`}>
          <span className="truncate">
            ≈ {isRange ? formattedConvertedRange : formattedConverted}
            {unitSuffix && layout !== "inline" && <span className="text-[0.85em] opacity-80">{unitSuffix}</span>}
          </span>
        </div>
      )}
    </div>
  );
}

export default DualPriceTag;
