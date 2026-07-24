"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Package,
  Tag,
  DollarSign,
  Type,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  X,
  Upload,
  Trash2,
  Info,
  Globe,
  Hash,
  Layers,
  ChevronDown,
  ImagePlus,
  Star,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TierPrice { min_qty: number; unit_price: number; }
interface Category { id: string; name: string; }
type ProductStatus = "active" | "inactive" | "draft";

const UNITS = ["pcs", "kg", "tons", "meters", "liters", "boxes", "pallets", "sets", "rolls", "bags"];
const CURRENCIES = ["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR", "CNY"];

// ─── Field helpers ────────────────────────────────────────────────────────────
function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <label className="text-sm font-bold">{label}</label>
      {hint && (
        <span className="relative group">
          <Info size={12} className="text-muted-foreground cursor-help" />
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-all z-10 pointer-events-none shadow-xl">
            {hint}
          </span>
        </span>
      )}
    </div>
  );
}

function Input({ icon: Icon, ...props }: any) {
  return (
    <div className="relative">
      {Icon && <Icon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />}
      <input
        {...props}
        className={`w-full ${Icon ? "pl-11" : "px-4"} pr-4 py-3 glass rounded-2xl border border-borderline focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm transition-all ${props.className || ""}`}
      />
    </div>
  );
}

function Select({ icon: Icon, children, ...props }: any) {
  return (
    <div className="relative">
      {Icon && <Icon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />}
      <select
        {...props}
        className={`w-full appearance-none ${Icon ? "pl-11" : "px-4"} pr-8 py-3 glass rounded-2xl border border-borderline focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm transition-all bg-transparent ${props.className || ""}`}
      >
        {children}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
    </div>
  );
}

