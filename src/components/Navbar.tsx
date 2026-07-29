"use client";

import Link from "next/link";
import { Search, MessageSquare, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import CurrencySelector from "./CurrencySelector";
import LanguageSwitcher from "./LanguageSwitcher";
import { BuySellLogo } from "@/components/BuySellLogo";

const Navbar = () => {
  const { user, profile } = useAuth();
  const { unreadCount } = useNotifications();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || "User";

  return (
    <header className="sticky top-0 z-50 w-full bg-background dark:bg-slate-900 border-b border-border dark:border-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex h-20 lg:h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <BuySellLogo size="sm" showTagline={false} />
            </Link>
          </div>
          
          <nav className="hidden md:flex items-center gap-6 lg:gap-8" suppressHydrationWarning>
            <Link href="/marketplace" className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-primary transition-colors">
              <Search size={18} /> Products
            </Link>
            <Link href="/manufacturers" className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-primary transition-colors">
              <Search size={18} /> Manufacturers
            </Link>
            <Link href="/dashboard/messages" className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-primary transition-colors relative">
              <MessageSquare size={18} /> Messages
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 h-2.5 w-2.5 rounded-full bg-destructive animate-pulse"></span>
              )}
            </Link>
          </nav>
          
          <div className="flex items-center gap-3 lg:gap-4">
            <LanguageSwitcher />
            <CurrencySelector />
            {user ? (
              <div className="hidden sm:flex items-center gap-3">
                <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold uppercase">
                    {displayName?.charAt(0) || "U"}
                  </div>
                  <span className="text-sm font-semibold text-foreground hidden md:block">
                    {displayName}
                  </span>
                </Link>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <Link href="/login" className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                  Log in
                </Link>
                <Link href="/register" className="text-sm font-semibold text-white bg-primary hover:bg-primary/90 px-4 py-2.5 rounded-lg transition-colors font-black">
                  Sign up
                </Link>
              </div>
            )}
            
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-foreground bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border dark:border-slate-800 bg-background dark:bg-slate-900 px-4 pt-2 pb-4 space-y-1 shadow-lg absolute w-full z-40">
          <Link href="/marketplace" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 rounded-md text-base font-semibold text-slate-700 dark:text-slate-200 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-border/50">
            Products
          </Link>
          <Link href="/manufacturers" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 rounded-md text-base font-semibold text-slate-700 dark:text-slate-200 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-border/50">
            Manufacturers
          </Link>
          <Link href="/dashboard/messages" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between px-3 py-3 rounded-md text-base font-semibold text-slate-700 dark:text-slate-200 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800">
            Messages 
            {unreadCount > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>}
          </Link>
          <div className="px-3 py-2 border-b border-border/50">
            <LanguageSwitcher />
          </div>
          {!user && (
            <div className="pt-4 mt-2 flex flex-col gap-3">
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-center rounded-md text-base font-semibold text-foreground hover:bg-slate-50 dark:hover:bg-slate-800 border border-border">
                Log in
              </Link>
              <Link href="/register" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-center rounded-md text-base font-semibold text-white bg-primary hover:bg-primary/90">
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
