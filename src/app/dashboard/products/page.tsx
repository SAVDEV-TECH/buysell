"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Package,
  Trash2,
  Edit,
  Plus,
  Search,
  Loader2,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  BarChart2,
  Eye,
  Copy,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
type ProductStatus = "active" | "inactive" | "draft" | "under_review";

interface TierPrice {
  min_qty: number;
  unit_price: number;
}

interface Product {
  id: string;
  title: string;
  description: string | null;
  unit_of_measure: string;
  hs_code: string | null;
  min_order_quantity: number;
  tiered_pricing: TierPrice[] | null;
  status: ProductStatus;
  image_urls: string[] | null;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  supplier_organization_id: string;
  // joined
  product_categories?: { name: string } | null;
}

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ProductStatus, { label: string; color: string; bg: string; icon: any }> = {
  active:       { label: "Active",       color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-200",  icon: CheckCircle2 },
  inactive:     { label: "Inactive",     color: "text-slate-500",   bg: "bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700", icon: XCircle },
  draft:        { label: "Draft",        color: "text-amber-600",   bg: "bg-amber-500/10 border-amber-200",     icon: Clock },
  under_review: { label: "Under Review", color: "text-blue-600",    bg: "bg-blue-500/10 border-blue-200",       icon: Eye },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getBasePrice(p: Product): string {
  const tiers = p.tiered_pricing;
  if (!tiers || tiers.length === 0) return "—";
  const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);
  return `$${sorted[0].unit_price.toLocaleString()}`;
}

function getMoqDisplay(p: Product): string {
  const tiers = p.tiered_pricing;
  const moq = p.min_order_quantity;
  if (tiers && tiers.length > 0) {
    const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);
    return `${sorted[0].min_qty} ${p.unit_of_measure}`;
  }
  return `${moq} ${p.unit_of_measure}`;
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({
  product,
  onConfirm,
  onCancel,
  loading,
}: {
  product: Product;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-5"
      >
        <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-black">Delete Listing?</h3>
          <p className="text-sm text-muted-foreground mt-1">
            <strong>{product.title}</strong> will be permanently removed from the marketplace. This cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Row Actions Dropdown ─────────────────────────────────────────────────────
function RowActions({
  product,
  onEdit,
  onDelete,
  onToggleStatus,
  onDuplicate,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onDuplicate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive = product.status === "active";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
      >
        Actions <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-30 overflow-hidden py-1"
          >
            {[
              { icon: Edit, label: "Edit Listing", action: onEdit, color: "" },
              {
                icon: isActive ? ToggleLeft : ToggleRight,
                label: isActive ? "Set Inactive" : "Set Active",
                action: onToggleStatus,
                color: isActive ? "text-amber-600" : "text-emerald-600",
              },
              { icon: Copy, label: "Duplicate", action: onDuplicate, color: "" },
              { icon: ExternalLink, label: "View in Market", action: () => window.open("/marketplace", "_blank"), color: "" },
              { icon: Trash2, label: "Delete", action: onDelete, color: "text-red-500" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => { item.action(); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${item.color}`}
              >
                <item.icon size={14} />
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyProductsPage() {
  const { organizationId } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<"" | "activate" | "deactivate" | "delete">("");

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    if (!organizationId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_categories(name)")
        .eq("supplier_organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts((data as Product[]) || []);
    } catch (e) {
      console.error("[Products] fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [organizationId, supabase]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = {
    total:    products.length,
    active:   products.filter((p) => p.status === "active").length,
    draft:    products.filter((p) => p.status === "draft").length,
    inactive: products.filter((p) => p.status === "inactive").length,
  };

  // ── Filter ───────────────────────────────────────────────────────────────────
  const filtered = products.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.hs_code || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ── Select all ───────────────────────────────────────────────────────────────
  const allSelected = filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id));
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((p) => p.id)));
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await supabase.from("products").delete().eq("id", deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  // ── Toggle Status ────────────────────────────────────────────────────────────
  const toggleStatus = async (product: Product) => {
    const nextStatus: ProductStatus = product.status === "active" ? "inactive" : "active";
    setTogglingId(product.id);
    try {
      await supabase.from("products").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", product.id);
      setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, status: nextStatus } : p));
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingId(null);
    }
  };

  // ── Duplicate ────────────────────────────────────────────────────────────────
  const duplicateProduct = async (product: Product) => {
    if (!organizationId) return;
    try {
      const { id, created_at, updated_at, ...rest } = product;
      await supabase.from("products").insert({
        ...rest,
        title: `${product.title} (Copy)`,
        status: "draft",
        supplier_organization_id: organizationId,
      });
      fetchProducts();
    } catch (e) {
      console.error(e);
    }
  };

  // ── Bulk Actions ─────────────────────────────────────────────────────────────
  const applyBulkAction = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || !bulkAction) return;
    try {
      if (bulkAction === "activate") {
        await supabase.from("products").update({ status: "active" }).in("id", ids);
        setProducts((prev) => prev.map((p) => selectedIds.has(p.id) ? { ...p, status: "active" } : p));
      } else if (bulkAction === "deactivate") {
        await supabase.from("products").update({ status: "inactive" }).in("id", ids);
        setProducts((prev) => prev.map((p) => selectedIds.has(p.id) ? { ...p, status: "inactive" } : p));
      } else if (bulkAction === "delete") {
        await supabase.from("products").delete().in("id", ids);
        setProducts((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      }
      setSelectedIds(new Set());
      setBulkAction("");
    } catch (e) {
      console.error(e);
    }
  };

  // ─── KPI stat card ───────────────────────────────────────────────────────────
  const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="glass p-5 rounded-2xl border border-borderline flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
        <p className={`text-2xl font-black ${color}`}>{value}</p>
      </div>
      <BarChart2 size={28} className="text-muted-foreground/20" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Product Catalogue</h1>
          <p className="text-muted-foreground text-sm mt-1">{stats.total} listing{stats.total !== 1 ? "s" : ""} · Supplier workspace</p>
        </div>
        <Link
          href="/dashboard/new-product"
          className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Plus size={16} /> Add New Product
        </Link>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Listings" value={stats.total}    color="" />
        <StatCard label="Active"         value={stats.active}   color="text-emerald-500" />
        <StatCard label="Draft"          value={stats.draft}    color="text-amber-500" />
        <StatCard label="Inactive"       value={stats.inactive} color="text-slate-400" />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title or HS code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 glass rounded-2xl border border-borderline text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 glass rounded-2xl border border-borderline p-1">
          {(["all", "active", "draft", "inactive", "under_review"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all ${statusFilter === s ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {s === "all" ? "All" : s === "under_review" ? "Review" : s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bulk Action Bar ── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-5 py-3 bg-primary/5 border border-primary/20 rounded-2xl"
          >
            <span className="text-sm font-bold text-primary">{selectedIds.size} selected</span>
            <div className="flex-1" />
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value as any)}
              className="text-xs font-bold px-3 py-2 rounded-xl border border-borderline bg-white dark:bg-slate-900 outline-none"
            >
              <option value="">Bulk action…</option>
              <option value="activate">Set Active</option>
              <option value="deactivate">Set Inactive</option>
              <option value="delete">Delete Selected</option>
            </select>
            <button
              onClick={applyBulkAction}
              disabled={!bulkAction}
              className="px-4 py-2 bg-primary text-white text-xs font-black rounded-xl disabled:opacity-40 hover:bg-primary/90 transition-all"
            >
              Apply
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Table ── */}
      <div className="glass rounded-3xl border border-borderline overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 size={36} className="text-primary animate-spin" />
            <p className="text-sm text-muted-foreground font-medium">Fetching your catalogue…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center px-6">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center">
              <Package size={32} className="text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-black">
                {search || statusFilter !== "all" ? "No products match your filters" : "No products listed yet"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {search || statusFilter !== "all"
                  ? "Try adjusting your search or filter."
                  : "Start building your catalogue — add your first product to the global marketplace."}
              </p>
            </div>
            {!search && statusFilter === "all" && (
              <Link
                href="/dashboard/new-product"
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
              >
                <Plus size={16} /> List First Product
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-borderline bg-muted/30">
                  <th className="w-10 px-5 py-4">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded accent-primary cursor-pointer"
                    />
                  </th>
                  <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Product</th>
                  <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest hidden md:table-cell">Category</th>
                  <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest hidden lg:table-cell">MOQ</th>
                  <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Price / Unit</th>
                  <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                  <th className="px-5 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((product) => {
                    const cfg = STATUS_CONFIG[product.status] || STATUS_CONFIG.inactive;
                    const StatusIcon = cfg.icon;
                    const isToggling = togglingId === product.id;
                    return (
                      <motion.tr
                        key={product.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={`border-b border-borderline transition-colors hover:bg-muted/20 ${selectedIds.has(product.id) ? "bg-primary/5" : ""}`}
                      >
                        {/* Checkbox */}
                        <td className="px-5 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(product.id)}
                            onChange={() => toggleSelect(product.id)}
                            className="w-4 h-4 rounded accent-primary cursor-pointer"
                          />
                        </td>

                        {/* Product */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-muted border border-borderline flex-shrink-0 overflow-hidden flex items-center justify-center">
                              {product.image_urls && product.image_urls.length > 0 ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={product.image_urls[0]} alt={product.title} className="w-full h-full object-cover" />
                              ) : (
                                <Package size={18} className="text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-sm leading-tight line-clamp-1">{product.title}</p>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                {product.hs_code ? `HS ${product.hs_code}` : "No HS code"} · {product.unit_of_measure}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-5 py-4 hidden md:table-cell">
                          <span className="text-xs font-semibold text-muted-foreground">
                            {(product.product_categories as any)?.name || "General"}
                          </span>
                        </td>

                        {/* MOQ */}
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <span className="text-sm font-bold">{getMoqDisplay(product)}</span>
                        </td>

                        {/* Price */}
                        <td className="px-5 py-4">
                          <div>
                            <span className="text-sm font-black">{getBasePrice(product)}</span>
                            {product.tiered_pricing && product.tiered_pricing.length > 1 && (
                              <span className="ml-1 text-[10px] text-primary font-bold">+{product.tiered_pricing.length - 1} tiers</span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <button
                            onClick={() => toggleStatus(product)}
                            disabled={isToggling}
                            title="Click to toggle active/inactive"
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all hover:opacity-80 ${cfg.bg} ${cfg.color} ${isToggling ? "opacity-50" : ""}`}
                          >
                            {isToggling ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <StatusIcon size={11} />
                            )}
                            {cfg.label}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <RowActions
                            product={product}
                            onEdit={() => router.push(`/dashboard/new-product?edit=${product.id}`)}
                            onDelete={() => setDeleteTarget(product)}
                            onToggleStatus={() => toggleStatus(product)}
                            onDuplicate={() => duplicateProduct(product)}
                          />
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-borderline flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Showing <strong>{filtered.length}</strong> of <strong>{products.length}</strong> products
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : ""}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete Confirm Modal ── */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal
            product={deleteTarget}
            onConfirm={confirmDelete}
            onCancel={() => setDeleteTarget(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
