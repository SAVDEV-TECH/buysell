"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, ShoppingBag, PieChart, Settings, LogOut, Menu, X, Bell, User, Package, ShieldCheck, Layers, CheckSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

import NotificationPopover from "@/components/NotificationPopover";
import BuySellLoader from "@/components/BuySellLoader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, role, verificationLevel, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    // Redirect non-verified accounts away from dashboard
    if (!loading && user && verificationLevel && verificationLevel !== "verified") {
      if (verificationLevel === "pending") {
        router.push("/pending-approval");
      } else if (verificationLevel === "rejected") {
        router.push("/pending-approval?status=rejected");
      }
    }
  }, [user, loading, verificationLevel, router]);

  if (loading || !user) {
    return <BuySellLoader message="Loading your dashboard..." fullScreen />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const baseNavItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
    { name: "Quick Order", href: "/dashboard/quick-order", icon: Layers },
    { name: "Approvals", href: "/dashboard/approvals", icon: CheckSquare },
    { name: "My Products", href: "/dashboard/products", icon: Package },
    { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
    { name: "Verification", href: "/dashboard/verification", icon: ShieldCheck },
    { name: "Analytics", href: "/dashboard/analytics", icon: PieChart },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  const adminNavItems = (role === "super_admin") ? [
    { name: "Super Admin", href: "/admin", icon: ShieldCheck },
    { name: "Escrow Ledger", href: "/admin/escrow-ledger", icon: Layers },
  ] : [];

  const navItems = [...baseNavItems, ...adminNavItems];

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform lg:translate-x-0 lg:static ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-full flex flex-col">
          <div className="p-6">
            <Link href="/" className="text-2xl font-black gradient-text">BuySell</Link>
            <div className="mt-2 text-[10px] uppercase tracking-wider text-primary font-bold bg-primary/10 w-fit px-2 py-0.5 rounded-full border border-primary/20">
              {role || "USER"}
            </div>
          </div>

          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon size={16} className={isActive ? "text-white" : "text-muted-foreground"} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all rounded-xl font-semibold text-xs"
            >
              <LogOut size={16} />
              Log Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border h-16 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 text-foreground hover:bg-muted rounded-lg"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-4 ml-auto">
            <NotificationPopover />
            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-foreground truncate">{profile?.full_name || user.email || "User"}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{role}</p>
              </div>
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm">
                {profile?.full_name?.[0] || <User size={14} />}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
