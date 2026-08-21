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
  CheckCircle2,
  XCircle,
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
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  shipped: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
  delivered: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  escrow_released: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  refunded: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  disputed: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800",
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

      try {
        const res = await fetch("/api/admin/orders");
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          fetchedOrders = json.data;
        }
      } catch (apiErr) {
        console.warn("[Admin Orders] Server API route notice:", apiErr);
      }

      if (fetchedOrders.length === 0) {
        const { data: dbData } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);
        fetchedOrders = (dbData as OrderRecord[]) || [];
      }

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

  if (loading) {
    return <BuySellLoader message="Loading platform orders..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">Orders & Escrow Management</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Audit commercial trade orders and control escrow fund releases
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Orders", value: orders.length.toLocaleString(), icon: <Package size={16} className="text-primary" /> },
          { label: "Gross Trade Volume", value: `$${gmv.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: <TrendingUp size={16} className="text-emerald-500" /> },
          { label: "Avg Order Value", value: `$${avgOrderValue.toFixed(2)}`, icon: <DollarSign size={16} className="text-primary" /> },
          { label: "Pending Fulfillment", value: orders.filter(o => o.status === "pending" || o.status === "processing").length.toLocaleString(), icon: <Clock size={16} className="text-amber-500" /> },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-muted">{kpi.icon}</div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Escrow Live</span>
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border overflow-x-auto">
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                statusFilter === st
                  ? "bg-card text-foreground shadow-sm font-bold border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search Order ID, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground text-xs font-medium">
            No platform orders match your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Parties</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Escrow Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Escrow Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {filtered.map((o) => {
                  const currentPaymentSt = (o.payment_status || o.status || "pending").toLowerCase();
                  const isReleased = currentPaymentSt === "escrow_released" || o.escrow_status === "released";
                  const isRefunded = currentPaymentSt === "refunded" || o.escrow_status === "refunded";

                  return (
                    <tr key={o.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                          <Building2 size={13} className="text-muted-foreground" />
                          {o.buyer_organization?.company_name || o.buyer?.full_name || "B2B Buyer"}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Supplier: {o.supplier_organization?.company_name || "Verified Supplier"}
                        </p>
                      </td>

                      <td className="px-4 py-3 font-bold text-foreground">
                        ${Number(o.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadgeMap[currentPaymentSt] || statusBadgeMap.pending}`}>
                          {isReleased ? "Escrow Released" : isRefunded ? "Refunded" : currentPaymentSt.replace("_", " ")}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {actionLoadingId === o.id ? (
                            <span className="text-xs font-semibold text-primary flex items-center gap-1">
                              <Loader2 size={13} className="animate-spin" /> Processing...
                            </span>
                          ) : isReleased ? (
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              ✓ Paid Out
                            </span>
                          ) : isRefunded ? (
                            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                              ✓ Refunded
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEscrowAction(o.id, "release")}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded transition-colors flex items-center gap-1"
                              >
                                <CheckCircle2 size={12} /> Release
                              </button>
                              <button
                                onClick={() => handleEscrowAction(o.id, "refund")}
                                className="px-2.5 py-1 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 border border-red-200 dark:border-red-900 font-semibold text-xs rounded transition-colors flex items-center gap-1"
                              >
                                <XCircle size={12} /> Refund
                              </button>
                            </>
                          )}
                          <Link
                            href={`/dashboard/orders/${o.id}`}
                            className="px-2 py-1 border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground rounded text-xs font-semibold transition-colors flex items-center gap-0.5"
                          >
                            Details <ArrowUpRight size={11} />
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
