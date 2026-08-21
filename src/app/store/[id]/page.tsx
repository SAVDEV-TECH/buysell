"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Shield, ShieldCheck, Star, Package, MessageSquare,
  Phone, Globe, Clock, Award, CheckCircle2, ChevronRight,
  TrendingUp, Zap, ArrowLeft, Search, Filter, ExternalLink,
  Factory, Leaf, BarChart3, Users, FileCheck, AlertCircle, Mail
} from "lucide-react";
import BuySellLoader from "@/components/BuySellLoader";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import FreightCalculator from "@/components/FreightCalculator";
import RFQModal from "@/components/RFQModal";
import ErrorBoundary from "@/components/ErrorBoundary";

/* ─── Country helpers ──────────────────────────────────────────────── */
const COUNTRY_FLAGS: Record<string, string> = {
  NG: "🇳🇬", GH: "🇬🇭", KE: "🇰🇪", TG: "🇹🇬", GW: "🇬🇼",
  SN: "🇸🇳", CI: "🇨🇮", CM: "🇨🇲", ZA: "🇿🇦", ET: "🇪🇹",
  TZ: "🇹🇿", UG: "🇺🇬", MZ: "🇲🇿", BJ: "🇧🇯", BF: "🇧🇫",
  DE: "🇩🇪", FR: "🇫🇷", GB: "🇬🇧", US: "🇺🇸", CN: "🇨🇳",
};

const COUNTRY_NAMES: Record<string, string> = {
  NG: "Nigeria", GH: "Ghana", KE: "Kenya", TG: "Togo",
  GW: "Guinea-Bissau", SN: "Senegal", CI: "Côte d'Ivoire",
  CM: "Cameroon", ZA: "South Africa", ET: "Ethiopia",
  TZ: "Tanzania", UG: "Uganda", MZ: "Mozambique",
  BJ: "Benin", BF: "Burkina Faso",
};

/* ─── Certification badges ─────────────────────────────────────────── */
const CERT_BADGES = [
  { key: "cac_verified",       label: "CAC / RGD Registered",    color: "blue"   },
  { key: "iso_certified",      label: "ISO 9001 Certified",       color: "purple" },
  { key: "factory_inspected",  label: "Factory Inspected",        color: "emerald"},
  { key: "nafdac_approved",    label: "NAFDAC Approved",          color: "amber"  },
  { key: "sgs_verified",       label: "SGS Quality Verified",     color: "cyan"   },
];

const colorMap: Record<string, string> = {
  blue:    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  purple:  "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  amber:   "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  cyan:    "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
};

