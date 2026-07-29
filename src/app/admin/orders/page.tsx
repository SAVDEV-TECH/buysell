"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ShoppingCart,
  Search,
  RefreshCw,
  Loader2,
  ArrowUpRight,
  DollarSign,
  Package,
  TrendingUp,
} from "lucide-react";

interface OrderRecord {
  id: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  buyer?: { full_name: string; email: string };
  supplier_org?: { company_name: string };
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  confirmed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  processing: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  shipped: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  delivered: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function AdminOrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("orders")
        .select(`
          id, status, total_amount, currency, created_at,
          buyer:users!orders_buyer_id_fkey(full_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(200);
      setOrders((data as any[]) || []);
    } catch (err) {
      console.error("Orders fetch error:", err);
    }
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchOrders();
      setLoading(false);
    };
    init();
  }, [fetchOrders]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const gmv = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const avgOrderValue = orders.length > 0 ? gmv / orders.length : 0;

  const statuses = ["all", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        (o.buyer as any)?.email?.toLowerCase().includes(q) ||
        (o.buyer as any)?.full_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <ShoppingCart size={22} className="text-primary" /> Orders Overview
          </h1>
          <p className="text-slate-500 text-sm font-bold mt-1">
            Platform-wide transaction feed
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: orders.length, icon: <Package size={18} className="text-blue-400" />, color: "bg-blue-500/10" },
          { label: "Platform GMV", value: `$${gmv.toLocaleString()}`, icon: <DollarSign size={18} className="text-emerald-400" />, color: "bg-emerald-500/10" },
          { label: "Avg Order Value", value: `$${avgOrderValue.toFixed(0)}`, icon: <TrendingUp size={18} className="text-purple-400" />, color: "bg-purple-500/10" },
          { label: "Pending", value: orders.filter(o => o.status === "pending").length, icon: <ShoppingCart size={18} className="text-amber-400" />, color: "bg-amber-500/10" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
          >
            <div className={`p-2.5 rounded-xl ${s.color} w-fit mb-3`}>{s.icon}</div>
            <p className="text-2xl font-black text-white">{s.value}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-1 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto scrollbar-none">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-[11px] font-black rounded-xl capitalize whitespace-nowrap transition-all ${
                statusFilter === s ? "bg-primary text-white" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by order ID or buyer…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3">
            <Loader2 size={28} className="text-primary animate-spin" />
            <p className="text-slate-500 text-sm font-bold">Loading orders…</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  {["Order ID", "Buyer", "Amount", "Status", "Date", ""].map((h) => (
                    <th key={h} className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((o, i) => (
                  <motion.tr
                    key={o.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.015 }}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <span className="text-xs font-mono font-bold text-primary">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-bold text-white">{(o.buyer as any)?.full_name || "—"}</p>
                      <p className="text-[11px] text-slate-500">{(o.buyer as any)?.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-black text-white">
                        ${o.total_amount?.toLocaleString()} <span className="text-[10px] text-slate-500">{o.currency || "USD"}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${statusColors[o.status] || statusColors.pending}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[11px] text-slate-500 font-bold">
                        {new Date(o.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/dashboard/orders/${o.id}`}
                        target="_blank"
                        className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-primary transition-colors"
                      >
                        View <ArrowUpRight size={11} />
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
