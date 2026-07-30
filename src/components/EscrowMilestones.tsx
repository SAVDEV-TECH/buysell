"use client";

import React, { useState } from "react";
import { Lock, CheckCircle2, Clock, ShieldCheck, ArrowUpRight, DollarSign, Layers } from "lucide-react";
import { motion } from "framer-motion";

interface Milestone {
  id: string;
  title: string;
  percentage: number;
  amount: number;
  status: "pending" | "funded" | "released" | "disputed";
  trigger_event: string;
}

interface EscrowMilestonesProps {
  orderId: string;
  totalAmount: number;
  currency?: string;
  isBuyer?: boolean;
  isSupplier?: boolean;
  onMilestoneReleased?: () => void;
}

export default function EscrowMilestones({
  orderId,
  totalAmount,
  currency = "USD",
  isBuyer = false,
  isSupplier = false,
  onMilestoneReleased,
}: EscrowMilestonesProps) {
  // Default B2B Milestone Split (30% Upfront Production Deposit, 70% Final Delivery Release)
  const defaultMilestones: Milestone[] = [
    {
      id: "m1",
      title: "Production Start Deposit (30%)",
      percentage: 30,
      amount: totalAmount * 0.3,
      status: "released",
      trigger_event: "order_confirmed",
    },
    {
      id: "m2",
      title: "Final Delivery & QA Inspection (70%)",
      percentage: 70,
      amount: totalAmount * 0.7,
      status: "funded",
      trigger_event: "delivery_confirmed",
    },
  ];

  const [milestones, setMilestones] = useState<Milestone[]>(defaultMilestones);

  const totalReleased = milestones
    .filter((m) => m.status === "released")
    .reduce((acc, m) => acc + m.amount, 0);

  const releasedPercent = Math.round((totalReleased / (totalAmount || 1)) * 100);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20 flex items-center gap-1">
              <ShieldCheck size={12} /> B2B Milestone Release Terms
            </span>
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
            Escrow Payment Disbursements
          </h3>
        </div>

        <div className="text-right">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Total Released</p>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            ${totalReleased.toLocaleString(undefined, { minimumFractionDigits: 2 })} / ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-bold">
          <span className="text-slate-600 dark:text-slate-400">Escrow Milestone Progress</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-black">{releasedPercent}% Released</span>
        </div>
        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${releasedPercent}%` }}
            transition={{ duration: 0.8 }}
            className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full"
          />
        </div>
      </div>

      {/* Milestone List */}
      <div className="space-y-3">
        {milestones.map((m, idx) => (
          <div
            key={m.id}
            className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              m.status === "released"
                ? "bg-emerald-500/5 border-emerald-500/30"
                : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${m.status === "released" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-slate-200 dark:bg-slate-700 text-slate-500"}`}>
                {m.status === "released" ? <CheckCircle2 size={18} /> : <Lock size={18} />}
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  Milestone #{idx + 1}: {m.title}
                </p>
                <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                  Trigger: {m.trigger_event.replace("_", " ")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-sm font-black text-slate-900 dark:text-white">
                ${m.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>

              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                m.status === "released"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              }`}>
                {m.status === "released" ? "Released" : "Escrow Locked"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
