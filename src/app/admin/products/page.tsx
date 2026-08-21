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
  Building2,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import BuySellLoader from "@/components/BuySellLoader";

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

  if (loading) {
    return <BuySellLoader message="Loading catalog products..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Package size={20} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">Product Management</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {publishedCount} live · {products.length - publishedCount} unlisted / hidden
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

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
          {(["all", "published", "unpublished"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setPublishFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${
                publishFilter === f
                  ? "bg-card text-foreground shadow-sm font-bold border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by product name or supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-center p-6">
            <Package size={32} className="text-muted-foreground/50" />
            <p className="text-sm font-semibold text-foreground">No products found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your search query or filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-foreground line-clamp-1">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">#{p.id.slice(0, 8)}</p>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground flex items-center gap-1.5">
                        <Building2 size={13} className="text-muted-foreground" />
                        {(p.supplier as any)?.company_name || "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {(p.category as any)?.name || "General"}
                    </td>

                    <td className="px-4 py-3 font-bold text-foreground">
                      ${Number(p.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        p.is_published
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : "bg-muted text-muted-foreground border-border"
                      }`}>
                        {p.is_published ? "Published" : "Hidden"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/marketplace/${p.id}`}
                          target="_blank"
                          className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="View on marketplace"
                        >
                          <ExternalLink size={13} />
                        </Link>

                        <button
                          onClick={() => togglePublish(p)}
                          disabled={processingId === p.id}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            p.is_published
                              ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100"
                              : "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                          }`}
                          title={p.is_published ? "Hide from marketplace" : "Publish to marketplace"}
                        >
                          {processingId === p.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : p.is_published ? (
                            <EyeOff size={13} />
                          ) : (
                            <Eye size={13} />
                          )}
                        </button>

                        <button
                          onClick={() => deleteProduct(p.id)}
                          disabled={processingId === p.id}
                          className="p-1.5 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                          title="Delete product"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
