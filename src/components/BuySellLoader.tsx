"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Lock, Globe, Sparkles } from "lucide-react";

interface BuySellLoaderProps {
  message?: string;
  fullScreen?: boolean;
  size?: "sm" | "md" | "lg";
}

const TELEMETRY_STEPS = [
  "Initializing B2B Gateway...",
  "Securing Escrow Protection...",
  "Verifying Merchant Ledger...",
  "Connecting Wholesale Exchange...",
];

export function BuySellLoader({
  message,
  fullScreen = true,
  size = "md",
}: BuySellLoaderProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1) % TELEMETRY_STEPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const displayMessage = message || TELEMETRY_STEPS[currentStepIndex];

  const containerClasses = fullScreen
    ? "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xl transition-all"
    : "flex flex-col items-center justify-center p-8 w-full min-h-[320px] bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-800/80";

  return (
    <div className={containerClasses}>
      <div className="relative flex flex-col items-center justify-center max-w-sm w-full p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl shadow-blue-950/40 overflow-hidden select-none">
        
        {/* Ambient Radial Backdrop Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        {/* ── Central Interlocking Orbit Animation ── */}
        <div className="relative w-28 h-28 flex items-center justify-center mb-6">
          
          {/* Outer Orbital Ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-dashed border-blue-500/30"
          />

          {/* Glowing Counter-rotating Pulsing Ring */}
          <motion.div
            animate={{ rotate: -360, scale: [0.95, 1.05, 0.95] }}
            transition={{
              rotate: { duration: 8, repeat: Infinity, ease: "linear" },
              scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
            }}
            className="absolute inset-2 rounded-full border border-slate-700/60 bg-gradient-to-tr from-blue-500/10 via-transparent to-amber-500/10 shadow-[0_0_20px_rgba(37,99,235,0.15)]"
          />

          {/* Center Brand Icon Badge */}
          <motion.div
            animate={{ scale: [0.92, 1.04, 0.92] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-amber-500 p-0.5 shadow-lg shadow-blue-500/30 flex items-center justify-center"
          >
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center relative overflow-hidden">
              {/* Interlocking BuySell Symbol */}
              <div className="flex items-center justify-center gap-0.5">
                <span className="text-xl font-black text-white tracking-tighter">B</span>
                <span className="text-xl font-black text-amber-400 tracking-tighter -ml-1">S</span>
              </div>

              {/* Sparkle Dot */}
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]"
              />
            </div>
          </motion.div>

          {/* Orbital Satellite Dot */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 flex items-start justify-center"
          >
            <div className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_12px_#f59e0b] -mt-1.5" />
          </motion.div>
        </div>

        {/* ── Brand Title ── */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-xl font-black text-white tracking-tight">BuySell</span>
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Escrow B2B
          </span>
        </div>

        {/* ── Live Telemetry Message ── */}
        <div className="h-6 flex items-center justify-center mb-4">
          <AnimatePresence mode="wait">
            <motion.p
              key={displayMessage}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-xs font-bold text-slate-400 tracking-wide flex items-center gap-1.5"
            >
              <ShieldCheck size={14} className="text-emerald-400 shrink-0 animate-pulse" />
              <span>{displayMessage}</span>
            </motion.p>
          </AnimatePresence>
        </div>

        {/* ── High-Tech Shimmering Progress Bar ── */}
        <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden relative border border-slate-700/50">
          <motion.div
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-full h-full bg-gradient-to-r from-transparent via-blue-500 to-amber-400 rounded-full"
          />
        </div>

        {/* Security Subtext */}
        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-500">
          <Lock size={10} className="text-slate-400" /> 256-Bit Encrypted Trade Layer
        </div>

      </div>
    </div>
  );
}

export default BuySellLoader;
