"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  hideSplashScreen,
  setupBackButtonListener,
  configureBrandStatusBar,
  registerPushNotifications,
  haptic,
} from "@/lib/capacitor";
import { WifiOff, RotateCcw } from "lucide-react";

/**
 * NativeAppManager
 * Handles native mobile lifecycle on Android & iOS:
 * - Dismisses the native splash screen smoothly once the app mounts
 * - Intercepts the physical Android Back Button for safe navigation (prevents app closure)
 * - Detects network offline states and shows a quick recovery banner
 */
export default function NativeAppManager() {
  const { user } = useAuth();
  const [showExitToast, setShowExitToast] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // 1. Request and register push notifications when user logs in
  useEffect(() => {
    if (user) {
      registerPushNotifications().then((token) => {
        if (token) {
          console.log("[BuySell] Native push registered:", token);
        }
      });
    }
  }, [user]);

  useEffect(() => {
    // 1. Configure status bar style
    configureBrandStatusBar(false);

    // 2. Smoothly dismiss native splash screen once React client-mounts
    const splashTimer = setTimeout(() => {
      hideSplashScreen();
    }, 250);

    // 3. Setup Android hardware back button handler
    let removeBackListener: (() => void) | undefined;
    setupBackButtonListener(() => {
      // Triggered when user is at root `/` and presses back
      haptic("light");
      setShowExitToast(true);
      setTimeout(() => setShowExitToast(false), 2000);
    }).then((cleanup) => {
      removeBackListener = cleanup;
    });

    // 4. Online/offline detection
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      haptic("warning");
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOffline(!navigator.onLine);

    return () => {
      clearTimeout(splashTimer);
      if (removeBackListener) removeBackListener();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <>
      {/* Android double-press exit toast */}
      {showExitToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 rounded-full bg-slate-900/95 text-white text-xs font-semibold shadow-2xl backdrop-blur-md border border-white/10 pointer-events-none transition-all">
          Press back again to exit BuySell
        </div>
      )}

      {/* Offline Alert Bar */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <WifiOff size={14} className="animate-pulse" />
            <span>You are offline. Please check your internet connection.</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1 bg-slate-950/20 active:bg-slate-950/30 px-2 py-0.5 rounded text-[11px] font-extrabold uppercase tracking-wide transition-colors"
          >
            <RotateCcw size={12} />
            Retry
          </button>
        </div>
      )}
    </>
  );
}
