"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";

import AISourcingAssistant from "@/components/AISourcingAssistant";

export default function MainLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute) {
    // Admin pages get full-width, no navbar, no footer, no mobile nav
    return <>{children}</>;
  }

  return (
    <>
      <Suspense fallback={<header className="sticky top-0 z-50 w-full h-16 bg-background/95 border-b border-border" />}>
        <Navbar />
      </Suspense>
      <CartDrawer />
      <main className="flex-1 pb-24 md:pb-0">{children}</main>
      <Footer />
      <MobileBottomNav />
      <AISourcingAssistant />
    </>
  );
}
