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
  title: "BuySell | The Modern Marketplace",
  description: "Connecting manufacturers and wholesalers in one seamless platform.",
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
                </CartProvider>
              </NotificationProvider>
            </AuthProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
