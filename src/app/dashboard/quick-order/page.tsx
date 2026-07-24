"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { createClient } from "@/lib/supabase/client";
import {
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileSpreadsheet,
  Download,
  ShoppingBag,
  ArrowRight,
  Search,
  Package,
  Layers,
  DollarSign,
  RefreshCw,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Product {
  id: string;
  title: string;
  hs_code?: string;
  unit_of_measure: string;
  min_order_quantity: number;
  tiered_pricing?: Array<{ min_qty: number; unit_price: number }>;
  image_urls?: string[];
}

interface QuickOrderRow {
  id: string;
  skuSearch: string;
  matchedProduct: Product | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  status: "empty" | "valid" | "moq_warning" | "invalid_sku";
  message?: string;
}

export default function QuickOrderPage() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const router = useRouter();
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Quick Order Rows
  const [rows, setRows] = useState<QuickOrderRow[]>([
    { id: "1", skuSearch: "", matchedProduct: null, quantity: 100, unitPrice: 0, lineTotal: 0, status: "empty" },
    { id: "2", skuSearch: "", matchedProduct: null, quantity: 100, unitPrice: 0, lineTotal: 0, status: "empty" },
    { id: "3", skuSearch: "", matchedProduct: null, quantity: 100, unitPrice: 0, lineTotal: 0, status: "empty" },
  ]);

  // CSV Drag-and-Drop state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsingCsv, setParsingCsv] = useState(false);
  const [csvResult, setCsvResult] = useState<{ validCount: number; errorCount: number } | null>(null);

  // Fetch all active products for autocomplete lookup
  useEffect(() => {
    async function loadProducts() {
      setLoadingProducts(true);
      try {
        const { data } = await supabase
          .from("products")
          .select("id, title, hs_code, unit_of_measure, min_order_quantity, tiered_pricing, image_urls")
          .eq("status", "active");

        setProducts((data as Product[]) || []);
      } catch (err) {
        console.error("Error loading products for quick order:", err);
      } finally {
        setLoadingProducts(false);
      }
    }

    loadProducts();
  }, [supabase]);

  // Calculate Unit Price based on Quantity & Tiered Pricing
  const calculatePrice = (product: Product, qty: number): number => {
    if (!product.tiered_pricing || product.tiered_pricing.length === 0) return 0;
    const sortedTiers = [...product.tiered_pricing].sort((a, b) => b.min_qty - a.min_qty);
    for (const tier of sortedTiers) {
      if (qty >= tier.min_qty) return tier.unit_price;
    }
    return product.tiered_pricing[0]?.unit_price || 0;
  };

  // Update a row
  const updateRow = (id: string, searchVal: string, qtyVal: number) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        if (!searchVal.trim()) {
          return { ...row, skuSearch: "", matchedProduct: null, quantity: qtyVal, unitPrice: 0, lineTotal: 0, status: "empty" };
        }

        // Search product by ID, title, or HS code
        const matched = products.find(
          (p) =>
            p.id.toLowerCase() === searchVal.toLowerCase().trim() ||
            p.title.toLowerCase().includes(searchVal.toLowerCase().trim()) ||
            (p.hs_code && p.hs_code.toLowerCase() === searchVal.toLowerCase().trim())
        );

        if (!matched) {
          return {
            ...row,
            skuSearch: searchVal,
            matchedProduct: null,
            quantity: qtyVal,
            unitPrice: 0,
            lineTotal: 0,
            status: "invalid_sku",
            message: "SKU or Product not found",
          };
        }

        const moq = matched.min_order_quantity || 1;
        const isMoqValid = qtyVal >= moq;
        const unitP = calculatePrice(matched, qtyVal);
        const total = unitP * qtyVal;

        return {
          ...row,
          skuSearch: searchVal,
          matchedProduct: matched,
          quantity: qtyVal,
          unitPrice: unitP,
          lineTotal: total,
          status: isMoqValid ? "valid" : "moq_warning",
          message: isMoqValid ? "Valid" : `Minimum order quantity is ${moq} ${matched.unit_of_measure}`,
        };
      })
    );
  };

  const addRow = () => {
    const newId = String(Date.now());
    setRows((prev) => [...prev, { id: newId, skuSearch: "", matchedProduct: null, quantity: 100, unitPrice: 0, lineTotal: 0, status: "empty" }]);
  };

  const removeRow = (id: string) => {
    if (rows.length === 1) {
      setRows([{ id: "1", skuSearch: "", matchedProduct: null, quantity: 100, unitPrice: 0, lineTotal: 0, status: "empty" }]);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // CSV Drag and Drop Handler
  const handleCsvUpload = (file: File) => {
    setCsvFile(file);
    setParsingCsv(true);
    setCsvResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r\n|\n/).map((l) => l.trim()).filter(Boolean);
      let valid = 0;
      let errors = 0;
      const newRows: QuickOrderRow[] = [];

      lines.forEach((line, idx) => {
        // Ignore header row if present
        if (idx === 0 && (line.toLowerCase().includes("sku") || line.toLowerCase().includes("product"))) return;

        const parts = line.split(",").map((p) => p.trim());
        const skuVal = parts[0];
        const qtyVal = parseInt(parts[1]) || 100;

        if (!skuVal) return;

        const matched = products.find(
          (p) =>
            p.id.toLowerCase() === skuVal.toLowerCase() ||
            p.title.toLowerCase().includes(skuVal.toLowerCase()) ||
            (p.hs_code && p.hs_code.toLowerCase() === skuVal.toLowerCase())
        );

        if (matched) {
          const unitP = calculatePrice(matched, qtyVal);
          const moq = matched.min_order_quantity || 1;
          const isMoqValid = qtyVal >= moq;
          if (isMoqValid) valid++; else errors++;

          newRows.push({
            id: String(Date.now() + idx),
            skuSearch: matched.title,
            matchedProduct: matched,
            quantity: qtyVal,
            unitPrice: unitP,
            lineTotal: unitP * qtyVal,
            status: isMoqValid ? "valid" : "moq_warning",
            message: isMoqValid ? "Valid" : `MOQ is ${moq}`,
          });
        } else {
          errors++;
          newRows.push({
            id: String(Date.now() + idx),
            skuSearch: skuVal,
            matchedProduct: null,
            quantity: qtyVal,
            unitPrice: 0,
            lineTotal: 0,
            status: "invalid_sku",
            message: "SKU not found",
          });
        }
      });

      if (newRows.length > 0) setRows(newRows);
      setCsvResult({ validCount: valid, errorCount: errors });
      setParsingCsv(false);
    };

    reader.readAsText(file);
  };

  // Add all valid items to Cart
  const handleAddAllToCart = () => {
    const validRows = rows.filter((r) => r.status === "valid" && r.matchedProduct);
    if (validRows.length === 0) return;

    validRows.forEach((r) => {
      if (r.matchedProduct) {
        addToCart(
          {
            id: r.matchedProduct.id,
            name: r.matchedProduct.title,
            price: r.unitPrice,
            imageUrl: r.matchedProduct.image_urls?.[0] || "",
            moq: r.matchedProduct.min_order_quantity,
          },
          r.quantity
        );
      }
    });

    router.push("/checkout");
  };

  const grandTotal = rows.reduce((sum, r) => sum + r.lineTotal, 0);
  const validItemCount = rows.filter((r) => r.status === "valid").length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Bulk Quick-Order & CSV Importer</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Enterprise procurement pad · Enter SKUs or drag-and-drop CSV orders for instant volume checkout
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="data:text/csv;charset=utf-8,sku,quantity%0AHS7304,500%0AStainless Steel Sheet,200"
            download="buy_sell_quick_order_template.csv"
            className="flex items-center gap-2 px-4 py-2.5 glass border border-borderline text-xs font-bold rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <Download size={14} /> Download Sample CSV
          </a>
        </div>
      </div>

      {/* ── Drag & Drop CSV Importer Section ── */}
      <div className="glass rounded-3xl border border-borderline p-6 md:p-8 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
          <FileSpreadsheet size={18} className="text-primary" /> CSV / Excel Bulk Importer
        </h2>

        <label
          htmlFor="csv-upload"
          className="flex flex-col items-center justify-center w-full h-36 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-all group text-center p-4"
        >
          <Upload size={28} className="text-primary/50 group-hover:text-primary transition-colors mb-2" />
          <p className="text-xs font-bold text-slate-900 dark:text-white">
            {csvFile ? csvFile.name : "Drag & drop CSV order file here, or click to browse"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">File format: SKU, Quantity (e.g. HS7304.11, 500)</p>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleCsvUpload(e.target.files[0]);
            }}
          />
        </label>

        {csvResult && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-borderline text-xs">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-500" /> Processed {csvResult.validCount} valid line items
            </span>
            {csvResult.errorCount > 0 && (
              <span className="font-bold text-amber-600 flex items-center gap-1">
                <AlertTriangle size={14} /> {csvResult.errorCount} items require review below
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Interactive Multi-Row Quick Order Grid ── */}
      <div className="glass rounded-3xl border border-borderline p-6 md:p-8 space-y-6">
        <div className="flex justify-between items-center border-b border-borderline pb-4">
          <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Layers size={18} className="text-primary" /> Procurement Quick-Order Grid
          </h2>

          <button
            onClick={() => setRows([{ id: "1", skuSearch: "", matchedProduct: null, quantity: 100, unitPrice: 0, lineTotal: 0, status: "empty" }])}
            className="text-xs font-bold text-muted-foreground hover:text-red-500 transition-colors flex items-center gap-1"
          >
            <RefreshCw size={13} /> Reset Pad
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-borderline bg-slate-50/50 dark:bg-slate-900/50">
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-12">#</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Product Title / SKU / HS Code</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-36">Quantity</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-32">Unit Price ($)</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-32 text-right">Line Total ($)</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderline">
              {rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="px-4 py-3 text-xs font-bold text-muted-foreground">{idx + 1}</td>

                  {/* SKU / Title Autocomplete */}
                  <td className="px-4 py-3">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search title, SKU, or HS code…"
                        value={row.skuSearch}
                        onChange={(e) => updateRow(row.id, e.target.value, row.quantity)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all ${
                          row.status === "valid"
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : row.status === "moq_warning"
                            ? "border-amber-500/40 bg-amber-500/5"
                            : row.status === "invalid_sku"
                            ? "border-red-500/40 bg-red-500/5"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        }`}
                      />
                      {row.matchedProduct && (
                        <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                          ✓ {row.matchedProduct.title} (MOQ: {row.matchedProduct.min_order_quantity} {row.matchedProduct.unit_of_measure})
                        </p>
                      )}
                      {row.status === "invalid_sku" && (
                        <p className="text-[10px] font-bold text-red-500 mt-1">⚠️ {row.message}</p>
                      )}
                      {row.status === "moq_warning" && (
                        <p className="text-[10px] font-bold text-amber-600 mt-1">⚠️ {row.message}</p>
                      )}
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) => updateRow(row.id, row.skuSearch, Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </td>

                  {/* Unit Price */}
                  <td className="px-4 py-3 text-xs font-bold text-slate-900 dark:text-white">
                    {row.unitPrice > 0 ? `$${row.unitPrice.toLocaleString()}` : "—"}
                  </td>

                  {/* Line Total */}
                  <td className="px-4 py-3 text-xs font-black text-right text-slate-900 dark:text-white">
                    {row.lineTotal > 0 ? `$${row.lineTotal.toLocaleString()}` : "—"}
                  </td>

                  {/* Remove Row */}
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => removeRow(row.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Row Button */}
        <div className="pt-2 flex justify-between items-center">
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 text-xs font-black text-primary hover:text-primary/80 transition-colors"
          >
            <Plus size={14} /> Add Another Row
          </button>

          <span className="text-xs font-bold text-muted-foreground">
            {validItemCount} valid SKU{validItemCount !== 1 ? "s" : ""} selected
          </span>
        </div>

        {/* Total & Checkout Bar */}
        <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">BULK ORDER ESTIMATE</p>
            <h3 className="text-3xl font-black mt-0.5">${grandTotal.toLocaleString()} USD</h3>
            <p className="text-xs text-white/50">{validItemCount} valid items ready for bulk checkout</p>
          </div>

          <button
            onClick={handleAddAllToCart}
            disabled={validItemCount === 0}
            className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/25 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
          >
            Proceed to Bulk Checkout <ArrowRight size={18} />
          </button>
        </div>
      </div>

    </div>
  );
}
