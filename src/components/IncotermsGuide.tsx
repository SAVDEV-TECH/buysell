"use client";

import React, { useState } from "react";
import { HelpCircle, X, ShieldCheck, Ship, Truck, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function IncotermsGuide() {
  const [isOpen, setIsOpen] = useState(false);

  const terms = [
    {
      code: "FOB",
      name: "Free On Board (Departure Port)",
      recommendedFor: "African Sellers & Global Buyers (Most Popular)",
      sellerDuty: "Delivers goods onto ship at local departure port (e.g., Port of Lagos, Port of Lomé). Pays local port & export clearance.",
      buyerDuty: "Covers ocean freight, cargo insurance, destination customs clearance, and inland transport.",
      icon: Ship,
    },
    {
      code: "CIF",
      name: "Cost, Insurance & Freight",
      recommendedFor: "Buyers who want seller to arrange ocean shipping",
      sellerDuty: "Pays ocean freight and marine cargo insurance to destination port.",
      buyerDuty: "Handles destination port clearance, import tariffs, and transport from port to warehouse.",
      icon: ShieldCheck,
    },
    {
      code: "EXW",
      name: "Ex Works (Factory Gate)",
      recommendedFor: "Buyers with local logistics agents in Africa",
      sellerDuty: "Makes goods available at factory/warehouse door.",
      buyerDuty: "Handles all loading, export clearance, ocean transit, insurance, and import duties.",
      icon: FileText,
    },
    {
      code: "DDP",
      name: "Delivered Duty Paid (Doorstep)",
      recommendedFor: "Turnkey delivery",
      sellerDuty: "Handles end-to-end transport, ocean freight, insurance, and destination import tariffs.",
      buyerDuty: "Unloads cargo at destination warehouse.",
      icon: Truck,
    },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-bold"
      >
        <HelpCircle size={14} />
        <span>What are Incoterms?</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-card w-full max-w-2xl rounded-3xl shadow-2xl relative overflow-hidden border border-border z-50 p-6 md:p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-black text-foreground">
                    International Trade Terms (Incoterms 2020)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Understand seller vs buyer responsibilities for global B2B contracts
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-muted-foreground hover:text-foreground dark:hover:text-slate-200 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {terms.map((t) => {
                  const Icon = t.icon;
                  return (
                    <div
                      key={t.code}
                      className="p-4 rounded-2xl border border-border bg-muted/30 bg-muted/40 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon size={18} className="text-primary" />
                          <span className="font-black text-sm text-foreground">
                            {t.code} — {t.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 bg-primary/10 text-primary rounded-full">
                          {t.recommendedFor}
                        </span>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3 text-xs pt-1">
                        <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">
                            Seller Responsibility:
                          </span>
                          <p className="text-muted-foreground">{t.sellerDuty}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/10">
                          <span className="font-bold text-blue-600 dark:text-blue-400 block mb-0.5">
                            Buyer Responsibility:
                          </span>
                          <p className="text-muted-foreground">{t.buyerDuty}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-3.5 mt-6 bg-primary text-white rounded-2xl font-black text-xs hover:bg-primary/90 transition-all"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default IncotermsGuide;
