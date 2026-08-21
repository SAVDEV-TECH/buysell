"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Users,
  Package,
  ShoppingCart,
  ShieldCheck,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Activity,
  Lock,
  RefreshCw,
} from "lucide-react";
import BuySellLoader from "@/components/BuySellLoader";

interface PlatformStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  pendingVerifications: number;
  verifiedOrgs: number;
  totalRevenue: number;
  escrowBalance?: number;
  recentActivity: RecentAction[];
  recentOrders: RecentOrder[];
}

interface RecentAction {
  id: string;
  org_name: string;
  action: string;
  created_at: string;
  type: "approved" | "rejected" | "new";
}

interface RecentOrder {
  id: string;
  buyer_name?: string;
  supplier_name?: string;
  total_amount: number;
  status: string;
  payment_method?: string;
  created_at: string;
}

const statusColor: Record<string, string> = {
  processing:  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  completed:   "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  delivered:   "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  pending:     "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  cancelled:   "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  refunded:    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

export default function AdminCommandCenter() {
  const { role } = useAuth();
  const supabase = createClient();
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    pendingVerifications: 0,
    verifiedOrgs: 0,
    totalRevenue: 0,
    escrowBalance: 0,
    recentActivity: [],
    recentOrders: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    if (role !== "super_admin") return;

    try {
      // 1. Try server API route
      let apiSuccess = false;
      try {
        const res = await fetch("/api/admin/stats");
        const json = await res.json();
        if (json.success && json.data) {
          setStats(json.data);
          apiSuccess = true;
        }
      } catch (apiErr) {
        console.warn("[Admin Dashboard] Server stats API notice, running client fallback:", apiErr);
      }

      // 2. Client fallback
      if (!apiSuccess) {
        const [
          usersRes,
          profilesRes,
          productsRes,
          ordersRes,
          pendingRes,
          verifiedRes,
          recentOrgsRes,
          rawOrdersRes,
        ] = await Promise.all([
          supabase.from("users").select("*", { count: "exact", head: true }),
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("products").select("*", { count: "exact", head: true }),
          supabase.from("orders").select("*", { count: "exact", head: true }),
          supabase.from("organizations").select("*", { count: "exact", head: true }).eq("verification_level", "pending"),
          supabase.from("organizations").select("*", { count: "exact", head: true }).eq("verification_level", "verified"),
          supabase.from("organizations").select("id, company_name, verification_level, created_at, updated_at").order("updated_at", { ascending: false }).limit(6),
          supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(20),
        ]);

        const uCount = usersRes.count ?? profilesRes.count ?? 0;
        const pCount = productsRes.count ?? 0;
        const dbOrderCount = ordersRes.count ?? rawOrdersRes.data?.length ?? 0;
        const pendingCount = pendingRes.count ?? 0;
        const verifiedCount = verifiedRes.count ?? 0;

        let dbOrders = (rawOrdersRes.data as any[]) || [];
        let localOrders: any[] = [];
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith("buysell_user_orders_")) {
              const raw = localStorage.getItem(key);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) localOrders = [...localOrders, ...parsed];
              }
            }
          }
        } catch (e) {}

        const mergedMap = new Map<string, any>();
        localOrders.forEach((o) => mergedMap.set(String(o.id || o.created_at), o));
        dbOrders.forEach((o) => mergedMap.set(String(o.id || o.created_at), o));

        const mergedOrders = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );

        const totalRevenue = mergedOrders.reduce((acc: number, o: any) => {
          const val = Number(o.total_amount || o.amount || 0);
          return acc + (isNaN(val) ? 0 : val);
        }, 0);

        const formattedOrders: RecentOrder[] = mergedOrders.slice(0, 5).map((o: any) => ({
          id: o.id,
          buyer_name: o.buyer_organization?.company_name || o.shipping_address?.full_name || "B2B Buyer",
          supplier_name: o.supplier_organization?.company_name || "Verified Supplier",
          total_amount: Number(o.total_amount || 0),
          status: o.status || "processing",
          payment_method: o.payment_method || "mobile_money",
          created_at: o.created_at,
        }));

        const activity: RecentAction[] = (recentOrgsRes.data || []).map((org: any) => ({
          id: org.id,
          org_name: org.company_name || "Business Account",
          action:
            org.verification_level === "verified"
              ? "Approved & verified"
              : org.verification_level === "rejected"
              ? "Application rejected"
              : "New application submitted",
          created_at: org.updated_at || org.created_at,
          type:
            org.verification_level === "verified"
              ? "approved"
              : org.verification_level === "rejected"
              ? "rejected"
              : "new",
        }));

        let escrowBalance = 0;
        try {
          const { data: escrowData } = await supabase
            .from("escrow_transactions")
            .select("amount, type, status");
          if (escrowData) {
            for (const tx of escrowData) {
              if (tx.type === "deposit" || tx.type === "hold") {
                escrowBalance += Number(tx.amount || 0);
              } else if (tx.type === "release" || tx.type === "partial_release" || tx.type === "refund") {
                escrowBalance -= Number(tx.amount || 0);
              }
            }
          }
        } catch (escrowQueryErr) {
          console.warn("[Admin] Escrow balance fallback query notice:", escrowQueryErr);
        }

        setStats({
          totalUsers: uCount,
          totalProducts: pCount,
          totalOrders: Math.max(dbOrderCount, mergedOrders.length),
          pendingVerifications: pendingCount,
          verifiedOrgs: verifiedCount,
          totalRevenue,
          escrowBalance: Math.max(0, escrowBalance),
          recentActivity: activity,
          recentOrders: formattedOrders,
        });
      }
    } catch (err) {
      console.error("Admin stats fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role, supabase]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return <BuySellLoader message="Loading dashboard…" fullScreen={false} />;
  }

  const kpiCards = [
    {
      label: "Registered Users",
      value: stats.totalUsers.toLocaleString(),
      icon: <Users size={18} className="text-primary" />,
      href: "/admin/users",
      sub: "Total accounts",
    },
    {
      label: "Active Products",
      value: stats.totalProducts.toLocaleString(),
      icon: <Package size={18} className="text-primary" />,
      href: "/admin/products",
      sub: "Listed on marketplace",
    },
    {
      label: "Total Orders",
      value: stats.totalOrders.toLocaleString(),
      icon: <ShoppingCart size={18} className="text-primary" />,
      href: "/admin/orders",
      sub: "All-time",
    },
    {
      label: "Pending Approvals",
      value: stats.pendingVerifications,
      icon: <Clock size={18} className="text-amber-500" />,
      href: "/admin/verifications",
      sub: "Awaiting KYB review",
      highlight: stats.pendingVerifications > 0,
    },
    {
      label: "Verified Businesses",
      value: stats.verifiedOrgs.toLocaleString(),
      icon: <ShieldCheck size={18} className="text-green-500" />,
      href: "/admin/verifications",
      sub: "Approved organisations",
    },
    {
      label: "Platform Revenue",
      value: `$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: <TrendingUp size={18} className="text-primary" />,
      href: "/admin/payouts",
      sub: "Cumulative trade volume",
    },
    {
      label: "Escrow Balance",
      value: `$${(stats.escrowBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: <Lock size={18} className="text-emerald-500" />,
      href: "/admin/escrow-ledger",
      sub: "Funds currently held",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-16 space-y-8 px-1">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">Super Admin Dashboard</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Platform overview · {new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          {stats.pendingVerifications > 0 && (
            <Link
              href="/admin/verifications"
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors"
            >
              <Clock size={13} />
              {stats.pendingVerifications} Pending
            </Link>
          )}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {kpiCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`group flex flex-col gap-3 p-4 rounded-xl border transition-all hover:shadow-md ${
              card.highlight
                ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                : "bg-card border-border hover:border-primary/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-muted">{card.icon}</div>
              <ArrowUpRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">{card.value}</p>
              <p className="text-xs font-semibold text-muted-foreground mt-1">{card.label}</p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">{card.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Main Content: Orders + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Orders — takes 2/3 width */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <ShoppingCart size={15} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Recent Orders</h2>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              View all <ArrowUpRight size={12} />
            </Link>
          </div>

          {stats.recentOrders.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              No orders yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {stats.recentOrders.map((ord) => (
                <div key={ord.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-foreground">
                        #{ord.id?.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor[ord.status] ?? "bg-muted text-muted-foreground"}`}>
                        {ord.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {ord.buyer_name} → {ord.supplier_name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">
                      ${ord.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase">{ord.payment_method}</p>
                  </div>
                  <Link
                    href={`/dashboard/orders/${ord.id}`}
                    className="ml-2 text-xs text-primary hover:underline shrink-0 flex items-center gap-0.5"
                  >
                    View <ArrowUpRight size={11} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Activity + Quick Actions */}
        <div className="space-y-6">

          {/* Org Activity */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Activity size={14} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Organisation Activity</h2>
            </div>
            {stats.recentActivity.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-xs">No recent activity</div>
            ) : (
              <div className="divide-y divide-border">
                {stats.recentActivity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="mt-0.5">
                      {item.type === "approved" ? (
                        <CheckCircle2 size={14} className="text-green-500" />
                      ) : item.type === "rejected" ? (
                        <XCircle size={14} className="text-red-500" />
                      ) : (
                        <Clock size={14} className="text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{item.org_name}</p>
                      <p className="text-[11px] text-muted-foreground">{item.action}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-border bg-card">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Quick Actions</h2>
            </div>
            <div className="p-3 space-y-2">
              {[
                { label: "Verify Businesses", href: "/admin/verifications", icon: <ShieldCheck size={14} className="text-primary" />, count: stats.pendingVerifications },
                { label: "Manage Orders", href: "/admin/orders", icon: <ShoppingCart size={14} className="text-primary" />, count: stats.totalOrders },
                { label: "Escrow Ledger", href: "/admin/escrow-ledger", icon: <Lock size={14} className="text-emerald-500" /> },
                { label: "All Users", href: "/admin/users", icon: <Users size={14} className="text-primary" />, count: stats.totalUsers },
                { label: "All Products", href: "/admin/products", icon: <Package size={14} className="text-primary" />, count: stats.totalProducts },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    {action.icon}
                    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                      {action.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {action.count !== undefined && (
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {action.count.toLocaleString()}
                      </span>
                    )}
                    <ArrowUpRight size={12} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
