"use client";

/**
 * src/hooks/useCapacitor.ts
 *
 * React hook that initializes native Capacitor features when the app
 * mounts on Android / iOS. Safe to use on web — all calls are no-ops.
 *
 * Usage:
 *   const { isNative, platform, pickImage } = useCapacitor();
 */

import { useEffect, useState, useCallback } from "react";
import {
  isNative as checkNative,
  getPlatform,
  configureBrandStatusBar,
  onAppResume,
  registerPushNotifications,
  pickProductImage,
  haptic,
  openInAppBrowser,
  isOnline,
} from "@/lib/capacitor";

interface UseCapacitorReturn {
  /** Whether the app is running inside a Capacitor native container */
  isNative: boolean;
  /** "android" | "ios" | "web" */
  platform: string;
  /** Whether the device currently has an internet connection */
  online: boolean;
  /** Native push notification device token (null on web) */
  pushToken: string | null;
  /** Pick a product image from the native camera or photo library */
  pickImage: (source?: "camera" | "photos") => Promise<string | null>;
  /** Trigger a native haptic pulse */
  haptic: typeof haptic;
  /** Open a URL in the native in-app browser (Paystack / Flutterwave safe) */
  openBrowser: (url: string) => Promise<void>;
}

export function useCapacitor(): UseCapacitorReturn {
  const [native] = useState(() => checkNative());
  const [platform] = useState(() => getPlatform());
  const [online, setOnline] = useState(true);
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    if (!native) return;

    // 1. Configure brand-coloured status bar
    configureBrandStatusBar(false);

    // 2. Register push notifications and store token
    registerPushNotifications().then((token) => {
      if (token) setPushToken(token);
    });

    // 3. Check initial connectivity
    isOnline().then(setOnline);

    // 4. Refresh data when app resumes from background
    onAppResume(() => {
      isOnline().then(setOnline);
    });

    // 5. Listen for web-level online/offline events as fallback
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [native]);

  const pickImage = useCallback(
    (source: "camera" | "photos" = "photos") => pickProductImage(source),
    []
  );

  return {
    isNative: native,
    platform,
    online,
    pushToken,
    pickImage,
    haptic,
    openBrowser: openInAppBrowser,
  };
}
