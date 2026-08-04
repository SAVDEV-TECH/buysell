import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { LanguageProvider } from "@/context/LanguageContext";
import MainLayoutShell from "@/components/MainLayoutShell";
import PwaRegister from "@/components/PwaRegister";
import GoogleOneTap from "@/components/GoogleOneTap";
import LiveNotificationToast from "@/components/LiveNotificationToast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "arial"],
});

export const metadata: Metadata = {
  title: "BuySell | Modern B2B Trading & Marketplace Exchange",
  description: "Connecting manufacturers, suppliers, and wholesale buyers in one seamless platform.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BuySell",
  },
};

export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

import CookieConsentBanner from "@/components/CookieConsentBanner";
import FloatingFeedbackModal from "@/components/FloatingFeedbackModal";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased overflow-x-hidden w-full flex flex-col min-h-screen relative`}>
        <LanguageProvider>
          <CurrencyProvider>
            <AuthProvider>
              <NotificationProvider>
                <CartProvider>
                  <MainLayoutShell>{children}</MainLayoutShell>
                  <PwaRegister />
                  <GoogleOneTap />
                  <LiveNotificationToast />
                  <CookieConsentBanner />
                  <FloatingFeedbackModal />
                </CartProvider>
              </NotificationProvider>
            </AuthProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
