"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, ShoppingBag, PieChart, Settings, LogOut, Menu, X, Bell, User, Package, ShieldCheck, Layers, CheckSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

import NotificationPopover from "@/components/NotificationPopover";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, role, verificationLevel, loading } = useAuth();
  const router = useRouter();
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const navItems = [
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-borderline transition-transform lg:translate-x-0 lg:static ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-full flex flex-col">
          <div className="p-6">
            <Link href="/" className="text-2xl font-bold gradient-text">BuySell</Link>
            <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground font-bold bg-primary/10 w-fit px-2 py-0.5 rounded-full ring-1 ring-primary/20">
              {role || "USER"}
            </div>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary transition-all rounded-xl font-medium"
              >
                <item.icon size={20} />
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-borderline">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all rounded-xl font-medium"
            >
              <LogOut size={20} />
              Log Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-slate-900 border-b border-borderline h-16 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="flex items-center gap-4 ml-auto">
            <NotificationPopover />
            <div className="flex items-center gap-3 pl-4 border-l border-borderline">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold truncate">{profile?.full_name || user.email || "User"}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{role}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold border-2 border-white dark:border-slate-800 shadow-sm">
                {profile?.full_name?.[0] || <User size={20} />}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
           {children}
        </main>
      </div>
    </div>
  );
}
