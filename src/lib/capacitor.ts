"use client";

/**
 * src/lib/capacitor.ts
 *
 * Native bridge utilities for BuySell on Android & iOS via Capacitor.
 *
 * All functions gracefully degrade to web fallbacks when running in a
 * browser, so the same code works across web, Android, and iOS.
 */

import { Capacitor } from "@capacitor/core";

// ─── Runtime Detection ────────────────────────────────────────────────────────

/** Returns true when running inside a Capacitor native app (Android or iOS). */
export const isNative = (): boolean => Capacitor.isNativePlatform();

/** Returns "android" | "ios" | "web" */
export const getPlatform = (): string => Capacitor.getPlatform();

// ─── Push Notifications ───────────────────────────────────────────────────────

/**
 * Requests push notification permission and registers the device.
 * Call this after the user logs in.
 *
 * @returns FCM / APNs device token, or null on web/permission denied.
 */
export async function registerPushNotifications(): Promise<string | null> {
  if (!isNative()) return null;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const result = await PushNotifications.requestPermissions();
    if (result.receive !== "granted") return null;

    await PushNotifications.register();

    return new Promise((resolve) => {
      PushNotifications.addListener("registration", (token) => {
        console.log("[BuySell] Push token:", token.value);
        resolve(token.value);
      });
      PushNotifications.addListener("registrationError", (err) => {
        console.error("[BuySell] Push registration error:", err);
        resolve(null);
      });
    });
  } catch (err) {
    console.error("[BuySell] Push Notifications not available:", err);
    return null;
  }
}

/** Listen for incoming push notifications while the app is in the foreground. */
export async function listenForPushNotifications(
  onReceive: (notification: { title?: string; body?: string; data?: Record<string, unknown> }) => void
) {
  if (!isNative()) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      onReceive({
        title: notification.title,
        body: notification.body,
        data: notification.data as Record<string, unknown>,
      });
    });
  } catch (err) {
    console.error("[BuySell] Push listener error:", err);
  }
}

// ─── Camera / File Picker ─────────────────────────────────────────────────────

/**
 * Opens the native camera or photo library and returns a base64 image string.
 * Falls back to <input type="file"> on web.
 */
export async function pickProductImage(
  source: "camera" | "photos" = "photos"
): Promise<string | null> {
  if (!isNative()) {
    // Web fallback — caller should use a file input element instead.
    return null;
  }

  try {
    const { Camera, CameraResultType, CameraSource } = await import(
      "@capacitor/camera"
    );

    const image = await Camera.getPhoto({
      resultType: CameraResultType.Base64,
      source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
      quality: 85,
      allowEditing: false,
      width: 1200,
      correctOrientation: true,
    });

    return image.base64String ? `data:image/jpeg;base64,${image.base64String}` : null;
  } catch (err) {
    console.error("[BuySell] Camera error:", err);
    return null;
  }
}

// ─── Status Bar ───────────────────────────────────────────────────────────────

/** Sets the native status bar to match BuySell's brand color. */
export async function configureBrandStatusBar(isDark: boolean) {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: "#0ea5e9" });
  } catch (err) {
    console.error("[BuySell] StatusBar error:", err);
  }
}

// ─── Haptics ─────────────────────────────────────────────────────────────────

/**
 * Triggers a native haptic feedback pulse.
 * type: "light" | "medium" | "heavy" | "success" | "warning" | "error"
 */
export async function haptic(type: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "light") {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
    if (type === "success") {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (type === "warning") {
      await Haptics.notification({ type: NotificationType.Warning });
    } else if (type === "error") {
      await Haptics.notification({ type: NotificationType.Error });
    } else {
      const style =
        type === "heavy" ? ImpactStyle.Heavy :
        type === "medium" ? ImpactStyle.Medium :
        ImpactStyle.Light;
      await Haptics.impact({ style });
    }
  } catch (err) {
    console.error("[BuySell] Haptics error:", err);
  }
}

// ─── Network Detection ────────────────────────────────────────────────────────

/**
 * Returns current network connectivity status.
 * Falls back to navigator.onLine on web.
 */
export async function isOnline(): Promise<boolean> {
  if (!isNative()) return navigator.onLine;
  try {
    const { Network } = await import("@capacitor/network");
    const status = await Network.getStatus();
    return status.connected;
  } catch {
    return navigator.onLine;
  }
}

// ─── External Browser ─────────────────────────────────────────────────────────

/**
 * Opens a URL in the native in-app browser (SFSafariViewController / Chrome Custom Tab).
 * Used for Paystack / Flutterwave payment redirects on mobile.
 */
export async function openInAppBrowser(url: string) {
  if (!isNative()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url, presentationStyle: "popover" });
  } catch (err) {
    console.error("[BuySell] Browser error:", err);
    window.open(url, "_blank");
  }
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────

/**
 * Listens for the app being resumed from background.
 * Use to refresh stale data (e.g. order status, FX rates).
 */
export async function onAppResume(callback: () => void) {
  if (!isNative()) return;
  try {
    const { App } = await import("@capacitor/app");
    App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) callback();
    });
  } catch (err) {
    console.error("[BuySell] App lifecycle error:", err);
  }
}