// ─── Tiered Pricing Editor ────────────────────────────────────────────────────
function TieredPricingEditor({
  tiers,
  onChange,
  currency,
  unit,
}: {
  tiers: TierPrice[];
  onChange: (t: TierPrice[]) => void;
  currency: string;
  unit: string;
}) {
  const add = () => {
    const lastMin = tiers.length > 0 ? tiers[tiers.length - 1].min_qty : 0;
    onChange([...tiers, { min_qty: lastMin + 100, unit_price: 0 }]);
  };
  const remove = (i: number) => onChange(tiers.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof TierPrice, val: string) => {
    const next = [...tiers];
    next[i] = { ...next[i], [field]: parseFloat(val) || 0 };
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {tiers.length === 0 ? (
        <p className="text-xs text-muted-foreground italic px-1">
          No tiered pricing — base price applies to all quantities.
        </p>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-1">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Min Qty ({unit})</p>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Unit Price ({currency})</p>
            <div className="w-8" />
          </div>
          {tiers.map((tier, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center"
            >
              <div className="relative">
                <Layers size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number" min={1} placeholder="100"
                  value={tier.min_qty || ""}
                  onChange={(e) => update(idx, "min_qty", e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 glass rounded-xl border border-borderline text-xs outline-none focus:ring-2 focus:ring-primary/40 font-bold"
                />
              </div>
              <div className="relative">
                <DollarSign size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number" min={0} step="0.01" placeholder="0.00"
                  value={tier.unit_price || ""}
                  onChange={(e) => update(idx, "unit_price", e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 glass rounded-xl border border-borderline text-xs outline-none focus:ring-2 focus:ring-primary/40 font-bold"
                />
              </div>
              <button
                type="button"
                onClick={() => remove(idx)}
                className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
      >
        <Plus size={13} /> Add Price Tier
      </button>
    </div>
  );
}

// ─── Image Upload Panel ───────────────────────────────────────────────────────
function ImageUploadPanel({
  existingUrls,
  onFiles,
  onRemoveExisting,
  onSetPrimary,
  primaryIndex,
}: {
  existingUrls: string[];
  onFiles: (files: File[]) => void;
  onRemoveExisting: (i: number) => void;
  onSetPrimary: (i: number) => void;
  primaryIndex: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [localFiles, setLocalFiles] = useState<File[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setLocalFiles((prev) => [...prev, ...files]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    onFiles(files);
  };

  const removeLocal = (i: number) => {
    setLocalFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const allPreviews = [...existingUrls, ...previews];

  return (
    <div className="space-y-3">
      {/* Upload Zone */}
      <label
        htmlFor="product-img-upload"
        className="flex flex-col items-center justify-center w-full h-36 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-all group"
      >
        <ImagePlus size={26} className="text-primary/50 group-hover:text-primary transition-colors mb-2" />
        <p className="text-xs font-bold text-muted-foreground group-hover:text-primary transition-colors">
          Click or drag images here
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">PNG · JPG · WEBP · up to 10 MB each</p>
        <input
          ref={inputRef}
          id="product-img-upload"
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
      </label>

      {/* Preview Grid */}
      {allPreviews.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {allPreviews.map((src, i) => (
            <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-borderline">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" />
              {i === primaryIndex && (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                  <span className="text-[8px] font-black text-primary bg-white/90 dark:bg-slate-900/90 px-1.5 py-0.5 rounded-full">
                    PRIMARY
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {i !== primaryIndex && (
                  <button
                    type="button"
                    onClick={() => onSetPrimary(i)}
                    title="Set as primary"
                    className="p-1 bg-yellow-400 text-yellow-900 rounded-lg"
                  >
                    <Star size={11} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => i < existingUrls.length ? onRemoveExisting(i) : removeLocal(i - existingUrls.length)}
                  className="p-1 bg-red-500 text-white rounded-lg"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">
        ★ = Primary image shown in marketplace. Images are uploaded to Supabase Storage.
      </p>
    </div>
  );
}

// ─── Main Form Page ───────────────────────────────────────────────────────────
export default function NewProductPage() {
  const { user, organizationId } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("edit");
  const isEdit = !!editId;

  const supabase = createClient();

  // ── Form state ───────────────────────────────────────────────────────────────
  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [hsCode, setHsCode]         = useState("");
  const [unit, setUnit]             = useState("pcs");
  const [currency, setCurrency]     = useState("USD");
  const [moq, setMoq]               = useState("1");
  const [status, setStatus]         = useState<ProductStatus>("active");
  const [tiers, setTiers]           = useState<TierPrice[]>([{ min_qty: 1, unit_price: 0 }]);
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [keywords, setKeywords]     = useState("");
  const [leadTime, setLeadTime]     = useState("");
  const [certifications, setCertifications] = useState("");

  // Images
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles]         = useState<File[]>([]);
  const [primaryIndex, setPrimaryIndex]           = useState(0);

  // UI state
  const [loading, setLoading]   = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState("");

  // ── Load categories ───────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from("product_categories").select("id, name").order("name").then(({ data }) => {
      setCategories(data || []);
      if (!isEdit && data && data.length > 0) setCategoryId(data[0].id);
    });
  }, []);

  // ── Load product for editing ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !editId) return;
    const load = async () => {
      setFetching(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", editId)
          .single();
        if (error || !data) throw new Error("Product not found");

        setTitle(data.title || "");
        setDescription(data.description || "");
        setHsCode(data.hs_code || "");
        setUnit(data.unit_of_measure || "pcs");
        setMoq(String(data.min_order_quantity || 1));
        setStatus(data.status || "active");
        setCategoryId(data.category_id || "");
        setKeywords((data.keywords || []).join(", "));
        setLeadTime(data.lead_time_days ? String(data.lead_time_days) : "");
        setCertifications((data.certifications || []).join(", "));
        setExistingImageUrls(data.image_urls || []);
        if (data.tiered_pricing && data.tiered_pricing.length > 0) {
          setTiers(data.tiered_pricing);
        }
        if (data.currency) setCurrency(data.currency);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [editId, isEdit]);

  // ── Upload images to Supabase Storage ─────────────────────────────────────────
  const uploadImages = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `products/${organizationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("product-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadErr) {
        console.warn("[Images] upload error:", uploadErr.message);
        continue;
      }
      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
      if (pub?.publicUrl) urls.push(pub.publicUrl);
    }
    return urls;
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !organizationId) {
      setError("Organization missing. Complete business setup first.");
      return;
    }
    if (tiers.length === 0 || tiers[0].unit_price <= 0) {
      setError("Please set at least one price tier with a valid price.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Ensure category exists
      let catId = categoryId;
      if (!catId && categories.length === 0) {
        const { data: newCat } = await supabase
          .from("product_categories")
          .insert({ name: "General B2B", slug: "general-b2b" })
          .select()
          .single();
        catId = newCat?.id || "";
      }

      // 2. Upload new images
      const uploadedUrls = await uploadImages(newImageFiles);
      const allImageUrls = [...existingImageUrls, ...uploadedUrls];

      // Reorder so primary is first
      if (primaryIndex > 0 && primaryIndex < allImageUrls.length) {
        const primary = allImageUrls.splice(primaryIndex, 1)[0];
        allImageUrls.unshift(primary);
      }

      // 3. Parse keywords / certifications
      const keywordsArr = keywords.split(",").map((k) => k.trim()).filter(Boolean);
      const certsArr    = certifications.split(",").map((c) => c.trim()).filter(Boolean);

      const payload = {
        supplier_organization_id: organizationId,
        category_id:        catId || null,
        title:              title.trim(),
        description:        description.trim(),
        hs_code:            hsCode.trim() || null,
        unit_of_measure:    unit,
        min_order_quantity: parseInt(moq) || 1,
        tiered_pricing:     tiers,
        status,
        image_urls:         allImageUrls,
        currency,
        keywords:           keywordsArr,
        lead_time_days:     leadTime ? parseInt(leadTime) : null,
        certifications:     certsArr,
        updated_at:         new Date().toISOString(),
      };

      if (isEdit && editId) {
        const { error: updateErr } = await supabase.from("products").update(payload).eq("id", editId);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase.from("products").insert(payload);
        if (insertErr) throw insertErr;
      }

      setSuccess(true);
      setTimeout(() => router.push("/dashboard/products"), 1800);
    } catch (err: any) {
      console.error("[Product] save error:", err);
      setError(err.message || "Failed to save product.");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-16">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/dashboard/products" className="hover:text-primary transition-colors flex items-center gap-1.5 font-medium">
          <ArrowLeft size={14} /> Products
        </Link>
        <span>/</span>
        <span className="font-bold text-foreground">{isEdit ? "Edit Listing" : "New Listing"}</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black">{isEdit ? "Edit Product" : "Create New Listing"}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isEdit ? "Update your product details and pricing." : "Fill in the details to publish to the marketplace."}
          </p>
        </div>
        <Package size={44} className="text-primary/15" />
      </div>

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-3xl p-16 text-center border border-emerald-500/20 shadow-xl"
          >
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-2xl font-black mb-2">{isEdit ? "Changes Saved!" : "Product Listed!"}</h2>
            <p className="text-muted-foreground text-sm">Redirecting to your catalogue…</p>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
          >
            {/* ── Layout: 2-col on large screens ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">

              {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
              <div className="space-y-7">

                {/* Section 1: Basic Info */}
                <section className="glass rounded-3xl border border-borderline p-7 space-y-5">
                  <h2 className="text-base font-black flex items-center gap-2">
                    <Type size={16} className="text-primary" /> Basic Information
                  </h2>

                  {/* Title */}
                  <div>
                    <FieldLabel label="Product Title *" hint="Write a clear, descriptive title. Good titles include material, size, and use case." />
                    <Input
                      icon={Type}
                      type="text"
                      required
                      placeholder="e.g. Cold-Rolled Stainless Steel Sheet 2mm × 1250mm"
                      value={title}
                      onChange={(e: any) => setTitle(e.target.value)}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <FieldLabel label="Description *" hint="Include specifications, material grade, packing info, and what makes your product unique." />
                    <textarea
                      required
                      rows={5}
                      placeholder="Detailed product specification, quality standards, packing, shipping & lead time details..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-3 glass rounded-2xl border border-borderline focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm resize-none transition-all"
                    />
                  </div>

                  {/* Category + HS Code row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel label="Category" hint="Select the most relevant product category." />
                      <Select
                        icon={Layers}
                        value={categoryId}
                        onChange={(e: any) => setCategoryId(e.target.value)}
                      >
                        <option value="">Select category…</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <FieldLabel label="HS Code" hint="Harmonized System code used for international customs clearance." />
                      <Input
                        icon={Hash}
                        type="text"
                        placeholder="7304.11"
                        value={hsCode}
                        onChange={(e: any) => setHsCode(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Unit + Currency + MOQ row */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <FieldLabel label="Unit of Measure *" />
                      <Select
                        value={unit}
                        onChange={(e: any) => setUnit(e.target.value)}
                      >
                        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        <option value="custom">Custom…</option>
                      </Select>
                    </div>
                    <div>
                      <FieldLabel label="Currency *" />
                      <Select
                        icon={Globe}
                        value={currency}
                        onChange={(e: any) => setCurrency(e.target.value)}
                      >
                        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </Select>
                    </div>
                    <div>
                      <FieldLabel label={`MOQ (${unit})`} hint="Minimum Order Quantity — the minimum buyers must order." />
                      <Input
                        type="number"
                        min={1}
                        placeholder="100"
                        value={moq}
                        onChange={(e: any) => setMoq(e.target.value)}
                      />
                    </div>
                  </div>
                </section>

                {/* Section 2: Tiered Pricing */}
                <section className="glass rounded-3xl border border-borderline p-7 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-black flex items-center gap-2">
                      <TrendingUp size={16} className="text-primary" /> Volume Pricing *
                    </h2>
                    <span className="text-[10px] text-muted-foreground font-bold bg-muted px-2 py-1 rounded-xl uppercase tracking-widest">
                      {tiers.length} tier{tiers.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set price breaks for different order quantities. Buyers see the applicable tier based on their cart quantity.
                    At least one tier is required.
                  </p>
                  <TieredPricingEditor
                    tiers={tiers}
                    onChange={setTiers}
                    currency={currency}
                    unit={unit}
                  />
                </section>

                {/* Section 3: Additional Details */}
                <section className="glass rounded-3xl border border-borderline p-7 space-y-5">
                  <h2 className="text-base font-black flex items-center gap-2">
                    <Info size={16} className="text-primary" /> Additional Details
                  </h2>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel label="Lead Time (days)" hint="Production + dispatch time from order placement." />
                      <Input
                        type="number"
                        min={0}
                        placeholder="e.g. 14"
                        value={leadTime}
                        onChange={(e: any) => setLeadTime(e.target.value)}
                      />
                    </div>
                    <div>
                      <FieldLabel label="Certifications" hint="ISO, CE, FDA, NAFDAC etc. Comma-separated." />
                      <Input
                        type="text"
                        placeholder="ISO 9001, CE, RoHS"
                        value={certifications}
                        onChange={(e: any) => setCertifications(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel label="Keywords / Tags" hint="Comma-separated keywords to improve search visibility." />
                    <Input
                      icon={Tag}
                      type="text"
                      placeholder="steel, construction, structural, pipe"
                      value={keywords}
                      onChange={(e: any) => setKeywords(e.target.value)}
                    />
                  </div>
                </section>

              </div>

              {/* ── RIGHT COLUMN ────────────────────────────────────────── */}
              <div className="space-y-6 lg:sticky lg:top-6">

                {/* Listing Status */}
                <section className="glass rounded-3xl border border-borderline p-6 space-y-4">
                  <h2 className="text-base font-black">Listing Status</h2>
                  <div className="space-y-2">
                    {(["active", "draft", "inactive"] as const).map((s) => {
                      const labels: Record<string, string> = {
                        active: "Active — visible in marketplace",
                        draft: "Draft — saved but hidden",
                        inactive: "Inactive — delisted",
                      };
                      const colors: Record<string, string> = {
                        active: "border-emerald-400 bg-emerald-500/10",
                        draft: "border-amber-400 bg-amber-500/10",
                        inactive: "border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800",
                      };
                      return (
                        <label
                          key={s}
                          className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${status === s ? colors[s] : "border-borderline hover:border-muted-foreground/30"}`}
                        >
                          <input
                            type="radio"
                            name="status"
                            value={s}
                            checked={status === s}
                            onChange={() => setStatus(s)}
                            className="accent-primary"
                          />
                          <span className="text-xs font-bold capitalize">{labels[s]}</span>
                        </label>
                      );
                    })}
                  </div>
                </section>

                {/* Product Images */}
                <section className="glass rounded-3xl border border-borderline p-6 space-y-4">
                  <h2 className="text-base font-black">Product Images</h2>
                  <ImageUploadPanel
                    existingUrls={existingImageUrls}
                    onFiles={(files) => setNewImageFiles((prev) => [...prev, ...files])}
                    onRemoveExisting={(i) => setExistingImageUrls((prev) => prev.filter((_, idx) => idx !== i))}
                    onSetPrimary={setPrimaryIndex}
                    primaryIndex={primaryIndex}
                  />
                </section>

                {/* B2B Tips */}
                <section className="rounded-3xl border border-primary/10 bg-primary/5 p-5 space-y-3">
                  <h3 className="text-xs font-black text-primary uppercase tracking-widest">Listing Best Practices</h3>
                  <ul className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
                    <li>✅ Accurate HS Codes speed up customs clearance</li>
                    <li>✅ Multiple volume tiers increase conversion by 40%</li>
                    <li>✅ 5+ high-res images increase buyer trust by 3×</li>
                    <li>✅ Set realistic lead times to avoid order disputes</li>
                    <li>✅ Add certifications to unlock verified badge</li>
                  </ul>
                </section>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl flex items-center gap-2 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="mt-8">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-primary text-white rounded-2xl font-black text-base flex items-center justify-center gap-3 hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-2xl shadow-primary/25 disabled:opacity-60"
              >
                {loading ? (
                  <><Loader2 size={22} className="animate-spin" /> Saving to Marketplace…</>
                ) : (
                  <>{isEdit ? "Save Changes" : "Publish to Marketplace"} <Plus size={22} /></>
                )}
              </button>
              <p className="text-center text-xs text-muted-foreground mt-3">
                By publishing, your product becomes visible to all verified B2B buyers on BuySell.
              </p>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
