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
  inactive:     { label: "Inactive",     color: "text-muted-foreground",   bg: "bg-muted border-border", icon: XCircle },
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
        className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 text-foreground"
      >
        <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto">
          <AlertTriangle size={24} className="text-red-500" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">Delete Listing?</h3>
          <p className="text-xs text-muted-foreground mt-1">
            <strong>{product.title}</strong> will be permanently removed from the marketplace. This cannot be undone.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted text-foreground transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
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
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-all border border-border"
      >
        Actions <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-xl shadow-xl z-30 overflow-hidden py-1"
          >
            {[
              { icon: Edit, label: "Edit Listing", action: onEdit, color: "text-foreground" },
              {
                icon: isActive ? ToggleLeft : ToggleRight,
                label: isActive ? "Set Inactive" : "Set Active",
                action: onToggleStatus,
                color: isActive ? "text-amber-500" : "text-emerald-500",
              },
              { icon: Copy, label: "Duplicate", action: onDuplicate, color: "text-foreground" },
              { icon: ExternalLink, label: "View in Market", action: () => window.open("/marketplace", "_blank"), color: "text-foreground" },
              { icon: Trash2, label: "Delete", action: onDelete, color: "text-red-500" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => { item.action(); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium hover:bg-muted transition-colors ${item.color}`}
              >
                <item.icon size={13} />
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
    <div className="bg-card p-4 rounded-xl border border-border flex items-center justify-between shadow-sm">
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-2xl font-bold ${color || "text-foreground"}`}>{value}</p>
      </div>
      <BarChart2 size={24} className="text-muted-foreground/30" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Product Catalogue</h1>
          <p className="text-muted-foreground text-xs mt-1">{stats.total} listing{stats.total !== 1 ? "s" : ""} · Supplier workspace</p>
        </div>
        <Link
          href="/dashboard/new-product"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold text-xs shadow-sm hover:bg-primary/90 transition-all"
        >
          <Plus size={15} /> Add New Product
        </Link>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Listings" value={stats.total}    color="" />
        <StatCard label="Active"         value={stats.active}   color="text-emerald-500" />
        <StatCard label="Draft"          value={stats.draft}    color="text-amber-500" />
        <StatCard label="Inactive"       value={stats.inactive} color="text-muted-foreground" />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title or HS code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-card rounded-xl border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 bg-muted rounded-xl border border-border p-1">
          {(["all", "active", "draft", "inactive", "under_review"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${statusFilter === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
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
            className="flex items-center gap-3 px-4 py-2.5 bg-primary/10 border border-primary/20 rounded-xl"
          >
            <span className="text-xs font-bold text-primary">{selectedIds.size} selected</span>
            <div className="flex-1" />
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value as any)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-border bg-card text-foreground outline-none"
            >
              <option value="">Bulk action…</option>
              <option value="activate">Set Active</option>
              <option value="deactivate">Set Inactive</option>
              <option value="delete">Delete Selected</option>
            </select>
            <button
              onClick={applyBulkAction}
              disabled={!bulkAction}
              className="px-3.5 py-1.5 bg-primary text-white text-xs font-bold rounded-lg disabled:opacity-40 hover:bg-primary/90 transition-all shadow-sm"
            >
              Apply
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Table ── */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="text-primary animate-spin" />
            <p className="text-xs text-muted-foreground font-medium">Fetching your catalogue…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
            <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center">
              <Package size={28} className="text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {search || statusFilter !== "all" ? "No products match your filters" : "No products listed yet"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {search || statusFilter !== "all"
                  ? "Try adjusting your search or filter."
                  : "Start building your catalogue — add your first product to the global marketplace."}
              </p>
            </div>
            {!search && statusFilter === "all" && (
              <Link
                href="/dashboard/new-product"
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-xs shadow-sm hover:bg-primary/90 transition-all"
              >
                <Plus size={15} /> List First Product
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="w-10 px-5 py-3.5">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                    />
                  </th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Product</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Category</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">MOQ</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Price / Unit</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
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
                        className={`transition-colors hover:bg-muted/40 ${selectedIds.has(product.id) ? "bg-primary/5" : ""}`}
                      >
                        {/* Checkbox */}
                        <td className="px-5 py-3.5">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(product.id)}
                            onChange={() => toggleSelect(product.id)}
                            className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                          />
                        </td>

                        {/* Product */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-muted border border-border flex-shrink-0 overflow-hidden flex items-center justify-center">
                              {product.image_urls && product.image_urls.length > 0 ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={product.image_urls[0]} alt={product.title} className="w-full h-full object-cover" />
                              ) : (
                                <Package size={16} className="text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-xs leading-tight line-clamp-1 text-foreground">{product.title}</p>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                {product.hs_code ? `HS ${product.hs_code}` : "No HS code"} · {product.unit_of_measure}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <span className="text-xs font-medium text-muted-foreground">
                            {(product.product_categories as any)?.name || "General"}
                          </span>
                        </td>

                        {/* MOQ */}
                        <td className="px-5 py-3.5 hidden lg:table-cell">
                          <span className="text-xs font-bold text-foreground">{getMoqDisplay(product)}</span>
                        </td>

                        {/* Price */}
                        <td className="px-5 py-3.5">
                          <div>
                            <span className="text-xs font-bold text-foreground">{getBasePrice(product)}</span>
                            {product.tiered_pricing && product.tiered_pricing.length > 1 && (
                              <span className="ml-1 text-[10px] text-primary font-bold">+{product.tiered_pricing.length - 1} tiers</span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => toggleStatus(product)}
                            disabled={isToggling}
                            title="Click to toggle active/inactive"
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all hover:opacity-80 ${cfg.bg} ${cfg.color} ${isToggling ? "opacity-50" : ""}`}
                          >
                            {isToggling ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <StatusIcon size={10} />
                            )}
                            {cfg.label}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right">
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
            <div className="px-5 py-3 border-t border-border flex items-center justify-between bg-muted/20">
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
