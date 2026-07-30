"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ShoppingBag,
  Search,
  Filter,
  ChevronRight,
  Loader2,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  DollarSign,
  Building2,
  ShieldCheck,
  FileText,
  ArrowUpRight,
  Globe,
  AlertCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { VerifiedBadge } from "@/components/VerifiedBadge";

interface Order {
  id: string;
  total_amount: number;
  currency: string;
  status: string;
  payment_status: string;
  payment_method?: string;
  shipping_address?: any;
  tracking_number?: string;
  courier_name?: string;
  created_at: string;
  buyer_organization_id?: string;
  supplier_organization_id?: string;
  // joined
  buyer_organization?: { company_name: string; is_verified?: boolean } | null;
  supplier_organization?: { company_name: string; is_verified?: boolean } | null;
}

const STATUS_FILTERS = [
  { id: "all", label: "All Orders" },
  { id: "pending", label: "Pending" },
  { id: "processing", label: "In Production" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

export default function OrdersPage() {
  const { user, organizationId } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // ─── Fetch Orders ────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const orFilter = organizationId
        ? `supplier_organization_id.eq.${organizationId},buyer_organization_id.eq.${organizationId},buyer_organization_id.eq.${user.id},supplier_organization_id.eq.${user.id},buyer_id.eq.${user.id}`
        : `buyer_organization_id.eq.${user.id},supplier_organization_id.eq.${user.id},buyer_id.eq.${user.id}`;

      let dbOrders: any[] = [];

      let { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          buyer_organization:organizations!orders_buyer_organization_id_fkey(company_name, is_verified),
          supplier_organization:organizations!orders_supplier_organization_id_fkey(company_name, is_verified)
        `)
        .or(orFilter)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        console.warn("[Orders] join/filter fetch notice, trying raw select:", error?.message);
        const fallback = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });
        dbOrders = fallback.data || [];
      } else {
        dbOrders = data || [];
      }

      // Read local storage backup orders for instant zero-delay display
      let localOrders: any[] = [];
      try {
        const localKey = `buysell_user_orders_${user.id}`;
        localOrders = JSON.parse(localStorage.getItem(localKey) || "[]");
      } catch (localErr) {
        console.warn("[Orders] LocalStorage read notice:", localErr);
      }

      // Merge DB orders and local orders, prioritizing DB orders
      const mergedMap = new Map<string, any>();

      // Add local orders first
      localOrders.forEach((o) => {
        const key = String(o.id || o.payment_reference);
        mergedMap.set(key, o);
      });

      // DB orders overwrite local orders if match
      dbOrders.forEach((o) => {
        const key = String(o.id || o.payment_reference);
        mergedMap.set(key, o);
      });

      const mergedList = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );

      setOrders(mergedList as Order[]);
    } catch (err) {
      console.warn("[Orders] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, organizationId, supabase]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ─── Realtime Subscriptions ──────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("orders-realtime-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchOrders)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchOrders]);

  // ─── Filtering & Stats ───────────────────────────────────────────────────────
  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      (o.buyer_organization?.company_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.supplier_organization?.company_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.tracking_number || "").toLowerCase().includes(search.toLowerCase());

    const matchStatus = activeTab === "all" || o.status.toLowerCase() === activeTab.toLowerCase();
    return matchSearch && matchStatus;
  });

  const totalVolume = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const pendingCount = orders.filter((o) => o.status === "pending" || o.status === "processing").length;
  const inTransitCount = orders.filter((o) => o.status === "shipped").length;
  const completedCount = orders.filter((o) => o.status === "delivered" || o.status === "completed").length;

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
            <CheckCircle2 size={12} /> Delivered
          </span>
        );
      case "shipped":
        return (
          <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-blue-500/20">
            <Truck size={12} /> In Transit
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-purple-500/20">
            <Package size={12} /> In Production
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-600 dark:text-red-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-red-500/20">
            <XCircle size={12} /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-500/20">
            <Clock size={12} /> Pending Approval
          </span>
        );
    }
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    switch (paymentStatus.toLowerCase()) {
      case "paid":
      case "escrow_released":
        return <span className="text-emerald-600 font-bold text-[10px]">✓ Escrow Released</span>;
      case "escrow_held":
      case "escrow_pending":
        return <span className="text-amber-600 font-bold text-[10px]">🔒 Escrow Secured</span>;
      default:
        return <span className="text-slate-500 font-bold text-[10px]">⏳ Payment Pending</span>;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Order Lifecycle & Logistics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track commercial B2B orders, logistics waybills, and escrow release status
          </p>
        </div>

        <Link
          href="/marketplace"
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm shadow-xl shadow-primary/20 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all"
        >
          <ShoppingBag size={16} /> Browse Marketplace
        </Link>
      </div>

      {/* ── Summary KPI Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass p-5 rounded-3xl border border-borderline">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Trade Volume</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">${totalVolume.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{orders.length} total orders</p>
        </div>

        <div className="glass p-5 rounded-3xl border border-borderline">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Active In Production</p>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{pendingCount}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Awaiting factory dispatch</p>
        </div>

        <div className="glass p-5 rounded-3xl border border-borderline">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">In Transit / Shipped</p>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{inTransitCount}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Cargo with logistics carriers</p>
        </div>

        <div className="glass p-5 rounded-3xl border border-borderline">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Delivered & Fulfilled</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{completedCount}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Trade contracts completed</p>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 glass p-3 rounded-3xl border border-borderline">
        {/* Tab Filters */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl overflow-x-auto w-full md:w-auto">
          {STATUS_FILTERS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by Order ID, Company, Tracking #…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* ── Orders Table ── */}
      <div className="glass rounded-3xl border border-borderline overflow-hidden">
        {loading ? (
          <div className="p-24 flex flex-col items-center justify-center space-y-3">
            <Loader2 size={36} className="text-primary animate-spin" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Retrieving B2B trade records…</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto text-slate-400">
              <Package size={36} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">No Orders Found</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {search || activeTab !== "all" ? "Try adjusting your search or filter tab." : "No trade orders registered yet."}
              </p>
            </div>
            {!search && activeTab === "all" && (
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white text-xs font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
              >
                Explore Marketplace Products
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-borderline bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Order Ref</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Buyer / Supplier</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Trade Amount</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Escrow Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fulfillment Phase</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline">
                <AnimatePresence>
                  {filteredOrders.map((order) => {
                    const buyerName = order.buyer_organization?.company_name || "B2B Buyer";
                    const supplierName = order.supplier_organization?.company_name || "Verified Supplier";
                    return (
                      <motion.tr
                        key={order.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* Order Ref */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">
                              <ShoppingBag size={18} />
                            </div>
                            <div>
                              <p className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                                #{order.id.slice(0, 8).toUpperCase()}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                {new Date(order.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Buyer / Supplier */}
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                              <Building2 size={12} className="text-slate-400" /> {buyerName}
                            </p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <span>Supplier:</span> <strong>{supplierName}</strong>
                            </p>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-black text-sm text-slate-900 dark:text-white">
                              ${Number(order.total_amount || 0).toLocaleString()}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">{order.currency || "USD"}</p>
                          </div>
                        </td>

                        {/* Escrow Status */}
                        <td className="px-6 py-4">
                          {getPaymentStatusBadge(order.payment_status || "pending")}
                        </td>

                        {/* Fulfillment Phase */}
                        <td className="px-6 py-4">
                          {getStatusBadge(order.status || "pending")}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/dashboard/orders/${order.id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl text-xs font-extrabold transition-all"
                          >
                            Track Order <ArrowUpRight size={14} />
                          </Link>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
