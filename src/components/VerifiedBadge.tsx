"use client";

import React, { useState } from "react";
import { CheckCircle2, ShieldCheck, FileCheck, Building2, Award, X, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VerifiedBadgeProps {
  className?: string;
  showText?: boolean;
  supplierName?: string;
}

export const VerifiedBadge = ({
  className = "",
  showText = false,
  supplierName = "Verified Supplier",
}: VerifiedBadgeProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={`inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full text-xs font-semibold border border-blue-200 dark:border-blue-800 hover:scale-105 active:scale-95 transition-all cursor-pointer ${className}`}
        title="Click to view KYB Verification Certificate"
      >
        <CheckCircle2 size={14} className="fill-blue-600 text-white dark:fill-blue-500" />
        {showText && <span>Verified</span>}
      </button>

      {/* KYB Verification & Trust Modal */}
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
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-borderline z-50 p-6 md:p-8"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                    <ShieldCheck size={26} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                      BUYSELL TRUST CERTIFICATE
                    </span>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      Verified Business Record
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-borderline">
                  <p className="text-xs text-muted-foreground font-bold">Company Name</p>
                  <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                    {supplierName}
                  </p>
                  <span className="inline-block mt-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded-full border border-emerald-500/20 uppercase tracking-wider">
                    ★ Gold Level Export Supplier
                  </span>
                </div>

                <div className="space-y-2.5 pt-2">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                    Audited Verification Checklist
                  </p>

                  <div className="space-y-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                      <FileCheck size={16} className="text-blue-600 flex-shrink-0" />
                      <span>CAC / RGD Corporate Registration Verified</span>
                    </div>

                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                      <Building2 size={16} className="text-blue-600 flex-shrink-0" />
                      <span>Physical Factory Inspection Passed</span>
                    </div>

                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                      <Award size={16} className="text-blue-600 flex-shrink-0" />
                      <span>ISO 9001 / SGS Quality Export License</span>
                    </div>

                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                      <Lock size={16} className="text-emerald-600 flex-shrink-0" />
                      <span>100% Escrow Payment Guarantee Eligible</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full py-3.5 mt-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs hover:opacity-90 transition-all"
                >
                  Close Verification View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VerifiedBadge;
