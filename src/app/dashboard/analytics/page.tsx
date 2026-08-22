"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  TrendingUp,
  Users,
  Activity,
  DollarSign,
  ArrowUpRight,
  TrendingDown,
  Download,
  Loader2,
  ShoppingBag,
  Package,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function getLast12Months() {
  const months: { label: string; key: string }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleString("default", { month: "short" }),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    });
  }
  return months;
}

// ── SVG Line Chart ────────────────────────────────────────────────────────────
function LineChart({ data, color = "#6366f1" }: { data: number[]; color?: string }) {
  const W = 600, H = 180, PAD = 20;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => ({
    x: PAD + (i / (data.length - 1)) * (W - PAD * 2),
    y: H - PAD - (v / max) * (H - PAD * 2),
  }));

  const pathD = points.reduce(
    (acc, p, i) =>
      i === 0
        ? `M${p.x},${p.y}`
        : `${acc} C${points[i - 1].x + 20},${points[i - 1].y} ${p.x - 20},${p.y} ${p.x},${p.y}`,
    ""
  );

  const fillD = `${pathD} L${points[points.length - 1].x},${H - PAD} L${points[0].x},${H - PAD} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1={PAD} y1={PAD + t * (H - PAD * 2)}
          x2={W - PAD} y2={PAD + t * (H - PAD * 2)}
          stroke="currentColor" strokeOpacity="0.06" strokeWidth="1"
        />
      ))}
      {/* Fill area */}
      <path d={fillD} fill="url(#lineGrad)" />
      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={color} stroke="white" strokeWidth="2" />
      ))}
    </svg>
  );
}

// ── SVG Bar Chart ─────────────────────────────────────────────────────────────
function BarChart({ data, labels, color = "#6366f1" }: { data: number[]; labels: string[]; color?: string }) {
  const W = 600, H = 200, PAD = 24, LABEL_H = 28;
  const max = Math.max(...data, 1);
  const barW = (W - PAD * 2) / data.length;
  const GAP = barW * 0.35;

  return (
    <svg viewBox={`0 0 ${W} ${H + LABEL_H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.5" />
        </linearGradient>
      </defs>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1={PAD} y1={PAD + t * (H - PAD * 2)}
          x2={W - PAD} y2={PAD + t * (H - PAD * 2)}
          stroke="currentColor" strokeOpacity="0.06" strokeWidth="1"
        />
      ))}
      {/* Bars */}
      {data.map((v, i) => {
        const bh = (v / max) * (H - PAD * 2);
        const bx = PAD + i * barW + GAP / 2;
        const by = H - PAD - bh;
        return (
          <g key={i}>
            <rect x={bx} y={by} width={barW - GAP} height={bh}
              rx="4" fill="url(#barGrad)" />
            <text x={bx + (barW - GAP) / 2} y={H + LABEL_H - 8}
              textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.5" fontWeight="600">
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── SVG Donut Chart ───────────────────────────────────────────────────────────
function DonutChart({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, d) => s + d.value, 0) || 1;
  const R = 70, CX = 90, CY = 90, STROKE = 22;
  let offset = 0;

  return (
    <svg viewBox="0 0 180 180" className="w-full h-full">
      {slices.map((slice, i) => {
        const pct = slice.value / total;
        const dash = pct * 2 * Math.PI * R;
        const gap = 2 * Math.PI * R - dash;
        const rotate = offset * 360 - 90;
        offset += pct;
        return (
          <circle
            key={i}
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={slice.color}
            strokeWidth={STROKE}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={0}
            transform={`rotate(${rotate} ${CX} ${CY})`}
            strokeLinecap="butt"
          />
        );
      })}
      {/* Center label */}
      <text x={CX} y={CY - 8} textAnchor="middle" fontSize="22" fontWeight="800" fill="currentColor">
        {total}
      </text>
      <text x={CX} y={CY + 14} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.5" fontWeight="600">
        ORDERS
      </text>
    </svg>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { organizationId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetch = async () => {
      if (!organizationId) { setLoading(false); return; }
      setLoading(true);
      try {
        const { data } = await supabase
          .from("orders")
          .select("*")
          .or(`supplier_organization_id.eq.${organizationId},buyer_organization_id.eq.${organizationId}`)
          .order("created_at", { ascending: true });
        setOrders(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [organizationId]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const revenue = orders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
    const buyers = new Set(orders.map((o) => o.buyer_organization_id).filter(Boolean));
    const completed = orders.filter((o) => ["completed", "delivered"].includes(o.status)).length;
    const avgOrder = orders.length > 0 ? revenue / orders.length : 0;
    const completionRate = orders.length > 0 ? Math.round((completed / orders.length) * 100) : 0;
    return { revenue, buyers: buyers.size, avgOrder, completionRate, total: orders.length };
  }, [orders]);

  const months = getLast12Months();

  // Revenue per month
  const revenueByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    months.forEach((m) => (map[m.key] = 0));
    orders.forEach((o) => {
      const key = o.created_at?.slice(0, 7);
      if (key && map[key] !== undefined) map[key] += Number(o.total_amount) || 0;
    });
    return months.map((m) => map[m.key]);
  }, [orders, months]);

  // Orders per month
  const ordersByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    months.forEach((m) => (map[m.key] = 0));
    orders.forEach((o) => {
      const key = o.created_at?.slice(0, 7);
      if (key && map[key] !== undefined) map[key]++;
    });
    return months.map((m) => map[m.key]);
  }, [orders, months]);

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return counts;
  }, [orders]);

  const statusSlices = [
    { label: "Completed", value: (statusBreakdown["completed"] || 0) + (statusBreakdown["delivered"] || 0), color: "#10b981" },
    { label: "Processing", value: statusBreakdown["processing"] || 0, color: "#6366f1" },
    { label: "Pending", value: statusBreakdown["pending"] || 0, color: "#f59e0b" },
    { label: "Cancelled", value: statusBreakdown["cancelled"] || 0, color: "#ef4444" },
  ].filter((s) => s.value > 0);

  // CSV export
  const handleExport = () => {
    const headers = ["Order ID", "Date", "Amount", "Status", "Currency"];
    const rows = orders.map((o) => [
      o.id,
      new Date(o.created_at).toLocaleDateString(),
      o.total_amount || 0,
      o.status,
      o.currency || "USD",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `BuySell_Report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const kpis = [
    {
      label: "Total Revenue",
      value: fmt(stats.revenue),
      icon: DollarSign,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      trend: "+12.5%",
      up: true,
    },
    {
      label: "Unique Buyers",
      value: stats.buyers.toString(),
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      trend: "+5.2%",
      up: true,
    },
    {
      label: "Completion Rate",
      value: stats.completionRate + "%",
      icon: Activity,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      trend: stats.completionRate >= 70 ? "Healthy" : "Needs work",
      up: stats.completionRate >= 70,
    },
    {
      label: "Avg Order Value",
      value: fmt(stats.avgOrder),
      icon: ShoppingBag,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      trend: "+8.4%",
      up: true,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Business Analytics</h1>
          <p className="text-muted-foreground font-medium mt-1 text-sm">
            {loading ? "Loading…" : `${orders.length} orders · Live from Supabase`}
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 size={36} className="text-primary animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {kpis.map((kpi, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-card p-6 rounded-3xl border border-border hover:border-primary/20 transition-all group"
              >
                <div className="flex justify-between items-start mb-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${kpi.bg}`}>
                    <kpi.icon size={22} className={kpi.color} />
                  </div>
                  <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${kpi.up ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                    {kpi.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {kpi.trend}
                  </span>
                </div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{kpi.label}</p>
                <h3 className="text-3xl font-black tracking-tight">{kpi.value}</h3>
              </motion.div>
            ))}
          </div>

          {/* Charts Row 1: Revenue Line + Order Volume Bars */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-card rounded-3xl border border-border p-6 space-y-4"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-base">Revenue Trend</h3>
                  <p className="text-xs text-muted-foreground">Last 12 months</p>
                </div>
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-xl">
                  <TrendingUp size={13} /> {fmt(stats.revenue)} total
                </span>
              </div>
              <div className="h-44 text-muted-foreground">
                <LineChart data={revenueByMonth} color="#6366f1" />
              </div>
              <div className="flex justify-between px-1">
                {months.filter((_, i) => i % 2 === 0).map((m) => (
                  <span key={m.key} className="text-[10px] font-bold text-muted-foreground">{m.label}</span>
                ))}
              </div>
            </motion.div>

            {/* Order Volume */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42 }}
              className="bg-card rounded-3xl border border-border p-6 space-y-4"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-base">Order Volume</h3>
                  <p className="text-xs text-muted-foreground">Last 12 months</p>
                </div>
                <span className="flex items-center gap-1 text-xs font-bold text-blue-500 bg-blue-500/10 px-3 py-1 rounded-xl">
                  <Package size={13} /> {stats.total} orders
                </span>
              </div>
              <div className="h-44 text-muted-foreground">
                <BarChart data={ordersByMonth} labels={months.map((m) => m.label)} color="#3b82f6" />
              </div>
            </motion.div>
          </div>

          {/* Charts Row 2: Donut + Recent Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Status Donut */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-card rounded-3xl border border-border p-6"
            >
              <h3 className="font-bold text-base mb-1">Order Status</h3>
              <p className="text-xs text-muted-foreground mb-4">Breakdown by fulfilment stage</p>
              {statusSlices.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-xs">No orders yet</div>
              ) : (
                <>
                  <div className="w-44 h-44 mx-auto">
                    <DonutChart slices={statusSlices} />
                  </div>
                  <div className="mt-5 space-y-2">
                    {statusSlices.map((s) => (
                      <div key={s.label} className="flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                          {s.label}
                        </span>
                        <span className="font-black">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>

            {/* Recent Orders */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="lg:col-span-2 bg-card rounded-3xl border border-border p-6 flex flex-col"
            >
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="font-bold text-base">Recent Orders</h3>
                  <p className="text-xs text-muted-foreground">Latest transactions</p>
                </div>
                <Link
                  href="/dashboard/orders"
                  className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  View all <ArrowUpRight size={13} />
                </Link>
              </div>

              {orders.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs italic py-12">
                  No orders recorded yet.
                </div>
              ) : (
                <div className="space-y-3 flex-1">
                  {orders.slice(-6).reverse().map((order, i) => {
                    const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
                      completed:  { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-500/10" },
                      delivered:  { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-500/10" },
                      processing: { icon: Activity,    color: "text-blue-600",    bg: "bg-blue-500/10"    },
                      pending:    { icon: Clock,       color: "text-amber-600",   bg: "bg-amber-500/10"   },
                      cancelled:  { icon: XCircle,     color: "text-red-600",     bg: "bg-red-500/10"     },
                    };
                    const cfg = statusConfig[order.status] || statusConfig["pending"];
                    const StatusIcon = cfg.icon;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-4 p-3.5 rounded-2xl bg-card/30 border border-border/10 hover:border-border/40 transition-all"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                          <StatusIcon size={18} className={cfg.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm truncate">
                            {fmt(Number(order.total_amount) || 0)}
                            <span className="ml-2 text-[10px] text-muted-foreground font-bold">{order.currency || "USD"}</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground font-semibold">
                            {new Date(order.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${cfg.bg} ${cfg.color}`}>
                          {order.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
