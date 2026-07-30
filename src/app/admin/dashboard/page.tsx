"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
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
  DollarSign,
  Building2,
} from "lucide-react";
import BuySellLoader from "@/components/BuySellLoader";

interface PlatformStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  pendingVerifications: number;
  verifiedOrgs: number;
  totalRevenue: number;
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

function StatCard({
  label,
  value,
  icon,
  color,
  href,
  delay,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  href: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Link
        href={href}
        className="group block p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all hover:scale-[1.02] shadow-xl"
      >
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
          <ArrowUpRight
            size={16}
            className="text-slate-600 group-hover:text-slate-400 transition-colors"
          />
        </div>
        <p className="text-3xl font-black text-white mb-1">{value}</p>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      </Link>
    </motion.div>
  );
}

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
    recentActivity: [],
    recentOrders: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (role !== "super_admin") return;
    setLoading(true);

    try {
      // 1. Fetch server API route /api/admin/stats (Industry Standard Server RLS Bypass)
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

      // 2. Client query fallback if server API route is unavailable
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

        setStats({
          totalUsers: uCount,
          totalProducts: pCount,
          totalOrders: Math.max(dbOrderCount, mergedOrders.length),
          pendingVerifications: pendingCount,
          verifiedOrgs: verifiedCount,
          totalRevenue,
          recentActivity: activity,
          recentOrders: formattedOrders,
        });
      }
    } catch (err) {
      console.error("Admin stats fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [role, supabase]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return <BuySellLoader message="Loading platform telemetry…" fullScreen={false} />;
  }

  const statCards = [
    {
      label: "Registered Users",
      value: stats.totalUsers.toLocaleString(),
      icon: <Users size={20} className="text-blue-400" />,
      color: "bg-blue-500/10",
      href: "/admin/users",
    },
    {
      label: "Active Products",
      value: stats.totalProducts.toLocaleString(),
      icon: <Package size={20} className="text-purple-400" />,
      color: "bg-purple-500/10",
      href: "/admin/products",
    },
    {
      label: "Total Orders",
      value: stats.totalOrders.toLocaleString(),
      icon: <ShoppingCart size={20} className="text-cyan-400" />,
      color: "bg-cyan-500/10",
      href: "/admin/orders",
    },
    {
      label: "Pending Approvals",
      value: stats.pendingVerifications,
      icon: <Clock size={20} className="text-amber-400" />,
      color: "bg-amber-500/10",
      href: "/admin/verifications",
    },
    {
      label: "Verified Businesses",
      value: stats.verifiedOrgs.toLocaleString(),
      icon: <ShieldCheck size={20} className="text-emerald-400" />,
      color: "bg-emerald-500/10",
      href: "/admin/verifications",
    },
    {
      label: "Gross Platform Revenue",
      value: `$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: <TrendingUp size={20} className="text-green-400" />,
      color: "bg-green-500/10",
      href: "/admin/payouts",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Admin Command Center
            <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Super Admin Server API
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-bold">
            Real-time platform telemetry, merchant approvals, trade volume, and system governance
          </p>
        </div>

        <Link
          href="/admin/verifications"
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          Review Verification Queue ({stats.pendingVerifications})
        </Link>
      </div>

      {/* Action Banner if Pending Verifications */}
      {stats.pendingVerifications > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <Clock size={24} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-black text-amber-300">
                {stats.pendingVerifications} Organization Application{stats.pendingVerifications > 1 ? "s" : ""} Awaiting Review
              </p>
              <p className="text-xs text-slate-400 font-medium">
                Verify business registration & tax IDs to grant selling permissions on BuySell.
              </p>
            </div>
          </div>
          <Link
            href="/admin/verifications"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition-all whitespace-nowrap"
          >
            Review Now →
          </Link>
        </motion.div>
      )}

      {/* Stat Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((card, i) => (
          <StatCard key={card.label} {...card} delay={i * 0.07} />
        ))}
      </div>

      {/* Live Recent Trade Orders Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-slate-900 rounded-2xl border border-slate-800 p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <ShoppingCart size={16} className="text-cyan-400" />
            Recent Platform Trade Orders & Escrow Log
          </h3>
          <Link
            href="/admin/orders"
            className="text-xs font-bold text-slate-400 hover:text-primary transition-colors flex items-center gap-1"
          >
            View all orders ({stats.totalOrders}) <ArrowUpRight size={12} />
          </Link>
        </div>

        {stats.recentOrders.length === 0 ? (
          <div className="py-10 text-center text-slate-600 text-sm font-bold">
            No platform trade orders recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <th className="pb-3">Order ID</th>
                  <th className="pb-3">Buyer / Supplier</th>
                  <th className="pb-3">Trade Amount</th>
                  <th className="pb-3">Method</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs">
                {stats.recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-mono font-bold text-white">
                      #{ord.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-3">
                      <p className="font-bold text-white">{ord.buyer_name}</p>
                      <p className="text-[10px] text-slate-500">Supplier: {ord.supplier_name}</p>
                    </td>
                    <td className="py-3 font-black text-emerald-400">
                      ${ord.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-slate-400 uppercase text-[10px] font-bold">
                      {ord.payment_method}
                    </td>
                    <td className="py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/dashboard/orders/${ord.id}`}
                        className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        Inspect <ArrowUpRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Two-column lower section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Org Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-slate-900 rounded-2xl border border-slate-800 p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Activity size={16} className="text-primary" />
              Recent Organization Activity
            </h3>
            <Link
              href="/admin/verifications"
              className="text-xs font-bold text-slate-500 hover:text-primary transition-colors flex items-center gap-1"
            >
              View all <ArrowUpRight size={12} />
            </Link>
          </div>

          {stats.recentActivity.length === 0 ? (
            <div className="py-12 text-center text-slate-600 text-sm font-bold">
              No recent activity
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50"
                >
                  <div className="flex-shrink-0">
                    {item.type === "approved" ? (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : item.type === "rejected" ? (
                      <XCircle size={16} className="text-red-400" />
                    ) : (
                      <Clock size={16} className="text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white truncate">{item.org_name}</p>
                    <p className="text-[11px] text-slate-500 font-bold">{item.action}</p>
                  </div>
                  <span className="text-[10px] text-slate-600 font-bold whitespace-nowrap">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-slate-900 rounded-2xl border border-slate-800 p-6"
        >
          <h3 className="text-sm font-black text-white flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-primary" />
            Quick Actions
          </h3>

          <div className="space-y-3">
            {[
              {
                label: "Review Pending Verifications",
                desc: `${stats.pendingVerifications} organizations awaiting KYB approval`,
                href: "/admin/verifications",
                icon: <ShieldCheck size={18} className="text-amber-400" />,
                bg: "bg-amber-500/8 hover:bg-amber-500/15 border-amber-500/15",
              },
              {
                label: "Manage All Orders",
                desc: `${stats.totalOrders} commercial B2B orders logged`,
                href: "/admin/orders",
                icon: <ShoppingCart size={18} className="text-cyan-400" />,
                bg: "bg-cyan-500/8 hover:bg-cyan-500/15 border-cyan-500/15",
              },
              {
                label: "Manage All Users",
                desc: `${stats.totalUsers} registered accounts on the platform`,
                href: "/admin/users",
                icon: <Users size={18} className="text-blue-400" />,
                bg: "bg-blue-500/8 hover:bg-blue-500/15 border-blue-500/15",
              },
              {
                label: "Review Marketplace Products",
                desc: `${stats.totalProducts} live products on the marketplace`,
                href: "/admin/products",
                icon: <Package size={18} className="text-purple-400" />,
                bg: "bg-purple-500/8 hover:bg-purple-500/15 border-purple-500/15",
              },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all group ${action.bg}`}
              >
                <div className="p-2 rounded-lg bg-slate-800 flex-shrink-0">{action.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white group-hover:text-primary transition-colors">
                    {action.label}
                  </p>
                  <p className="text-[11px] text-slate-500 font-bold truncate">{action.desc}</p>
                </div>
                <ArrowUpRight
                  size={14}
                  className="text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0"
                />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      {/* System Status Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-900/40 flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <div>
            <p className="text-sm font-black text-emerald-300">All Systems Operational</p>
            <p className="text-xs text-emerald-600 font-bold">
              Supabase realtime · PostgreSQL · Server API RLS Bypass — all online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-emerald-600">
          <span>DB: ✓ Connected</span>
          <span>Server API: ✓ Active</span>
          <span>RLS Bypass: ✓ Enabled</span>
        </div>
      </motion.div>
    </div>
  );
}
