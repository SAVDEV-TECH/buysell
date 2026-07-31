"use client";

import React from "react";
import { motion } from "framer-motion";
import { BuySellLogo } from "@/components/BuySellLogo";

interface BuySellLoaderProps {
  message?: string;
  fullScreen?: boolean;
  size?: "sm" | "md" | "lg";
}

export function BuySellLoader({
  message = "Loading...",
  fullScreen = true,
  size = "md",
}: BuySellLoaderProps) {
  const containerClasses = fullScreen
    ? "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xl transition-all select-none"
    : "flex flex-col items-center justify-center p-8 w-full min-h-[280px] bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-800/80 select-none";

  return (
    <div className={containerClasses}>
      <div className="relative flex flex-col items-center justify-center max-w-sm w-full p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl shadow-blue-950/30 overflow-hidden">
        
        {/* Ambient Subtle Glow */}
        <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Static Official BuySell Vector Logo (NO Turning / NO Spinning) */}
        <div className="mb-6 scale-110">
          <BuySellLogo size="md" showTagline={false} />
        </div>

        {/* Message */}
        <p className="text-xs font-bold text-slate-300 tracking-wide mb-5 text-center">
          {message}
        </p>

        {/* ── 3 Contrasting Dots Wave Animation ── */}
        <div className="flex items-center gap-2.5">
          {/* Dot 1 - Primary Blue */}
          <motion.div
            animate={{
              y: [0, -10, 0],
              scale: [1, 1.25, 1],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0,
            }}
            className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]"
          />

          {/* Dot 2 - Sky / Indigo */}
          <motion.div
            animate={{
              y: [0, -10, 0],
              scale: [1, 1.25, 1],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.2,
            }}
            className="w-3 h-3 rounded-full bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.8)]"
          />

          {/* Dot 3 - Vibrant Amber */}
          <motion.div
            animate={{
              y: [0, -10, 0],
              scale: [1, 1.25, 1],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.4,
            }}
            className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]"
          />
        </div>

      </div>
    </div>
  );
}

export default BuySellLoader;
