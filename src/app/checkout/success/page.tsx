"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Package,
  ArrowRight,
  ShoppingBag,
  ShieldCheck,
  Bell,
  ExternalLink,
  FileText
} from "lucide-react";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || "BS-ORD-" + Math.floor(100000 + Math.random() * 900000);
  const ref = searchParams.get("ref") || "buysell-tx-" + Date.now();

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="max-w-xl w-full bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-8 md:p-12 text-center relative overflow-hidden"
      >
        {/* Top Glow Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-green-500/10 blur-3xl rounded-full" />

        {/* Animated Checkmark Badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 text-white flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/30"
        >
          <CheckCircle2 size={48} />
        </motion.div>

        {/* Headline & Subhead */}
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
          Order Confirmed!
        </h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8">
          Thank you for your wholesale order. Payment has been secured in escrow and your order has been sent to the supplier.
        </p>

        {/* Order Details Card */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 text-left space-y-3 mb-8">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Order ID</span>
            <span className="text-sm font-extrabold text-primary font-mono">{orderId}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Payment Reference</span>
            <span className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate max-w-[200px]">{ref}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck size={12} /> Processing (Escrow Paid)
            </span>
          </div>
        </div>

        {/* Realtime Alert Box */}
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-left flex items-start gap-3 mb-8">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5">
            <Bell size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Real-Time Notification Sent</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Check your dashboard notification stream to track order fulfillment updates live.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard/orders"
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-primary text-white font-bold text-base shadow-xl shadow-primary/25 hover:bg-primary/90 hover:scale-105 transition-all"
          >
            <Package size={18} /> View Order Details
          </Link>
          <Link
            href="/marketplace"
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-base"
          >
            <ShoppingBag size={18} /> Return to Marketplace
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[85vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
