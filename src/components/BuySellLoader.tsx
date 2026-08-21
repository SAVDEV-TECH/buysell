"use client";

import React from "react";

interface BuySellLoaderProps {
  message?: string;
  fullScreen?: boolean;
  size?: "sm" | "md" | "lg";
}

export function BuySellLoader({
  message = "Loading...",
  fullScreen = true,
}: BuySellLoaderProps) {

  // ── Full-screen credential check (admin gate, auth etc.) ──
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5">
          {/* Thin progress bar */}
          <div className="w-48 h-0.5 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-loader-bar" />
          </div>
          <p className="text-xs text-muted-foreground font-medium">{message}</p>
        </div>
      </div>
    );
  }

  // ── Inline skeleton loader (dashboard panels, tables, etc.) ──
  return (
    <div className="w-full space-y-4 p-1 animate-pulse">
      {/* Top bar skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-48 bg-muted rounded-lg" />
        <div className="h-8 w-24 bg-muted rounded-lg" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="h-7 w-7 bg-muted rounded-lg" />
            <div className="h-7 w-16 bg-muted rounded" />
            <div className="h-3 w-24 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="h-4 w-32 bg-muted rounded" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-t border-border">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="flex-1 h-4 bg-muted rounded" />
              <div className="h-4 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="h-4 w-24 bg-muted rounded" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-t border-border">
              <div className="h-4 w-4 bg-muted rounded" />
              <div className="flex-1 h-4 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BuySellLoader;
