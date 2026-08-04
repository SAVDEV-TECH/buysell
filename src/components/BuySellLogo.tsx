"use client";

import React from "react";

interface BuySellLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  className?: string;
  isAnimated?: boolean;
  hideTextOnMobile?: boolean;
}

export function BuySellLogo({
  size = "md",
  showTagline = true,
  className = "",
  isAnimated = false,
  hideTextOnMobile = false,
}: BuySellLogoProps) {
  // Dimensions
  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };

  const titleSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
    xl: "text-5xl",
  };

  const taglineSizes = {
    sm: "text-[7px]",
    md: "text-[9px]",
    lg: "text-[11px]",
    xl: "text-[14px]",
  };

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <div className="flex items-center gap-2.5">
        {/* Interlocking BS Vector Icon */}
        <div className={`relative ${iconSizes[size]} flex-shrink-0 flex items-center justify-center`}>
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-md"
          >
            <defs>
              {/* Blue Gradient for 'B' */}
              <linearGradient id="bsBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e3a8a" />
                <stop offset="50%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>

              {/* Terracotta/Orange Gradient for 'S' */}
              <linearGradient id="bsOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="60%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#c2410c" />
              </linearGradient>

              {/* Shadow Overlay */}
              <filter id="bsShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.2" />
              </filter>
            </defs>

            {/* Letter 'B' Path */}
            <g className={isAnimated ? "animate-pulse" : ""}>
              <path
                d="M 18 12 H 42 C 54 12 62 18 62 28 C 62 35 56 40 48 43 C 58 46 65 52 65 64 C 65 76 55 84 40 84 H 18 V 12 Z M 32 24 V 40 H 40 C 46 40 50 36 50 32 C 50 28 46 24 40 24 H 32 Z M 32 50 V 72 H 42 C 48 72 53 67 53 61 C 53 55 48 50 42 50 H 32 Z"
                fill="url(#bsBlueGrad)"
              />
            </g>

            {/* Letter 'S' Path (Interlocking & Rotatable) */}
            <g className={isAnimated ? "origin-[62px_48px] animate-spin" : ""}>
              <path
                d="M 78 26 C 72 18 62 16 52 19 C 48 20 44 23 44 28 C 44 34 50 37 57 39 L 65 42 C 77 45 84 52 84 63 C 84 76 71 85 54 84 C 41 83 32 75 28 66 L 38 59 C 41 66 48 72 57 72 C 64 72 70 68 70 62 C 70 56 64 53 56 50 L 48 48 C 36 44 30 38 30 27 C 30 15 44 6 60 7 C 71 8 80 15 84 22 L 78 26 Z"
                fill="url(#bsOrangeGrad)"
              />
            </g>
          </svg>
        </div>

        {/* Text 'buysell' - Hidden on mobile if hideTextOnMobile is true */}
        <div className={`flex flex-col ${hideTextOnMobile ? "hidden sm:flex" : ""}`}>
          <span className={`font-black tracking-tight leading-none ${titleSizes[size]}`}>
            <span className="text-slate-900 dark:text-white">buy</span>
            <span className="text-slate-600 dark:text-slate-400 font-semibold">sell</span>
          </span>
        </div>
      </div>

      {/* Tagline */}
      {showTagline && (
        <span
          className={`font-extrabold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 mt-1 ${taglineSizes[size]}`}
        >
          Trading | Marketplace | Exchange
        </span>
      )}
    </div>
  );
}

export default BuySellLogo;
