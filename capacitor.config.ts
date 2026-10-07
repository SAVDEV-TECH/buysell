import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.savdev.buysell",
  appName: "BuySell",
  webDir: "out",

  // The native WebView loads the live Vercel deployment directly.
  // This means all API routes, SSR, and auth work exactly as on web —
  // no static export required. Change the url if you get a custom domain.
  server: {
    url: "https://buysell-ebon.vercel.app",
    cleartext: false,
    androidScheme: "https",
    iosScheme: "https",
    allowNavigation: [
      "*.supabase.co",
      "*.vercel.app",
      "api.paystack.co",
      "api.flutterwave.com",
      "accounts.google.com",
      "buysell-ai-agent-production.up.railway.app",
    ],
  },

  android: {
    buildOptions: {
      releaseType: "APK",
    },
    // Allows cleartext HTTP only in debug. Production enforces HTTPS.
    allowMixedContent: false,
    // Use Material You dynamic color (Android 12+)
    useLegacyBridge: false,
  },

  ios: {
    contentInset: "always",
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
    preferredContentMode: "mobile",
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: "#0ea5e9",   // BuySell primary brand color
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0ea5e9",
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Camera: {
      // Allow camera access for product image uploads
    },
  },
};

export default config;
