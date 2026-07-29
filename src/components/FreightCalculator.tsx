"use client";

import React, { useState } from "react";
import { Ship, Plane, Calculator, Package, Info, ArrowRight } from "lucide-react";

interface FreightCalculatorProps {
  basePrice: number;
  moq?: number;
  unit?: string;
  tieredPricing?: Array<{ min_qty: number; unit_price: number }>;
}

export function FreightCalculator({
  basePrice = 10,
  moq = 100,
  unit = "pcs",
  tieredPricing = [],
}: FreightCalculatorProps) {
  const [quantity, setQuantity] = useState(Math.max(100, moq));
  const [freightMode, setFreightMode] = useState<"sea_lcl" | "sea_fcl" | "air">("sea_lcl");

  // Determine unit price based on quantity tiers
  let unitPrice = basePrice;
  if (tieredPricing && tieredPricing.length > 0) {
    const sortedTiers = [...tieredPricing].sort((a, b) => b.min_qty - a.min_qty);
    const matchedTier = sortedTiers.find((t) => quantity >= t.min_qty);
    if (matchedTier) unitPrice = matchedTier.unit_price;
  }

  const subtotal = unitPrice * quantity;

  // Freight Cost Estimations
  const estimatedWeightKg = Math.round(quantity * 0.35); // Avg ~0.35kg per unit
  const estimatedCbm = Math.max(0.1, Math.round((quantity * 0.002) * 10) / 10); // Avg ~0.002 CBM/unit

  let freightCost = 0;
  let estimatedDays = "14-21 Days";

  if (freightMode === "sea_lcl") {
    freightCost = Math.round(Math.max(120, estimatedCbm * 160));
    estimatedDays = "18-28 Days";
  } else if (freightMode === "sea_fcl") {
    freightCost = 2100; // Full 20ft container flat estimate
    estimatedDays = "15-22 Days";
  } else if (freightMode === "air") {
    freightCost = Math.round(estimatedWeightKg * 4.8);
    estimatedDays = "4-7 Days (Express)";
  }

  const grandTotal = subtotal + freightCost;

  return (
    <div className="w-full glass rounded-3xl border border-borderline p-6 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-borderline pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <Calculator size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Bulk Order & Freight Cost Estimator
            </h3>
            <p className="text-[11px] text-muted-foreground font-medium">
              Calculate unit pricing, cargo specs, and international logistics
            </p>
          </div>
        </div>
      </div>

      {/* Quantity Slider */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-muted-foreground">Order Quantity:</span>
          <span className="font-black text-slate-900 dark:text-white text-sm">
            {quantity.toLocaleString()} {unit}
          </span>
        </div>

        <input
          type="range"
          min={moq}
          max={50000}
          step={50}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-full accent-primary cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
        />

        <div className="flex justify-between text-[10px] text-slate-400 font-bold">
          <span>MOQ: {moq}</span>
          <span>10,000</span>
          <span>50,000+ Container</span>
        </div>
      </div>

      {/* Freight Mode Selector */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-muted-foreground">Logistics Dispatch Mode:</span>
        <div className="grid grid-cols-3 gap-3">
          
          <button
            type="button"
            onClick={() => setFreightMode("sea_lcl")}
            className={`p-3 rounded-2xl border text-left transition-all ${
              freightMode === "sea_lcl"
                ? "bg-primary/10 border-primary text-primary font-black"
                : "border-borderline hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold"
            }`}
          >
            <Ship size={16} className="mb-1" />
            <p className="text-xs">Sea (LCL)</p>
            <span className="text-[9px] opacity-75 font-normal">Shared Cargo</span>
          </button>

          <button
            type="button"
            onClick={() => setFreightMode("sea_fcl")}
            className={`p-3 rounded-2xl border text-left transition-all ${
              freightMode === "sea_fcl"
                ? "bg-primary/10 border-primary text-primary font-black"
                : "border-borderline hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold"
            }`}
          >
            <Package size={16} className="mb-1" />
            <p className="text-xs">Sea (20ft FCL)</p>
            <span className="text-[9px] opacity-75 font-normal">Full Container</span>
          </button>

          <button
            type="button"
            onClick={() => setFreightMode("air")}
            className={`p-3 rounded-2xl border text-left transition-all ${
              freightMode === "air"
                ? "bg-primary/10 border-primary text-primary font-black"
                : "border-borderline hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold"
            }`}
          >
            <Plane size={16} className="mb-1" />
            <p className="text-xs">Air Cargo</p>
            <span className="text-[9px] opacity-75 font-normal">Express Freight</span>
          </button>

        </div>
      </div>

      {/* Summary Box */}
      <div className="p-4 rounded-2xl bg-slate-900 dark:bg-slate-950 text-white space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-400">Unit Price Tier:</span>
          <span className="font-bold">${unitPrice.toFixed(2)} USD</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Est. Weight / Volume:</span>
          <span className="font-bold">{estimatedWeightKg} kg (~{estimatedCbm} CBM)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Est. Shipping ({estimatedDays}):</span>
          <span className="font-bold">${freightCost.toLocaleString()} USD</span>
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-black">
          <span className="text-emerald-400">Estimated Total Landed Cost:</span>
          <span className="text-emerald-400 text-base">${grandTotal.toLocaleString()} USD</span>
        </div>
      </div>

    </div>
  );
}

export default FreightCalculator;
