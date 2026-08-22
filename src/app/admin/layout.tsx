"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Package,
  ShoppingCart,
  Wallet,
  Activity,
  LogOut,
  Menu,
  X,
  Lock,
  ExternalLink,
} from "lucide-react";
import { BuySellLogo } from "@/components/BuySellLogo";
import BuySellLoader from "@/components/BuySellLoader";
import NotificationPopover from "@/components/NotificationPopover";
import ThemeToggle from "@/components/ThemeToggle";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    section: "Overview",
    items: [
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    section: "Platform",
    items: [
      { name: "Verifications", href: "/admin/verifications", icon: ShieldCheck, badge: "pending" },
      { name: "Users", href: "/admin/users", icon: Users },
      { name: "Products", href: "/admin/products", icon: Package },
    ],
  },
  {
    section: "Commerce",
    items: [
      { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
      { name: "Escrow Ledger", href: "/admin/escrow-ledger", icon: Lock },
      { name: "Payouts", href: "/admin/payouts", icon: Wallet },
    ],
  },
  {
    section: "Audit",
    items: [
      { name: "Activity Log", href: "/admin/activity", icon: Activity },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && role !== "super_admin") router.push("/dashboard");
  }, [user, loading, role, router]);

  useEffect(() => {
    if (role !== "super_admin") return;
    const fetchPending = async () => {
      const { count } = await supabase
        .from("organizations")
        .select("*", { count: "exact", head: true })
        .eq("verification_level", "pending");
      setPendingCount(count || 0);
    };
    fetchPending();
    const channel = supabase
      .channel("admin-pending-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "organizations" }, fetchPending)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [role, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading || !user || role !== "super_admin") {
    return <BuySellLoader message="Verifying credentials…" fullScreen />;
  }

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "SA";

  return (
    <div className="min-h-screen bg-background flex text-foreground">

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-56 bg-card border-r border-border flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-border shrink-0">
          <BuySellLogo size="sm" showTagline={false} />
          <div className="ml-2.5">
            <span className="font-bold text-sm text-foreground">BuySell</span>
            <span className="ml-1.5 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Admin</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {navGroups.map((group) => (
            <div key={group.section}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1">
                {group.section}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  const showBadge = item.badge === "pending" && pendingCount > 0;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? "bg-primary text-white font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
                      }`}
                    >
                      <item.icon size={16} />
                      <span className="flex-1 truncate">{item.name}</span>
                      {showBadge && (
                        <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                          {pendingCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User + Actions */}
        <div className="border-t border-border px-3 py-3 space-y-1 shrink-0">
          {/* Profile pill */}
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-muted">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-[11px] font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{profile?.full_name || "Admin"}</p>
              <p className="text-[10px] text-emerald-500 font-medium">● Super Admin</p>
            </div>
          </div>

          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-medium"
          >
            <ExternalLink size={15} />
            <span>View Live Site</span>
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-2.5 py-2 w-full rounded-lg text-sm text-red-500 hover:bg-destructive/10 transition-colors font-medium"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <span className="text-sm font-semibold text-foreground capitalize hidden sm:block">
              {pathname.split("/").pop()?.replace(/-/g, " ") || "Dashboard"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Link
                href="/admin/verifications"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors"
              >
                {pendingCount} pending
              </Link>
            )}
            <ThemeToggle />
            <NotificationPopover />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24">
          {children}
        </main>
      </div>
    </div>
  );
}
