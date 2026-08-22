"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const [navSearch, setNavSearch] = useState("");
  const [searchScope, setSearchScope] = useState<"products" | "suppliers">("products");
  const [isScopeMenuOpen, setIsScopeMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const scopeMenuRef = useRef<HTMLDivElement>(null);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || "User";

  // Sync navSearch with URL parameter when on marketplace or manufacturers
  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) {
      setNavSearch(q);
    }
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = navSearch.trim();
    if (searchScope === "suppliers") {
      router.push(query ? `/manufacturers?q=${encodeURIComponent(query)}` : `/manufacturers`);
    } else {
      router.push(query ? `/marketplace?q=${encodeURIComponent(query)}` : `/marketplace`);
    }
  };

  const handleTrendingClick = (term: string) => {
    setNavSearch(term);
    router.push(`/marketplace?q=${encodeURIComponent(term)}`);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (scopeMenuRef.current && !scopeMenuRef.current.contains(e.target as Node)) {
        setIsScopeMenuOpen(false);
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

      <div className="container mx-auto px-3 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex h-16 items-center justify-between gap-2 sm:gap-4">
          {/* Logo */}
          <div className="flex items-center shrink-0">
            <Link href="/" className="flex items-center">
              <BuySellLogo size="sm" showTagline={false} hideTextOnMobile={true} />
            </Link>
          </div>

          {/* ── Alibaba / Made-in-China Style B2B Global Search Bar ── */}
          <form onSubmit={handleSearchSubmit} className="flex flex-1 min-w-0 max-w-2xl mx-1.5 sm:mx-3 md:mx-6">
            <div className="flex items-center w-full bg-card hover:border-primary focus-within:border-primary border-2 border-primary rounded-xl transition-all shadow-sm overflow-hidden h-10 sm:h-11">
              
              {/* Type / Scope Dropdown Selector (Products / Suppliers) */}
              <div className="relative shrink-0" ref={scopeMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsScopeMenuOpen((o) => !o)}
                  className="h-full px-2.5 sm:px-3.5 text-xs font-bold text-foreground bg-muted/50 hover:bg-muted border-r border-border flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer select-none"
                >
                  <span className="capitalize">{searchScope}</span>
                  <ChevronDown size={13} className={`text-muted-foreground transition-transform duration-200 ${isScopeMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {isScopeMenuOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-36 bg-card border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => { setSearchScope("products"); setIsScopeMenuOpen(false); }}
                      className={`w-full text-left px-3.5 py-2 text-xs font-bold transition-colors flex items-center justify-between ${searchScope === "products" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}
                    >
                      <span>Products</span>
                      {searchScope === "products" && <span className="text-[10px] font-black">✓</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSearchScope("suppliers"); setIsScopeMenuOpen(false); }}
                      className={`w-full text-left px-3.5 py-2 text-xs font-bold transition-colors flex items-center justify-between ${searchScope === "suppliers" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}
                    >
                      <span>Suppliers</span>
                      {searchScope === "suppliers" && <span className="text-[10px] font-black">✓</span>}
                    </button>
                  </div>
                )}
              </div>

              {/* Text Input */}
              <div className="flex-1 flex items-center min-w-0 px-2 sm:px-3">
                <input
                  type="text"
                  placeholder={searchScope === "products" ? "What are you looking for..." : "Search verified manufacturers & suppliers..."}
                  value={navSearch}
                  onChange={(e) => setNavSearch(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none py-1.5 min-w-0"
                />
                {navSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setNavSearch("");
                      router.push(searchScope === "suppliers" ? "/manufacturers" : "/marketplace");
                    }}
                    className="p-1 mr-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors shrink-0"
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Search Submit Button */}
              <button
                type="submit"
                aria-label="Search"
                className="h-full px-3.5 sm:px-5 bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Search size={15} />
                <span className="hidden sm:inline">Search</span>
              </button>
            </div>
          </form>
          
          <nav className="hidden xl:flex items-center gap-4 shrink-0" suppressHydrationWarning>
            <Link href="/marketplace" className="text-xs font-semibold text-foreground/80 hover:text-primary transition-colors">
              Products
            </Link>
            <Link href="/manufacturers" className="text-xs font-semibold text-foreground/80 hover:text-primary transition-colors">
              Manufacturers
            </Link>
          </nav>
          
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 lg:gap-2">
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
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-destructive/10 transition-colors"
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

      {/* ── Alibaba / Made-in-China Style Popular B2B Keyword Strip ── */}
      <div className="hidden md:flex items-center justify-center gap-2 py-1 px-4 text-xs bg-muted/40 border-t border-border/60 overflow-x-auto scrollbar-hide">
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest shrink-0">Hot Searches:</span>
        {["Industrial Machinery", "Solar Inverters", "Agro Processing", "Textiles & Fabrics", "Packaging Materials", "Generators", "Electrical Supplies"].map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => handleTrendingClick(term)}
            className="text-[11px] text-muted-foreground hover:text-primary font-semibold hover:underline transition-colors shrink-0 px-1.5 py-0.5 rounded cursor-pointer"
          >
            {term}
          </button>
        ))}
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full border-t border-border bg-card px-4 pt-2 pb-4 space-y-1 shadow-lg z-40">
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
