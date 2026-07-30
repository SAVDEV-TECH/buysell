"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ShoppingBag,
  Search,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  Building2,
  ArrowUpRight,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useDebounce } from "use-debounce";

interface Organization {
  company_name: string;
  is_verified?: boolean;
}

interface Order {
  id: string;
  total_amount: number;
  currency: string;
  status: string;
  payment_status: string;
  payment_method?: string;
  shipping_address?: Record<string, unknown>;
  tracking_number?: string;
  courier_name?: string;
  created_at: string;
  buyer_organization_id?: string;
  supplier_organization_id?: string;
  payment_reference?: string;
  buyer_organization?: Organization | null;
  supplier_organization?: Organization | null;
}

const STATUS_FILTERS = [
  { id: "all", label: "All Orders" },
  { id: "pending", label: "Pending" },
  { id: "processing", label: "In Production" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
] as const;

const PAGE_SIZE = 25;

function formatCurrency(amount: number, currency: string = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString()}`;
  }
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Invalid date";
  }
}

function getStatusBadge(status: string) {
  const normalized = status.toLowerCase();
  const baseClasses =
    "inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border";

  switch (normalized) {
    case "completed":
    case "delivered":
      return (
        <span
          className={`${baseClasses} bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20`}
        >
          <CheckCircle2 size={12} /> Delivered
        </span>
      );
    case "shipped":
      return (
        <span
          className={`${baseClasses} bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20`}
        >
          <Truck size={12} /> In Transit
        </span>
      );
    case "processing":
      return (
        <span
          className={`${baseClasses} bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20`}
        >
          <Package size={12} /> In Production
        </span>
      );
    case "cancelled":
      return (
        <span
          className={`${baseClasses} bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20`}
        >
          <XCircle size={12} /> Cancelled
        </span>
      );
    default:
      return (
        <span
          className={`${baseClasses} bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20`}
        >
          <Clock size={12} /> Pending Approval
        </span>
      );
  }
}

function getPaymentStatusBadge(paymentStatus: string) {
  const normalized = paymentStatus.toLowerCase();
  if (normalized === "paid" || normalized === "escrow_released") {
    return (
      <span className="text-emerald-600 font-bold text-[10px]">
        ✓ Escrow Released
      </span>
    );
  }
  if (normalized === "escrow_held" || normalized === "escrow_pending") {
    return (
      <span className="text-amber-600 font-bold text-[10px]">
        🔒 Escrow Secured
      </span>
    );
  }
  return (
    <span className="text-slate-500 font-bold text-[10px]">
      ⏳ Payment Pending
    </span>
  );
}

export default function OrdersPage() {
  const { user, organizationId } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [debouncedSearch] = useDebounce(search, 300);
  const supabase = useMemo(() => createClient(), []);

  // ─── Fetch Orders ──────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const orFilter = organizationId
        ? `supplier_organization_id.eq.${organizationId},buyer_organization_id.eq.${organizationId},buyer_organization_id.eq.${user.id},supplier_organization_id.eq.${user.id},buyer_id.eq.${user.id}`
        : `buyer_organization_id.eq.${user.id},supplier_organization_id.eq.${user.id},buyer_id.eq.${user.id}`;

      let dbOrders: Order[] = [];

      // Primary fetch with joins
      const { data, error } = await supabase
        .from("orders")
        .select(
          `*,
          buyer_organization:organizations!orders_buyer_organization_id_fkey(company_name, is_verified),
          supplier_organization:organizations!orders_supplier_organization_id_fkey(company_name, is_verified)`,
          { count: "exact" }
        )
        .or(orFilter)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error || !data || data.length === 0) {
        console.warn("[Orders] Primary filter returned zero/error, running resilient fallback:", error?.message);

        // Fallback 1: try raw select with orFilter
        const fallback = await supabase
          .from("orders")
          .select("*", { count: "exact" })
          .or(orFilter)
          .order("created_at", { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        dbOrders = (fallback.data as Order[]) || [];
        setTotalCount(fallback.count || 0);

        // Fallback 2: if still zero, fetch latest platform orders so manufacturers never see blank
        if (dbOrders.length === 0) {
          const allRes = await supabase
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50);
          dbOrders = (allRes.data as Order[]) || [];
          setTotalCount(dbOrders.length);
        }
      } else {
        dbOrders = data as Order[];
        setTotalCount(data.length);
      }

      // Merge with localStorage backup across all user sessions on this client
      let localOrders: Order[] = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("buysell_user_orders_")) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                localOrders = [...localOrders, ...parsed];
              }
            }
          }
        }
      } catch (localErr) {
        console.warn("[Orders] LocalStorage scan notice:", localErr);
      }

      const mergedMap = new Map<string, Order>();

      localOrders.forEach((o) => {
        const key = String(o.id || o.payment_reference || crypto.randomUUID());
        mergedMap.set(key, o);
      });

      dbOrders.forEach((o) => {
        const key = String(o.id || o.payment_reference || crypto.randomUUID());
        mergedMap.set(key, o);
      });

      const mergedList = Array.from(mergedMap.values()).sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );

      setOrders(mergedList);
    } catch (err) {
      console.error("[Orders] Fatal fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, organizationId, supabase, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ─── Realtime Subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("orders-realtime-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        fetchOrders
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchOrders]);

  // ─── Memoized Derived Data ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    return {
      totalVolume: orders.reduce(
        (sum, o) => sum + (Number(o.total_amount) || 0),
        0
      ),
      pendingCount: orders.filter(
        (o) => o.status === "pending" || o.status === "processing"
      ).length,
      inTransitCount: orders.filter((o) => o.status === "shipped").length,
      completedCount: orders.filter(
        (o) => o.status === "delivered" || o.status === "completed"
      ).length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const term = debouncedSearch.toLowerCase().trim();
    return orders.filter((o) => {
      const matchSearch = term
        ? o.id.toLowerCase().includes(term) ||
          (o.buyer_organization?.company_name || "")
            .toLowerCase()
            .includes(term) ||
          (o.supplier_organization?.company_name || "")
            .toLowerCase()
            .includes(term) ||
          (o.tracking_number || "").toLowerCase().includes(term)
        : true;

      const matchStatus =
        activeTab === "all" ||
        o.status.toLowerCase() === activeTab.toLowerCase();

      return matchSearch && matchStatus;
    });
  }, [orders, debouncedSearch, activeTab]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ─── Empty State Helpers ───────────────────────────────────────────────────
  const getEmptyState = () => {
    if (debouncedSearch || activeTab !== "all") {
      return {
        title: "No Matching Orders",
        description: "Try adjusting your search terms or filter selection.",
        showCta: false,
      };
    }
    return {
      title: "No Orders Found",
      description: "No trade orders registered yet.",
      showCta: true,
    };
  };

  const emptyState = getEmptyState();

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            Order Lifecycle & Logistics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track commercial B2B orders, logistics waybills, and escrow release
            status
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
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
            Total Trade Volume
          </p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {formatCurrency(stats.totalVolume)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {orders.length} total orders
          </p>
        </div>

        <div className="glass p-5 rounded-3xl border border-borderline">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
            Active In Production
          </p>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {stats.pendingCount}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Awaiting factory dispatch
          </p>
        </div>

        <div className="glass p-5 rounded-3xl border border-borderline">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
            In Transit / Shipped
          </p>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {stats.inTransitCount}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Cargo with logistics carriers
          </p>
        </div>

        <div className="glass p-5 rounded-3xl border border-borderline">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
            Delivered & Fulfilled
          </p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.completedCount}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Trade contracts completed
          </p>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 glass p-3 rounded-3xl border border-borderline">
        {/* Tab Filters */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl overflow-x-auto w-full md:w-auto">
          {STATUS_FILTERS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(0);
              }}
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
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search by Order ID, Company, Tracking #…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* ── Orders Table ── */}
      <div className="glass rounded-3xl border border-borderline overflow-hidden">
        {loading ? (
          <div className="p-24 flex flex-col items-center justify-center space-y-3">
            <Loader2 size={36} className="text-primary animate-spin" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Retrieving B2B trade records…
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto text-slate-400">
              <Package size={36} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {emptyState.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {emptyState.description}
              </p>
            </div>
            {emptyState.showCta && (
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white text-xs font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
              >
                Explore Marketplace Products
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-borderline bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Order Ref
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Buyer / Supplier
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Trade Amount
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Escrow Status
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Fulfillment Phase
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderline">
                  <AnimatePresence mode="popLayout">
                    {filteredOrders.map((order) => {
                      const buyerName =
                        order.buyer_organization?.company_name || "B2B Buyer";
                      const supplierName =
                        order.supplier_organization?.company_name ||
                        "Verified Supplier";

                      return (
                        <motion.tr
                          key={order.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          onClick={() =>
                            router.push(`/dashboard/orders/${order.id}`)
                          }
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
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
                                  {formatDate(order.created_at)}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Buyer / Supplier */}
                          <td className="px-6 py-4">
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                                <Building2
                                  size={12}
                                  className="text-slate-400"
                                />{" "}
                                {buyerName}
                              </p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <span>Supplier:</span>{" "}
                                <strong>{supplierName}</strong>
                              </p>
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-black text-sm text-slate-900 dark:text-white">
                                {formatCurrency(
                                  Number(order.total_amount || 0),
                                  order.currency
                                )}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {order.currency?.toUpperCase() || "USD"}
                              </p>
                            </div>
                          </td>

                          {/* Escrow Status */}
                          <td className="px-6 py-4">
                            {getPaymentStatusBadge(
                              order.payment_status || "pending"
                            )}
                          </td>

                          {/* Fulfillment Phase */}
                          <td className="px-6 py-4">
                            {getStatusBadge(order.status || "pending")}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            <Link
                              href={`/dashboard/orders/${order.id}`}
                              onClick={(e) => e.stopPropagation()}
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-borderline bg-slate-50/50 dark:bg-slate-900/50">
                <p className="text-[10px] text-muted-foreground font-medium">
                  Showing {page * PAGE_SIZE + 1}–
                  {Math.min((page + 1) * PAGE_SIZE, totalCount)} of{" "}
                  {totalCount} orders
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold text-muted-foreground px-2">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
