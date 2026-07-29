"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Search,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Building2,
  DollarSign,
} from "lucide-react";
import Link from "next/link";

interface ProductRecord {
  id: string;
  name: string;
  price: number;
  is_published: boolean;
  created_at: string;
  category?: { name: string };
  supplier?: { company_name: string };
}

export default function AdminProductsPage() {
  const { role } = useAuth();
  const supabase = createClient();

  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [publishFilter, setPublishFilter] = useState<"all" | "published" | "unpublished">("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("products")
        .select(`
          id, name, price, is_published, created_at,
          category:product_categories(name),
          supplier:organizations(company_name)
        `)
        .order("created_at", { ascending: false })
        .limit(300);
      setProducts((data as any[]) || []);
    } catch (err) {
      console.error("Products fetch error:", err);
    }
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchProducts();
      setLoading(false);
    };
    init();
  }, [fetchProducts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  const togglePublish = async (product: ProductRecord) => {
    setProcessingId(product.id);
    try {
      await supabase
        .from("products")
        .update({ is_published: !product.is_published })
        .eq("id", product.id);
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_published: !p.is_published } : p))
      );
    } catch (err) {
      console.error("Toggle publish error:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this product? This cannot be undone.")) return;
    setProcessingId(id);
    try {
      await supabase.from("products").delete().eq("id", id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = products.filter((p) => {
    if (publishFilter === "published" && !p.is_published) return false;
    if (publishFilter === "unpublished" && p.is_published) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.name?.toLowerCase().includes(q) || (p.supplier as any)?.company_name?.toLowerCase().includes(q);
    }
    return true;
  });

  const publishedCount = products.filter((p) => p.is_published).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Package size={22} className="text-primary" /> Product Management
          </h1>
          <p className="text-slate-500 text-sm font-bold mt-1">
            {publishedCount} published · {products.length - publishedCount} unpublished
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          {(["all", "published", "unpublished"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setPublishFilter(f)}
              className={`px-4 py-2 text-[11px] font-black rounded-xl capitalize transition-all ${
                publishFilter === f ? "bg-primary text-white" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by product name or supplier…"
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
            <p className="text-slate-500 text-sm font-bold">Loading products…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Package size={36} className="text-slate-700" />
            <p className="text-slate-500 font-bold">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  {["Product", "Supplier", "Category", "Price", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                <AnimatePresence>
                  {filtered.map((p, i) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <p className="text-xs font-black text-white line-clamp-1">{p.name}</p>
                        <p className="text-[10px] text-slate-600 font-mono">{p.id.slice(0, 8)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                          <Building2 size={11} />
                          {(p.supplier as any)?.company_name || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[11px] text-slate-500 font-bold">
                          {(p.category as any)?.name || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-black text-white flex items-center gap-0.5">
                          <DollarSign size={11} />{p.price?.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                          p.is_published
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                        }`}>
                          {p.is_published ? "Live" : "Hidden"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/marketplace/${p.id}`}
                            target="_blank"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                            title="View on marketplace"
                          >
                            <ExternalLink size={12} />
                          </Link>
                          <button
                            onClick={() => togglePublish(p)}
                            disabled={processingId === p.id}
                            className={`p-1.5 rounded-lg transition-all ${
                              p.is_published
                                ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400"
                                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                            }`}
                            title={p.is_published ? "Unpublish" : "Publish"}
                          >
                            {processingId === p.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : p.is_published ? (
                              <EyeOff size={12} />
                            ) : (
                              <Eye size={12} />
                            )}
                          </button>
                          <button
                            onClick={() => deleteProduct(p.id)}
                            disabled={processingId === p.id}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                            title="Delete product"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
