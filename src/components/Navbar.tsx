"use client";

import Link from "next/link";
import { Search, MessageSquare, Menu, X, LayoutDashboard, ShoppingBag, Settings, LogOut, ChevronDown, ShieldCheck } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { createClient } from "@/lib/supabase/client";
import CurrencySelector from "./CurrencySelector";
import LanguageSwitcher from "./LanguageSwitcher";
import NotificationPopover from "./NotificationPopover";
import ThemeToggle from "./ThemeToggle";
import { BuySellLogo } from "@/components/BuySellLogo";

const Navbar = () => {
  const { user, profile, role } = useAuth();
  const { unreadCount } = useNotifications();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || "User";

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-md border-b border-border flex flex-col">
      {/* Nigeria Beta Announcement Banner */}
      <div className="w-full bg-primary/10 text-primary py-2 px-4 text-center border-b border-primary/20 flex items-center justify-center gap-2">
        <span className="text-xs sm:text-sm font-bold truncate">
          🌍 BuySell is currently in Beta for the Nigerian Market. International trade coming soon.
        </span>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <BuySellLogo size="sm" showTagline={false} hideTextOnMobile={true} />
            </Link>
          </div>
          
          <nav className="hidden md:flex items-center gap-6 lg:gap-8" suppressHydrationWarning>
            <Link href="/marketplace" className="flex items-center gap-2 text-sm font-semibold text-foreground/80 hover:text-primary transition-colors">
              <Search size={16} /> Products
            </Link>
            <Link href="/manufacturers" className="flex items-center gap-2 text-sm font-semibold text-foreground/80 hover:text-primary transition-colors">
              <Search size={16} /> Manufacturers
            </Link>
            <Link href="/dashboard/messages" className="flex items-center gap-2 text-sm font-semibold text-foreground/80 hover:text-primary transition-colors relative">
              <MessageSquare size={16} /> Messages
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          </nav>
          
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <div className="hidden md:flex items-center gap-3 lg:gap-4">
              <ThemeToggle />
              <LanguageSwitcher />
              <CurrencySelector />
            </div>
            
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Notification Bell Icon with Red Dot & Numeric Count */}
                <NotificationPopover />

                <Link
                  href="/dashboard/messages"
                  title="Trade Messages"
                  className="p-2 rounded-xl text-foreground hover:text-primary hover:bg-muted transition-colors relative"
                >
                  <MessageSquare size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-background animate-pulse">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Profile & Dashboard Dropdown */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen((o) => !o)}
                    aria-expanded={isUserMenuOpen}
                    aria-label="Account and Dashboard Menu"
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-muted transition-colors border border-transparent hover:border-border"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold uppercase shadow-sm shrink-0">
                      {displayName?.charAt(0) || "U"}
                    </div>
                    <div className="hidden lg:flex flex-col text-left">
                      <span className="text-xs font-bold text-foreground truncate max-w-[110px]">
                        {displayName}
                      </span>
                      <span className="text-[10px] font-bold text-primary flex items-center gap-0.5">
                        Dashboard <ChevronDown size={10} />
                      </span>
                    </div>
                  </button>

                  {/* Profile Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden p-2">
                      <div className="px-3 py-2.5 border-b border-border mb-1">
                        <p className="text-xs font-bold text-foreground truncate">
                          {displayName}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>

                      {/* Explicit Dashboard Button */}
                      <Link
                        href="/dashboard"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary/90 transition-colors mb-1 shadow-sm"
                      >
                        <LayoutDashboard size={15} />
                        <span>Go to Dashboard</span>
                      </Link>

                      {role === "super_admin" && (
                        <Link
                          href="/admin"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-foreground bg-muted hover:bg-muted/80 transition-colors mb-1"
                        >
                          <ShieldCheck size={15} className="text-primary" />
                          <span>Super Admin</span>
                        </Link>
                      )}

                      <Link
                        href="/dashboard/orders"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <ShoppingBag size={15} className="text-muted-foreground" />
                        <span>My Orders</span>
                      </Link>

                      <Link
                        href="/dashboard/messages"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <MessageSquare size={15} className="text-muted-foreground" />
                        <span>Trade Messages</span>
                      </Link>

                      <Link
                        href="/dashboard/settings"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <Settings size={15} className="text-muted-foreground" />
                        <span>Account Settings</span>
                      </Link>

                      <div className="border-t border-border my-1 pt-1">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            handleSignOut();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                          <LogOut size={15} />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <Link href="/login" className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                  Log in
                </Link>
                <Link href="/register" className="text-sm font-bold text-white bg-primary hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors">
                  Sign up
                </Link>
              </div>
            )}
            
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full border-t border-border bg-card px-4 pt-2 pb-4 space-y-1 shadow-lg z-40">
          <Link href="/marketplace" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:text-primary hover:bg-muted border-b border-border/50">
            Products
          </Link>
          <Link href="/manufacturers" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:text-primary hover:bg-muted border-b border-border/50">
            Manufacturers
          </Link>
          {user && (
            <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold text-primary hover:bg-primary/10 border-b border-border/50">
              <LayoutDashboard size={16} /> Business Dashboard
            </Link>
          )}
          <Link href="/dashboard/messages" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:text-primary hover:bg-muted">
            Messages 
            {unreadCount > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>}
          </Link>
          <div className="px-3 py-2.5 border-b border-border/50 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <div className="px-3 py-2.5 border-b border-border/50 flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Language</span>
            <LanguageSwitcher />
          </div>
          <div className="px-3 py-2.5 border-b border-border/50 flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Currency & Region</span>
            <CurrencySelector />
          </div>
          {!user && (
            <div className="pt-4 mt-2 flex flex-col gap-2">
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2.5 text-center rounded-lg text-sm font-semibold text-foreground hover:bg-muted border border-border">
                Log in
              </Link>
              <Link href="/register" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2.5 text-center rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90">
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
