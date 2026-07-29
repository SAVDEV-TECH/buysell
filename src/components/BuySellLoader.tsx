"use client";

import React from "react";
import { motion } from "framer-motion";

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
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md"
    : "flex flex-col items-center justify-center p-8 w-full min-h-[300px]";

  const dimensions = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-36 h-36",
  };

  return (
    <div className={containerClasses}>
      <div className="relative flex flex-col items-center justify-center select-none">
        
        {/* Animated Glow Rings Background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-500/20 via-sky-500/20 to-orange-500/20 blur-xl"
          />
        </div>

        {/* Logo Container with 3D Animated S */}
        <div className={`relative ${dimensions[size]} flex items-center justify-center mb-6`}>
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-xl"
          >
            <defs>
              {/* Blue Gradient for 'B' */}
              <linearGradient id="loaderBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e3a8a" />
                <stop offset="50%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>

              {/* Terracotta/Orange Gradient for 'S' */}
              <linearGradient id="loaderOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="60%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#c2410c" />
              </linearGradient>
            </defs>

            {/* Letter 'B' (Anchored & Pulsing) */}
            <motion.path
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              d="M 18 12 H 42 C 54 12 62 18 62 28 C 62 35 56 40 48 43 C 58 46 65 52 65 64 C 65 76 55 84 40 84 H 18 V 12 Z M 32 24 V 40 H 40 C 46 40 50 36 50 32 C 50 28 46 24 40 24 H 32 Z M 32 50 V 72 H 42 C 48 72 53 67 53 61 C 53 55 48 50 42 50 H 32 Z"
              fill="url(#loaderBlueGrad)"
            />

            {/* Letter 'S' (Smoothly Rotating as requested!) */}
            <g className="origin-[60px_45px]">
              <motion.g
                animate={{ rotate: 360 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
                style={{ transformOrigin: "60px 45px" }}
              >
                <path
                  d="M 78 26 C 72 18 62 16 52 19 C 48 20 44 23 44 28 C 44 34 50 37 57 39 L 65 42 C 77 45 84 52 84 63 C 84 76 71 85 54 84 C 41 83 32 75 28 66 L 38 59 C 41 66 48 72 57 72 C 64 72 70 68 70 62 C 70 56 64 53 56 50 L 48 48 C 36 44 30 38 30 27 C 30 15 44 6 60 7 C 71 8 80 15 84 22 L 78 26 Z"
                  fill="url(#loaderOrangeGrad)"
                />
              </motion.g>
            </g>
          </svg>
        </div>

        {/* Text 'buysell' & Tagline */}
        <div className="flex flex-col items-center">
          <div className="text-2xl md:text-3xl font-black tracking-tight mb-1">
            <span className="text-slate-900 dark:text-white">buy</span>
            <span className="text-amber-600 dark:text-amber-500 font-semibold">sell</span>
          </div>

          <p className="text-xs font-bold text-muted-foreground animate-pulse tracking-wide mb-3">
            {message}
          </p>

          {/* Animated Loading Bar */}
          <div className="w-36 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
            <motion.div
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-full h-full bg-gradient-to-r from-blue-600 to-orange-500 rounded-full"
            />
          </div>
        </div>

      </div>
    </div>
  );
}

export default BuySellLoader;
