"use client";

import React, { useState } from "react";
import { Ship, Plane, Calculator, Package, Info } from "lucide-react";
import { DualPriceTag } from "@/components/DualPriceTag";

interface FreightCalculatorProps {
  basePrice: number;
  moq?: number;
  unit?: string;
  tieredPricing?: Array<{ min_qty: number; unit_price: number }>;
}

const PRODUCT_TYPES = [
  { id: "general", name: "General Manufactured Goods", weightPerUnit: 0.35, cbmPerUnit: 0.002 },
  { id: "cashew", name: "Raw Cashew Nuts (50kg bags)", weightPerUnit: 50.0, cbmPerUnit: 0.08 },
  { id: "sesame", name: "Sesame Seeds (25kg bags)", weightPerUnit: 25.0, cbmPerUnit: 0.04 },
  { id: "ginger", name: "Dry Split Ginger (50kg bags)", weightPerUnit: 50.0, cbmPerUnit: 0.10 },
  { id: "cocoa", name: "Cocoa Beans (60kg bags)", weightPerUnit: 60.0, cbmPerUnit: 0.09 },
  { id: "cotton", name: "Cotton Bales", weightPerUnit: 180.0, cbmPerUnit: 0.40 },
];

export function FreightCalculator({
  basePrice = 10,
  moq = 100,
  unit = "pcs",
  tieredPricing = [],
}: FreightCalculatorProps) {
  const [quantity, setQuantity] = useState(Math.max(100, moq));
  const [productTypeId, setProductTypeId] = useState("general");
  const [freightMode, setFreightMode] = useState<"sea_lcl" | "sea_fcl" | "air">("sea_lcl");

  const productProfile = PRODUCT_TYPES.find((p) => p.id === productTypeId) || PRODUCT_TYPES[0];

  // Determine unit price based on quantity tiers
  let unitPrice = basePrice;
  if (tieredPricing && tieredPricing.length > 0) {
    const sortedTiers = [...tieredPricing].sort((a, b) => b.min_qty - a.min_qty);
    const matchedTier = sortedTiers.find((t) => quantity >= t.min_qty);
    if (matchedTier) unitPrice = matchedTier.unit_price;
  }

  const subtotal = unitPrice * quantity;

  // Freight Cost Estimations based on selected commodity profile
  const estimatedWeightKg = Math.round(quantity * productProfile.weightPerUnit);
  const estimatedCbm = Math.max(0.1, Math.round(quantity * productProfile.cbmPerUnit * 10) / 10);

  let freightCost = 0;
  let estimatedDays = "14-21 Days";

  if (freightMode === "sea_lcl") {
    freightCost = Math.round(Math.max(120, estimatedCbm * 160));
    estimatedDays = "18-28 Days";
  } else if (freightMode === "sea_fcl") {
    // 20ft container fits ~28 CBM or 21,000 kg
    const containersNeeded = Math.max(1, Math.ceil(Math.max(estimatedCbm / 28, estimatedWeightKg / 21000)));
    freightCost = containersNeeded * 2100;
    estimatedDays = `15-22 Days (${containersNeeded} x 20ft FCL)`;
  } else if (freightMode === "air") {
    freightCost = Math.round(estimatedWeightKg * 4.8);
    estimatedDays = "4-7 Days (Express)";
  }

  const grandTotal = subtotal + freightCost;

  return (
    <div className="w-full bg-card rounded-3xl border border-border p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <Calculator size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground">
              Bulk Order &amp; Freight Cost Estimator
            </h3>
            <p className="text-[11px] text-muted-foreground font-medium">
              Calculate unit pricing, commodity weight/CBM, and international shipping
            </p>
          </div>
        </div>
      </div>

      {/* Commodity Type Selector */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground">Commodity / Product Cargo Specs:</label>
        <select
          value={productTypeId}
          onChange={(e) => setProductTypeId(e.target.value)}
          className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary/50 outline-none"
        >
          {PRODUCT_TYPES.map((pt) => (
            <option key={pt.id} value={pt.id}>
              {pt.name} ({pt.weightPerUnit}kg/unit)
            </option>
          ))}
        </select>
      </div>

      {/* Quantity Slider */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-muted-foreground">Order Quantity:</span>
          <span className="font-black text-foreground text-sm">
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
          className="w-full accent-primary cursor-pointer h-2 bg-muted rounded-lg"
        />

        <div className="flex justify-between text-[10px] text-muted-foreground font-bold">
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
                : "border-border hover:bg-muted/40 text-muted-foreground font-bold"
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
                : "border-border hover:bg-muted/40 text-muted-foreground font-bold"
            }`}
          >
            <Package size={16} className="mb-1" />
            <p className="text-xs">Sea (FCL)</p>
            <span className="text-[9px] opacity-75 font-normal">20ft Container</span>
          </button>

          <button
            type="button"
            onClick={() => setFreightMode("air")}
            className={`p-3 rounded-2xl border text-left transition-all ${
              freightMode === "air"
                ? "bg-primary/10 border-primary text-primary font-black"
                : "border-border hover:bg-muted/40 text-muted-foreground font-bold"
            }`}
          >
            <Plane size={16} className="mb-1" />
            <p className="text-xs">Air Cargo</p>
            <span className="text-[9px] opacity-75 font-normal">Express Freight</span>
          </button>
        </div>
      </div>

      {/* Summary Box */}
      <div className="p-4 rounded-2xl bg-card border border-border text-foreground space-y-2 text-xs">
        <div className="flex justify-between items-baseline">
          <span className="text-muted-foreground">Unit Price Tier:</span>
          <DualPriceTag amountInUsd={unitPrice} size="xs" layout="inline" />
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Est. Cargo Weight / Volume:</span>
          <span className="font-bold">
            {estimatedWeightKg.toLocaleString()} kg (~{estimatedCbm} CBM)
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-muted-foreground">Est. Shipping ({estimatedDays}):</span>
          <DualPriceTag amountInUsd={freightCost} size="xs" layout="inline" />
        </div>

        <div className="pt-3 border-t border-border flex justify-between items-center text-sm font-black">
          <span className="text-primary">Est. Landed Total:</span>
          <DualPriceTag amountInUsd={grandTotal} size="lg" layout="stacked" showTooltip />
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground italic">
        <Info size={12} className="shrink-0 text-primary" />
        <span>FOB quotes include delivery to departure port (Lagos/Lomé). Final CIF costs include ocean freight &amp; insurance.</span>
      </div>
    </div>
  );
}

export default FreightCalculator;

