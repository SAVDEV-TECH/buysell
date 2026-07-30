"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ShoppingCart,
  Search,
  RefreshCw,
  TrendingUp,
  Package,
  Clock,
  ArrowUpRight,
  Building2,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Lock,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import BuySellLoader from "@/components/BuySellLoader";

interface OrderRecord {
  id: string;
  status: string;
  payment_status?: string;
  escrow_status?: string;
  payment_method?: string;
  total_amount: number;
  currency?: string;
  created_at: string;
  buyer_id?: string;
  buyer_organization_id?: string;
  supplier_organization_id?: string;
  shipping_address?: any;
  buyer?: { full_name?: string; email?: string } | null;
  buyer_organization?: { company_name?: string } | null;
  supplier_organization?: { company_name?: string } | null;
}

const statusBadgeMap: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  processing: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  confirmed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  shipped: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  delivered: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  escrow_released: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  refunded: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  disputed: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function AdminOrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchOrders = useCallback(async () => {
    try {
      let fetchedOrders: OrderRecord[] = [];

      // 1. Fetch server API route /api/admin/orders
      try {
        const res = await fetch("/api/admin/orders");
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          fetchedOrders = json.data;
        }
      } catch (apiErr) {
        console.warn("[Admin Orders] Server API route notice:", apiErr);
      }

      // 2. Direct query fallback if server API route returned empty
      if (fetchedOrders.length === 0) {
        const { data: dbData } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);
        fetchedOrders = (dbData as OrderRecord[]) || [];
      }

      // 3. Client storage backup merge
      let localOrders: OrderRecord[] = [];
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
      } catch (localErr) {
        console.warn("[Admin Orders] LocalStorage scan notice:", localErr);
      }

      const mergedMap = new Map<string, OrderRecord>();
      localOrders.forEach((o) => mergedMap.set(String(o.id || o.created_at), o));
      fetchedOrders.forEach((o) => mergedMap.set(String(o.id || o.created_at), o));

      const mergedList = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );

      setOrders(mergedList);
    } catch (err) {
      console.error("Admin orders fetch error:", err);
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

  // Execute Escrow Control Action (Release, Refund, Dispute Hold)
  const handleEscrowAction = async (orderId: string, action: "release" | "refund" | "dispute_hold") => {
    if (!confirm(`Are you sure you want to execute '${action.toUpperCase()}' for Order #${orderId.slice(0, 8).toUpperCase()}?`)) {
      return;
    }
    setActionLoadingId(orderId);
    try {
      const res = await fetch("/api/admin/escrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action, notes: `Executed via Super Admin Panel` }),
      });
      const json = await res.json();
      if (json.success) {
        alert(`Success: ${json.message}`);
        await fetchOrders();
      } else {
        alert(`Error: ${json.message || json.error}`);
      }
    } catch (err) {
      alert("Failed to execute escrow action. Check network connection.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const gmv = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const avgOrderValue = orders.length > 0 ? gmv / orders.length : 0;

  const statuses = ["all", "pending", "processing", "shipped", "delivered", "completed", "escrow_released", "refunded", "cancelled"];

  const filtered = orders.filter((o) => {
    const st = (o.payment_status || o.status || "").toLowerCase();
    if (statusFilter !== "all" && st !== statusFilter.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        (o.buyer_organization?.company_name || "").toLowerCase().includes(q) ||
        (o.supplier_organization?.company_name || "").toLowerCase().includes(q) ||
        (o.payment_method || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <ShoppingCart size={22} className="text-primary" /> Platform Orders & Escrow Control Center
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-bold">
            Real-time audit log and Super Admin escrow disbursement controls across BuySell
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black transition-all border border-slate-700 disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin text-primary" : ""} />
          Refresh Orders
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Platform Orders", value: orders.length, icon: <Package size={18} className="text-blue-400" />, color: "bg-blue-500/10" },
          { label: "Gross Trade Volume (GMV)", value: `$${gmv.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: <TrendingUp size={18} className="text-emerald-400" />, color: "bg-emerald-500/10" },
          { label: "Average Order Value", value: `$${avgOrderValue.toFixed(2)}`, icon: <DollarSign size={18} className="text-purple-400" />, color: "bg-purple-500/10" },
          { label: "Pending Fulfillment", value: orders.filter(o => o.status === "pending" || o.status === "processing").length, icon: <Clock size={18} className="text-amber-400" />, color: "bg-amber-500/10" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${kpi.color}`}>{kpi.icon}</div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Escrow</span>
            </div>
            <p className="text-2xl font-black text-white">{kpi.value}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black capitalize transition-all whitespace-nowrap ${
                statusFilter === st
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search Order ID, company…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        {loading ? (
          <BuySellLoader message="Fetching platform trade logs via server API…" fullScreen={false} />
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-sm font-bold">
            No platform orders match your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Buyer / Supplier</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Escrow Status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Admin Escrow Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filtered.map((o) => {
                  const currentPaymentSt = (o.payment_status || o.status || "pending").toLowerCase();
                  const isReleased = currentPaymentSt === "escrow_released" || o.escrow_status === "released";
                  const isRefunded = currentPaymentSt === "refunded" || o.escrow_status === "refunded";

                  return (
                    <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-white">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-white flex items-center gap-1">
                          <Building2 size={12} className="text-slate-400" />
                          {o.buyer_organization?.company_name || o.buyer?.full_name || "B2B Buyer"}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          Supplier: {o.supplier_organization?.company_name || "Verified Supplier"}
                        </p>
                      </td>
                      <td className="px-6 py-4 font-black text-white">
                        ${Number(o.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusBadgeMap[currentPaymentSt] || statusBadgeMap.pending}`}>
                          {isReleased ? "Escrow Released" : isRefunded ? "Refunded to Buyer" : currentPaymentSt}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-bold">
                        {new Date(o.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {actionLoadingId === o.id ? (
                            <span className="text-xs font-bold text-primary flex items-center gap-1">
                              <Loader2 size={14} className="animate-spin" /> Processing…
                            </span>
                          ) : isReleased ? (
                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                              ✓ Payout Complete
                            </span>
                          ) : isRefunded ? (
                            <span className="text-[10px] font-black text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                              ✓ Buyer Refunded
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEscrowAction(o.id, "release")}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg transition-all shadow-sm flex items-center gap-1"
                              >
                                <CheckCircle2 size={12} /> Release to Supplier
                              </button>
                              <button
                                onClick={() => handleEscrowAction(o.id, "refund")}
                                className="px-2.5 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-[10px] rounded-lg transition-all shadow-sm flex items-center gap-1"
                              >
                                <XCircle size={12} /> Refund Buyer
                              </button>
                            </>
                          )}
                          <Link
                            href={`/dashboard/orders/${o.id}`}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-[10px] transition-all flex items-center gap-0.5"
                          >
                            Inspect <ArrowUpRight size={12} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
