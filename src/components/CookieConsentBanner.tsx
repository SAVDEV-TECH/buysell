"use client";

import { useState, useEffect } from "react";
import { Cookie, Shield, Check, X, Sliders, Lock, Info, ExternalLink } from "lucide-react";
import Link from "next/link";

interface CookiePreferences {
  necessary: boolean; // Always true
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const STORAGE_KEY = "buysell_cookie_consent_v1";

export default function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: true,
    marketing: false,
    timestamp: "",
  });

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      // Delay banner display slightly for smooth entrance animation
      const timer = setTimeout(() => setShowBanner(true), 800);
      return () => clearTimeout(timer);
    } else {
      try {
        const parsed = JSON.parse(saved);
        setPreferences(parsed);
      } catch {
        setShowBanner(true);
      }
    }
  }, []);

  // Listen for custom event to re-open cookie preferences from footer or settings
  useEffect(() => {
    const handleReopen = () => {
      setShowModal(true);
    };
    window.addEventListener("openBuySellCookiePreferences", handleReopen);
    return () => window.removeEventListener("openBuySellCookiePreferences", handleReopen);
  }, []);

  const saveConsent = (updated: CookiePreferences) => {
    const payload = {
      ...updated,
      necessary: true,
      timestamp: new Date().toISOString(),
    };
    setPreferences(payload);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setShowBanner(false);
    setShowModal(false);
  };

  const handleAcceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: "",
    });
  };

  const handleAcceptNecessary = () => {
    saveConsent({
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: "",
    });
  };

  const handleSaveCustom = () => {
    saveConsent(preferences);
  };

  if (!mounted) return null;

  return (
    <>
      {/* ── Floating Consent Banner ────────────────────────────────────────── */}
      {showBanner && !showModal && (
        <div
          role="region"
          aria-label="Cookie Consent"
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[100] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-2xl p-5 md:p-6 transition-all animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
              <Cookie size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                We Value Your Privacy
                <Shield size={14} className="text-emerald-500 shrink-0" />
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                BuySell uses essential cookies for secure login and trade escrow. We also use optional analytical cookies to improve platform performance.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center gap-2">
            <button
              onClick={handleAcceptAll}
              className="w-full sm:flex-1 h-9 px-4 rounded-xl bg-primary text-white text-xs font-black hover:bg-primary/90 transition-all shadow-md shadow-primary/20 active:scale-[0.98]"
            >
              Accept All
            </button>
            <button
              onClick={handleAcceptNecessary}
              className="w-full sm:flex-1 h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-all active:scale-[0.98]"
            >
              Essential Only
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors"
              title="Customize Preferences"
            >
              <Sliders size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ── Preferences Modal ────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-[110] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Sliders size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Cookie Preferences
                  </h3>
                  <p className="text-xs text-muted-foreground">Manage your privacy settings for BuySell</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              
              {/* Category 1: Essential */}
              <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Lock size={15} className="text-emerald-500" />
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      Strictly Necessary Cookies
                    </h4>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Always Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Required for basic site navigation, secure buyer/supplier authentication, cart persistence, and escrow trade processing. Cannot be disabled.
                  </p>
                </div>
              </div>

              {/* Category 2: Analytics */}
              <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    Analytics & Performance
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Allows us to count visits and traffic sources so we can measure and improve marketplace load speed and search performance.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreferences((p) => ({ ...p, analytics: !p.analytics }))}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 mt-1 ${
                    preferences.analytics ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      preferences.analytics ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Category 3: Marketing */}
              <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    Marketing & Personalization
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Used to deliver customized trade notifications and relevant manufacturer product recommendations tailored to your sourcing interests.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreferences((p) => ({ ...p, marketing: !p.marketing }))}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 mt-1 ${
                    preferences.marketing ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      preferences.marketing ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
              <button
                onClick={handleAcceptAll}
                className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:underline"
              >
                Accept All
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAcceptNecessary}
                  className="px-4 h-9 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Essential Only
                </button>
                <button
                  onClick={handleSaveCustom}
                  className="px-5 h-9 rounded-xl bg-primary text-white text-xs font-black hover:bg-primary/90 transition-all shadow-md shadow-primary/20 active:scale-[0.98]"
                >
                  Save Preferences
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