/* ─── Product card ─────────────────────────────────────────────────── */
function ProductCard({
  product,
  onRequestQuote,
}: {
  product: any;
  onRequestQuote: (p: any) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const lowestPrice =
    Array.isArray(product.tiered_pricing) && product.tiered_pricing.length > 0
      ? Math.min(...product.tiered_pricing.map((t: any) => t.unit_price || t.price || 0))
      : product.price ?? 0;

  const moq = product.min_order_quantity || product.moq || 100;
  const imgSrc =
    !imgError && (product.image_urls?.[0] || product.imageUrl)
      ? (product.image_urls?.[0] || product.imageUrl)
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={product.title || product.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Package size={40} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">No Image</span>
          </div>
        )}
        {/* MOQ badge */}
        <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold rounded-full tracking-wider">
          MOQ {moq.toLocaleString()} units
        </div>
        {/* Export ready */}
        <div className="absolute top-3 right-3 px-2.5 py-1 bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-bold rounded-full">
          ✓ Export Ready
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
            {product.category || "Agricultural / Industrial"}
          </p>
          <h3 className="font-bold text-foreground text-sm md:text-base leading-tight line-clamp-2">
            {product.title || product.name}
          </h3>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-primary">
            ${lowestPrice.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground font-medium">/ unit</span>
        </div>

        {/* Tiered pricing hint */}
        {Array.isArray(product.tiered_pricing) && product.tiered_pricing.length > 1 && (
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <TrendingUp size={11} /> Volume discounts available
          </p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {["FOB", "CIF", "EXW"].map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 bg-muted text-muted-foreground text-[9px] font-bold rounded-md uppercase tracking-wider"
            >
              {t}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="flex gap-2 mt-auto pt-2">
          <button
            onClick={() => onRequestQuote(product)}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <MessageSquare size={13} /> Get Quote
          </button>
          <Link
            href={`/marketplace/${product.id}`}
            className="px-3.5 py-2.5 border border-border rounded-xl font-bold text-xs text-foreground hover:bg-muted transition-all flex items-center gap-1"
          >
            View <ExternalLink size={11} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Stat pill ────────────────────────────────────────────────────── */
function StatPill({
  icon: Icon,
  label,
  value,
  color = "blue",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color?: string;
}) {
  const colors: Record<string, string> = {
    blue:    "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber:   "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    purple:  "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  };
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3 bg-card rounded-xl border border-border min-w-[100px] shadow-sm">
      <div className={`p-1.5 rounded-lg ${colors[color]}`}>
        <Icon size={16} />
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider text-center">
        {label}
      </p>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────── */
export default function StorefrontPage() {
  const { id: sellerId } = useParams() as { id: string };
  const router = useRouter();
  const supabase = createClient();

  const [seller, setSeller]     = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [rfqTarget, setRfqTarget] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"products" | "about" | "contact">("products");

  const fetchStore = useCallback(async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", sellerId)
        .single();

      if (org) {
        setSeller({
          id: org.id,
          businessName: org.company_name,
          country: org.country_code || org.country || "NG",
          address: org.address || "",
          isVerified: org.verification_level === "verified",
          verificationLevel: org.verification_level,
          kybData: org.kyb_data || {},
          registrationNumber: org.registration_number || "",
          completedOrders: org.completed_orders ?? 0,
          reliabilityScore: org.reliability_score ?? null,
          preferredLanguage: org.preferred_language || "en",
          defaultIncoterms: org.default_incoterms || "FOB",
          memberSince: org.created_at
            ? new Date(org.created_at).getFullYear()
            : new Date().getFullYear(),
          responseTime: "< 4 hours",
          exportCountries: org.kyb_data?.export_countries || ["CN", "DE", "US", "FR"],
          bio: org.description || `${org.company_name} is a verified export-ready supplier on BuySell, serving global buyers with high-quality goods and full escrow payment protection.`,
          phone: org.phone || "",
          email: org.email || "",
          website: org.website || "",
        });
      }

      const { data: prods } = await supabase
        .from("products")
        .select("*")
        .eq("supplier_organization_id", sellerId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      setProducts(prods || []);
    } catch (err) {
      console.error("Storefront fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [sellerId, supabase]);

  useEffect(() => { fetchStore(); }, [fetchStore]);

  const filteredProducts = products.filter((p) =>
    (p.title || p.name || "").toLowerCase().includes(search.toLowerCase())
  );

  /* ── Loading ─────────────────────────────────────────────────────── */
  if (loading) return <BuySellLoader message="Loading supplier profile..." fullScreen />;

  /* ── Not found ───────────────────────────────────────────────────── */
  if (!seller) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8 gap-6">
        <div className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Factory size={48} className="text-slate-300 dark:text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black mb-2">Supplier Not Found</h1>
          <p className="text-muted-foreground mb-6">This storefront may have been removed or the link is incorrect.</p>
        </div>
        <Link
          href="/marketplace"
          className="px-8 py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary/90 transition-all"
        >
          Browse Marketplace
        </Link>
      </div>
    );
  }

  const flag = COUNTRY_FLAGS[seller.country] || "🌍";
  const countryName = COUNTRY_NAMES[seller.country] || seller.country;
  const certsPassed = CERT_BADGES.filter((c) => seller.kybData?.[c.key]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground pb-24">

        {/* ── HERO BANNER ────────────────────────────────────────────── */}
        <div className="relative h-72 md:h-96 overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
          {/* Animated mesh */}
          <div className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%),
                                radial-gradient(circle at 80% 20%, #06b6d4 0%, transparent 50%),
                                radial-gradient(circle at 60% 80%, #8b5cf6 0%, transparent 50%)`,
            }}
          />
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />

          {/* Back button */}
          <div className="absolute top-6 left-4 md:left-8 z-10">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors font-bold text-sm"
            >
              <ArrowLeft size={16} /> Back
            </button>
          </div>

          {/* Hero content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end gap-4 md:gap-8">
              {/* Logo / Avatar */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-primary flex items-center justify-center text-white text-3xl font-black shadow-xl border-2 border-white/20 flex-shrink-0"
              >
                {seller.businessName?.[0] || "S"}
              </motion.div>

              <div className="flex-1 min-w-0">
                {/* Name + Verified */}
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-white truncate">
                    {seller.businessName}
                  </h1>
                  {seller.isVerified && (
                    <VerifiedBadge
                      isVerified={seller.isVerified}
                      kybData={seller.kybData}
                      supplierName={seller.businessName}
                      showText
                      className="text-xs"
                    />
                  )}
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-white/75">
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} />
                    {flag} {countryName}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} /> Member since {seller.memberSince}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Zap size={13} /> Responds {seller.responseTime}
                  </span>
                  {seller.isVerified && (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <ShieldCheck size={13} /> Escrow Protected
                    </span>
                  )}
                </div>
              </div>

              {/* Hero CTA */}
              <div className="flex gap-2.5 flex-shrink-0">
                <button
                  onClick={() => setRfqTarget({ name: "General Inquiry", id: null })}
                  className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/90 transition-all shadow-sm flex items-center gap-1.5"
                >
                  <MessageSquare size={15} /> Request Quote
                </button>
                <Link
                  href={`/dashboard/messages`}
                  className="px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-bold text-xs hover:bg-white/20 transition-all flex items-center gap-1.5"
                >
                  <Mail size={15} /> Message
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── STATS BAR ──────────────────────────────────────────────── */}
        <div className="bg-card border-b border-border sticky top-0 z-20 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="flex overflow-x-auto gap-0 scrollbar-none py-1">
              {[
                { label: "Products",    value: String(products.length),                          icon: Package,   color: "blue"    },
                { label: "Orders Done", value: String(seller.completedOrders || "—"),             icon: BarChart3, color: "emerald" },
                { label: "Reliability", value: seller.reliabilityScore ? `${seller.reliabilityScore}%` : "New", icon: TrendingUp, color: "amber" },
                { label: "Certifications", value: String(certsPassed.length),                    icon: Award,     color: "purple"  },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-3 px-5 py-3 border-r border-border last:border-r-0 min-w-fit"
                >
                  <s.icon size={16} className="text-muted-foreground" />
                  <div>
                    <p className="text-base font-bold text-foreground leading-none">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ───────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
          <div className="flex flex-col lg:flex-row gap-6">

            {/* ── LEFT: Products / About / Contact ─────────────────── */}
            <div className="flex-1 min-w-0">

              {/* Tab navigation */}
              <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6 w-fit">
                {(["products", "about", "contact"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg font-bold text-xs capitalize transition-all ${
                      activeTab === tab
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* ── PRODUCTS TAB ─────────────────────────────────────── */}
              <AnimatePresence mode="wait">
                {activeTab === "products" && (
                  <motion.div
                    key="products"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    {/* Search bar */}
                    <div className="relative mb-5">
                      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground transition-all shadow-sm"
                      />
                    </div>

                    {filteredProducts.length === 0 ? (
                      <div className="text-center py-16 flex flex-col items-center gap-3">
                        <Package size={40} className="text-muted-foreground" />
                        <div>
                          <p className="font-bold text-foreground text-sm">No products found</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {search ? "Try a different search term" : "This supplier hasn't listed products yet"}
                          </p>
                        </div>
                        {!search && (
                          <button
                            onClick={() => setRfqTarget({ name: "Custom Product Inquiry", id: null })}
                            className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/90 transition-all shadow-sm"
                          >
                            Send Custom RFQ
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredProducts.map((p) => (
                          <ProductCard
                            key={p.id}
                            product={p}
                            onRequestQuote={(prod) => setRfqTarget(prod)}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── ABOUT TAB ──────────────────────────────────────── */}
                {activeTab === "about" && (
                  <motion.div
                    key="about"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4"
                  >
                    {/* Bio */}
                    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                      <h2 className="font-bold text-foreground text-base mb-2.5 flex items-center gap-2">
                        <Factory size={18} className="text-primary" /> About This Supplier
                      </h2>
                      <p className="text-muted-foreground text-xs leading-relaxed">{seller.bio}</p>
                    </div>

                    {/* Certifications */}
                    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                      <h2 className="font-bold text-foreground text-base mb-3 flex items-center gap-2">
                        <Award size={18} className="text-primary" /> Certifications & Compliance
                      </h2>
                      <div className="space-y-2.5">
                        {CERT_BADGES.map((cert) => {
                          const passed = !!seller.kybData?.[cert.key];
                          return (
                            <div
                              key={cert.key}
                              className={`flex items-center gap-3 p-3 rounded-xl border ${
                                passed
                                  ? colorMap[cert.color]
                                  : "bg-muted/40 border-border opacity-50"
                              }`}
                            >
                              {passed
                                ? <CheckCircle2 size={16} />
                                : <Clock size={16} className="text-muted-foreground" />}
                              <span className="font-bold text-xs">{cert.label}</span>
                              {!passed && (
                                <span className="ml-auto text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                                  Pending
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Export destinations */}
                    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                      <h2 className="font-bold text-foreground text-base mb-3 flex items-center gap-2">
                        <Globe size={18} className="text-primary" /> Export Destinations
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {seller.exportCountries.map((code: string) => (
                          <span
                            key={code}
                            className="px-2.5 py-1 bg-muted text-foreground text-xs font-bold rounded-lg"
                          >
                            {COUNTRY_FLAGS[code] || "🌍"} {COUNTRY_NAMES[code] || code}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Trade terms */}
                    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                      <h2 className="font-bold text-foreground text-base mb-3 flex items-center gap-2">
                        <FileCheck size={18} className="text-primary" /> Standard Trade Terms
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {[
                          { label: "Default Incoterms",  value: seller.defaultIncoterms || "FOB" },
                          { label: "Payment Terms",       value: "100% Escrow (BuySell Protected)" },
                          { label: "Lead Time",           value: "7–21 Business Days" },
                          { label: "Sample Available",    value: "Yes — min. 1 unit" },
                          { label: "OEM / Private Label", value: "Available on request" },
                          { label: "Inspection Allowed",  value: "Yes — SGS / Bureau Veritas" },
                        ].map(({ label, value }) => (
                          <div key={label} className="p-3.5 bg-muted/40 rounded-xl border border-border">
                            <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider">{label}</p>
                            <p className="font-bold text-foreground mt-0.5">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── CONTACT TAB ────────────────────────────────────── */}
                {activeTab === "contact" && (
                  <motion.div
                    key="contact"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4"
                  >
                    <div className="bg-card rounded-2xl border border-border p-6 text-center flex flex-col items-center gap-4 shadow-sm">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Users size={24} />
                      </div>
                      <div>
                        <h2 className="font-bold text-lg text-foreground mb-1">
                          Connect with {seller.businessName}
                        </h2>
                        <p className="text-muted-foreground text-xs">
                          All communication and payments are protected through BuySell's escrow system.
                        </p>
                      </div>

                      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={() => setRfqTarget({ name: "General Inquiry", id: null })}
                          className="w-full py-3 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <MessageSquare size={15} /> Send RFQ
                        </button>
                        <Link
                          href="/dashboard/messages"
                          className="w-full py-3 border border-border rounded-xl font-bold text-xs text-foreground hover:bg-muted transition-all flex items-center justify-center gap-1.5"
                        >
                          <Mail size={15} /> Direct Message
                        </Link>
                      </div>

                      {seller.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <Phone size={13} />
                          <a href={`tel:${seller.phone}`} className="hover:text-primary transition-colors font-bold">
                            {seller.phone}
                          </a>
                        </div>
                      )}

                      <div className="w-full p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-left">
                        <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                          Never pay outside BuySell. All deals must go through our escrow system to protect both buyers and sellers.
                        </p>
                      </div>
                    </div>

                    {/* Freight Calculator in contact for quick estimates */}
                    {products.length > 0 && (
                      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                        <h3 className="font-bold text-foreground text-base mb-3">
                          Quick Freight Estimate
                        </h3>
                        <FreightCalculator
                          basePrice={products[0]?.tiered_pricing?.[0]?.unit_price || 10}
                          moq={products[0]?.min_order_quantity || 100}
                          unit="units"
                          tieredPricing={products[0]?.tiered_pricing || []}
                        />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── RIGHT: Trust sidebar ──────────────────────────────── */}
            <div className="lg:w-80 xl:w-96 flex-shrink-0 space-y-4">

              {/* Trust card */}
              <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="p-5 bg-primary text-white">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ShieldCheck size={18} />
                    <span className="font-bold text-xs uppercase tracking-wider">BuySell Trust Score</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {seller.isVerified ? "Verified ✓" : "Pending"}
                  </p>
                  <p className="text-xs text-white/80 mt-0.5">
                    {seller.isVerified
                      ? "This supplier passed KYB verification"
                      : "Verification in progress"}
                  </p>
                </div>
                <div className="p-4 space-y-2.5">
                  {[
                    { label: "Registration Verified",  ok: !!seller.kybData?.cac_verified       },
                    { label: "Factory Inspected",       ok: !!seller.kybData?.factory_inspected  },
                    { label: "ISO / Quality Certified", ok: !!seller.kybData?.iso_certified      },
                    { label: "Escrow-Eligible",         ok: seller.isVerified                    },
                  ].map(({ label, ok }) => (
                    <div key={label} className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                        ok ? "bg-emerald-500" : "bg-muted"
                      }`}>
                        {ok
                          ? <CheckCircle2 size={11} className="text-white" />
                          : <Clock size={9} className="text-muted-foreground" />}
                      </div>
                      <span className={`text-xs font-medium ${ok ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick stats */}
              <div className="bg-card rounded-2xl border border-border p-4 space-y-3 shadow-sm">
                <h3 className="font-bold text-foreground text-xs uppercase tracking-wider">Quick Facts</h3>
                {[
                  { icon: MapPin,     label: "Location",       value: `${flag} ${countryName}` },
                  { icon: Clock,      label: "Response Time",  value: seller.responseTime       },
                  { icon: BarChart3,  label: "Orders Done",    value: String(seller.completedOrders || 0) },
                  { icon: Leaf,       label: "Default Terms",  value: seller.defaultIncoterms   },
                  { icon: Globe,      label: "Language",       value: seller.preferredLanguage?.toUpperCase() || "EN" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground">
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{label}</p>
                      <p className="font-bold text-foreground text-xs truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA card */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="font-bold text-foreground text-sm">Ready to Order?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  All orders are 100% escrow-protected. Your payment is only released when goods are delivered and approved.
                </p>
                <button
                  onClick={() => setRfqTarget({ name: "Bulk Order Inquiry", id: null })}
                  className="w-full py-2.5 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <MessageSquare size={14} /> Start with an RFQ
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* All suppliers link */}
              <Link
                href="/manufacturers"
                className="flex items-center justify-center gap-1.5 py-2 text-muted-foreground text-xs font-bold hover:text-primary transition-colors"
              >
                <Users size={14} /> Browse All Suppliers
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── RFQ Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {rfqTarget && (
          <RFQModal
            isOpen={!!rfqTarget}
            onClose={() => setRfqTarget(null)}
            product={rfqTarget}
            manufacturer={{
              id: seller.id,
              name: seller.businessName,
            }}
          />
        )}
      </AnimatePresence>
    </ErrorBoundary>
  );
}
