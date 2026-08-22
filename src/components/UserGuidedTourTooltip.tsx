"use client";

import { useState, useEffect } from "react";
import { Sparkles, X, ChevronRight, LayoutDashboard, ArrowUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function UserGuidedTourTooltip() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!user) return;
    const hasSeenTour = localStorage.getItem("buysell_tour_seen_v1");
    if (!hasSeenTour) {
      const timer = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("buysell_tour_seen_v1", "true");
  };

  if (!show || !user) return null;

  return (
    <div className="fixed top-20 right-4 sm:right-12 z-[100] max-w-sm bg-card border border-primary/30 rounded-2xl shadow-2xl p-5 animate-in fade-in slide-in-from-top-4 duration-300">
      
      {/* Arrow pointing up towards top Navbar user profile badge */}
      <div className="absolute -top-2.5 right-12 w-5 h-5 bg-card border-t border-l border-primary/30 rotate-45" />

      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Sparkles size={18} />
          </div>
          <h4 className="font-extrabold text-sm text-foreground">
            Welcome to BuySell! 👋
          </h4>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 text-muted-foreground hover:text-foreground dark:hover:text-slate-200 rounded-lg"
        >
          <X size={16} />
        </button>
      </div>

      {step === 1 ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            You are now signed in! You can freely browse products and manufacturers across the site.
          </p>
          <div className="p-3 rounded-xl bg-muted/60 border border-border/60 flex items-center gap-2.5">
            <LayoutDashboard size={18} className="text-primary shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-foreground">Your Dashboard:</span> Click your name/avatar in the top header anytime to access your orders, RFQs, and settings.
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleDismiss}
              className="text-xs text-muted-foreground hover:underline"
            >
              Skip tour
            </button>
            <button
              onClick={() => setStep(2)}
              className="px-3.5 h-8 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 flex items-center gap-1 transition-all"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Ready to explore? Browse verified suppliers or request custom wholesale quotes anytime!
          </p>
          <div className="flex items-center gap-2 pt-1">
            <Link
              href="/marketplace"
              onClick={handleDismiss}
              className="flex-1 h-8 rounded-lg bg-muted text-foreground text-xs font-bold hover:bg-muted flex items-center justify-center transition-colors"
            >
              Browse Products
            </Link>
            <Link
              href="/dashboard"
              onClick={handleDismiss}
              className="flex-1 h-8 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 flex items-center justify-center transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
