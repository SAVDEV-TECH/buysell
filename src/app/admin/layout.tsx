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
  ChevronRight,
  Bell,
  AlertCircle,
} from "lucide-react";
import BuySellLogo from "@/components/BuySellLogo";
import NotificationPopover from "@/components/NotificationPopover";

const navItems = [
  {
    section: "OVERVIEW",
    items: [
      { name: "Command Center", href: "/admin/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    section: "PLATFORM",
    items: [
      { name: "Verifications", href: "/admin/verifications", icon: ShieldCheck, badge: "pending" },
      { name: "Users", href: "/admin/users", icon: Users },
      { name: "Products", href: "/admin/products", icon: Package },
    ],
  },
  {
    section: "COMMERCE",
    items: [
      { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
      { name: "Payouts", href: "/admin/payouts", icon: Wallet },
    ],
  },
  {
    section: "AUDIT",
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

  // Role gate — only super_admin allowed
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
    if (!loading && user && role !== "super_admin") {
      router.push("/dashboard");
    }
  }, [user, loading, role, router]);

  // Fetch pending verification count for badge
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

    // Subscribe to org changes to keep badge live
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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-slate-400 text-sm font-bold">Verifying admin credentials…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-3">
          <BuySellLogo size="sm" />
          <div>
            <p className="text-white font-black text-base leading-none">BuySell</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-0.5">Admin</p>
          </div>
        </div>

        {/* Admin Identity */}
        <div className="px-4 py-3 mx-4 mt-4 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
            {profile?.full_name?.[0] || "A"}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-black truncate">{profile?.full_name || "Admin"}</p>
            <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Super Admin
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-none">
          {navItems.map((group) => (
            <div key={group.section}>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 px-2 mb-2">
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
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all relative group ${
                        isActive
                          ? "bg-primary/15 text-primary border border-primary/20"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/80"
                      }`}
                    >
                      <item.icon size={18} className={isActive ? "text-primary" : ""} />
                      <span className="flex-1">{item.name}</span>
                      {showBadge && (
                        <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-full animate-pulse">
                          {pendingCount}
                        </span>
                      )}
                      {isActive && <ChevronRight size={14} className="text-primary" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-4 border-t border-slate-800 space-y-1">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all"
          >
            <Package size={18} />
            View Live Site ↗
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-all rounded-xl text-sm font-bold"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top Header */}
        <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 h-16 flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Breadcrumb indicator */}
            <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-500">
              <span className="text-primary font-black">ADMIN</span>
              <ChevronRight size={14} />
              <span className="text-slate-300 capitalize">
                {pathname.split("/").pop()?.replace("-", " ") || "dashboard"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Pending alert pill */}
            {pendingCount > 0 && (
              <Link
                href="/admin/verifications"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black hover:bg-amber-500/20 transition-all"
              >
                <AlertCircle size={14} className="animate-pulse" />
                {pendingCount} pending approval{pendingCount !== 1 ? "s" : ""}
              </Link>
            )}
            <NotificationPopover />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 lg:p-8 lg:pb-10 bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
