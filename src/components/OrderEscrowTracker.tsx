"use client";

import React from "react";
import { ShieldCheck, Lock, Package, Truck, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface OrderEscrowTrackerProps {
  order: any;
}

export function OrderEscrowTracker({ order }: OrderEscrowTrackerProps) {
  if (!order) return null;

  const status = (order.status || "pending").toLowerCase();
  const paymentStatus = (order.payment_status || "pending").toLowerCase();

  // Define 5-Stage Milestone Rules
  const stages = [
    {
      id: "contract",
      title: "Contract Placed",
      subtitle: "Order initialized",
      icon: ShieldCheck,
      completed: true,
      active: status === "pending" && paymentStatus === "pending",
    },
    {
      id: "escrow",
      title: "Escrow Locked",
      subtitle: paymentStatus === "paid" || paymentStatus === "escrow_held" || paymentStatus === "escrow_released" ? "Funds Secured in Escrow" : "Awaiting Deposit",
      icon: Lock,
      completed: ["paid", "escrow_held", "escrow_released"].includes(paymentStatus) || ["processing", "shipped", "delivered", "completed"].includes(status),
      active: status === "pending" && ["paid", "escrow_held"].includes(paymentStatus),
    },
    {
      id: "production",
      title: "Manufacturing & QA",
      subtitle: "Factory production & inspection",
      icon: Package,
      completed: ["processing", "shipped", "delivered", "completed"].includes(status),
      active: status === "processing",
    },
    {
      id: "logistics",
      title: "Cargo Dispatched",
      subtitle: order.courier_name ? `${order.courier_name}` : "Carriers & Shipping",
      icon: Truck,
      completed: ["shipped", "delivered", "completed"].includes(status),
      active: status === "shipped",
    },
    {
      id: "released",
      title: "Delivered & Released",
      subtitle: paymentStatus === "escrow_released" ? "Escrow Payout Complete" : "Destination Inspection",
      icon: CheckCircle2,
      completed: status === "delivered" || status === "completed" || paymentStatus === "escrow_released",
      active: status === "delivered" && paymentStatus !== "escrow_released",
    },
  ];

  // Calculate overall progress percentage
  const completedCount = stages.filter((s) => s.completed).length;
  const progressPercent = Math.min(100, Math.max(10, ((completedCount - 1) / (stages.length - 1)) * 100));

  return (
    <div className="w-full bg-card rounded-3xl border border-border p-6 md:p-8 space-y-6">
      
      {/* Tracker Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <span className="text-[10px] font-mono font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
            <Lock size={12} className="text-emerald-500" /> BUYSELL ESCROW PROTECTION ENFORCED
          </span>
          <h2 className="text-xl font-black text-foreground mt-1">
            B2B Trade Fulfillment Timeline
          </h2>
        </div>
        <div className="px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-black flex items-center gap-2">
          <Clock size={14} className="animate-spin" />
          <span>Stage {completedCount} of 5: {stages[completedCount - 1]?.title || "Active"}</span>
        </div>
      </div>

      {/* Visual Timeline Nodes */}
      <div className="relative pt-6 pb-4">
        
        {/* Connector Line Background */}
        <div className="absolute top-12 left-8 right-8 h-1.5 bg-muted rounded-full hidden md:block -z-0" />

        {/* Animated Active Progress Line */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute top-12 left-8 h-1.5 bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500 rounded-full hidden md:block z-0"
        />

        {/* 5 Milestone Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-2 relative z-10">
          {stages.map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <div key={stage.id} className="flex flex-row md:flex-col items-center md:items-center text-left md:text-center gap-4 md:gap-3">
                
                {/* Node Circle */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md flex-shrink-0 ${
                    stage.completed
                      ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/20 ring-4 ring-emerald-500/10"
                      : stage.active
                      ? "bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-blue-500/30 ring-4 ring-blue-500/20 animate-pulse"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  <Icon size={20} />
                </motion.div>

                {/* Node Details */}
                <div>
                  <h4 className={`text-xs font-black tracking-tight ${
                    stage.completed || stage.active ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {stage.title}
                  </h4>
                  <p className="text-[10px] font-bold text-muted-foreground mt-0.5 leading-tight">
                    {stage.subtitle}
                  </p>
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

export default OrderEscrowTracker;
