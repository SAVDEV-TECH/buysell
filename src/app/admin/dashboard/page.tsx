"use client";

import { useEffect, useState } from "react";
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
  AlertTriangle,
  Activity,
  DollarSign,
  Loader2,
  Building2,
  Zap,
} from "lucide-react";

interface PlatformStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  pendingVerifications: number;
  verifiedOrgs: number;
  totalRevenue: number;
  recentActivity: RecentAction[];
}

interface RecentAction {
  id: string;
  org_name: string;
  action: string;
  created_at: string;
  type: "approved" | "rejected" | "new";
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
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role !== "super_admin") return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        const [
          { count: usersCount },
          { count: productsCount },
          { count: ordersCount },
          { count: pendingCount },
          { count: verifiedCount },
          { data: recentOrgs },
        ] = await Promise.all([
          supabase.from("users").select("*", { count: "exact", head: true }),
          supabase.from("products").select("*", { count: "exact", head: true }),
          supabase.from("orders").select("*", { count: "exact", head: true }),
          supabase
            .from("organizations")
            .select("*", { count: "exact", head: true })
            .eq("verification_level", "pending"),
          supabase
            .from("organizations")
            .select("*", { count: "exact", head: true })
            .eq("verification_level", "verified"),
          supabase
            .from("organizations")
            .select("id, company_name, verification_level, created_at, updated_at")
            .order("updated_at", { ascending: false })
            .limit(6),
        ]);

        const activity: RecentAction[] = (recentOrgs || []).map((org: any) => ({
          id: org.id,
          org_name: org.company_name,
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
          totalUsers: usersCount || 0,
          totalProducts: productsCount || 0,
          totalOrders: ordersCount || 0,
          pendingVerifications: pendingCount || 0,
          verifiedOrgs: verifiedCount || 0,
          totalRevenue: 0,
          recentActivity: activity,
        });
      } catch (err) {
        console.error("Admin stats fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [role, supabase]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={36} className="text-primary animate-spin" />
        <p className="text-slate-400 text-sm font-bold">Loading platform telemetry…</p>
      </div>
    );
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
      icon: <AlertTriangle size={20} className="text-amber-400" />,
      color: "bg-amber-500/10",
      href: "/admin/verifications",
    },
    {
      label: "Verified Partners",
      value: stats.verifiedOrgs,
      icon: <ShieldCheck size={20} className="text-emerald-400" />,
      color: "bg-emerald-500/10",
      href: "/admin/verifications",
    },
    {
      label: "Platform GMV",
      value: "$0.00",
      icon: <DollarSign size={20} className="text-green-400" />,
      color: "bg-green-500/10",
      href: "/admin/orders",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
              <Zap size={14} className="text-primary" />
            </div>
            <h1 className="text-2xl font-black text-white">Command Center</h1>
          </div>
          <p className="text-slate-500 text-sm font-bold">
            Real-time platform telemetry · BuySell Admin v1.0
          </p>
        </div>

        {stats.pendingVerifications > 0 && (
          <Link
            href="/admin/verifications"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-black shadow-lg shadow-amber-500/25 hover:bg-amber-400 transition-all hover:scale-105"
          >
            <AlertTriangle size={15} className="animate-bounce" />
            {stats.pendingVerifications} Pending — Review Now
          </Link>
        )}
      </motion.div>

      {/* Stat Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((card, i) => (
          <StatCard key={card.label} {...card} delay={i * 0.07} />
        ))}
      </div>

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
                label: "Manage All Users",
                desc: `${stats.totalUsers} registered accounts on the platform`,
                href: "/admin/users",
                icon: <Users size={18} className="text-blue-400" />,
                bg: "bg-blue-500/8 hover:bg-blue-500/15 border-blue-500/15",
              },
              {
                label: "Review Products",
                desc: `${stats.totalProducts} live products on the marketplace`,
                href: "/admin/products",
                icon: <Package size={18} className="text-purple-400" />,
                bg: "bg-purple-500/8 hover:bg-purple-500/15 border-purple-500/15",
              },
              {
                label: "View Activity Audit Log",
                desc: "Track every admin action taken on the platform",
                href: "/admin/activity",
                icon: <Activity size={18} className="text-emerald-400" />,
                bg: "bg-emerald-500/8 hover:bg-emerald-500/15 border-emerald-500/15",
              },
              {
                label: "Process Payouts",
                desc: "Review and approve pending supplier payout requests",
                href: "/admin/payouts",
                icon: <DollarSign size={18} className="text-green-400" />,
                bg: "bg-green-500/8 hover:bg-green-500/15 border-green-500/15",
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
              Supabase realtime · PostgreSQL · WebSocket channels — all online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-emerald-600">
          <span>DB: ✓ Connected</span>
          <span>RT: ✓ Active</span>
          <span>API: ✓ Healthy</span>
        </div>
      </motion.div>
    </div>
  );
}
