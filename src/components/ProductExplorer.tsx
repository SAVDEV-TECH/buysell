 "use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import {
  Package,
  ArrowRight,
  Star,
  Heart,
  Filter,
  Search,
  Plus,
  ArrowUpRight,
  MessageCircle,
  BadgeCheck,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import ProductSkeleton from "@/components/ProductSkeleton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useLanguage } from "@/context/LanguageContext";

const PayWithPaystack = dynamic(() => import("@/components/PaystackButton"), {
  ssr: false,
});
const FloatingChatBox = dynamic(() => import("@/components/FloatingChatBox"), {
  ssr: false,
});

// Derive tiered pricing from product data (stored tiers or sensible defaults)
function getProductPricing(product: Product) {
  const baseMOQ = product.moq || 10;
  const basePrice = product.price;
  const rawTiers =
    product.tiers && product.tiers.length > 0
      ? [...product.tiers].sort((a, b) => a.minQty - b.minQty)
      : [
          { minQty: baseMOQ, price: basePrice },
          { minQty: baseMOQ * 5, price: Math.round(basePrice * 0.9) },
          { minQty: baseMOQ * 10, price: Math.round(basePrice * 0.8) },
        ];

  // De-dupe degenerate tiers (e.g. product with no real tiering data
  // shouldn't show three identical-looking columns)
  const tiers = rawTiers.filter(
    (t, idx, arr) => idx === 0 || t.price !== arr[idx - 1].price || t.minQty !== arr[idx - 1].minQty
  );

  return {
    tiers,
    minPrice: tiers[0].price,
    maxPrice: tiers[tiers.length - 1].price,
  };
}

export interface Product {
  id: number | string;
  name: string;
  price: number;
  category: string;
  image?: React.ReactNode;
  imageUrl?: string;
  desc: string;
  rating: number;
  reviews: number;
  stock?: number;
  sellerId: string;
  sellerName?: string;
  moq?: number;
  leadTime?: string;
  isSellerVerified?: boolean;
  tiers?: { minQty: number; price: number }[];
}

// ─────────────────────────────────────────────────────────────
// Shared small pieces
// ─────────────────────────────────────────────────────────────

/** Gold Supplier is a paid/merchandising tier — kept visually distinct
 *  from the (blue) identity-verification badge so the two meanings
 *  never blur together. */
function GoldSupplierPill({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 bg-amber-50 text-amber-700 border border-amber-200 font-bold rounded-full dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 ${
        compact ? "text-[8px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5"
      }`}
      title="Gold Supplier — enhanced marketplace tier"
    >
      <Sparkles size={compact ? 8 : 10} className="shrink-0" />
      Gold Supplier
    </span>
  );
}

/** Only renders once a product actually has reviews. A visible "0" reads
 *  as a bad rating rather than an unrated product, so new listings get a
 *  neutral "New" tag instead. */
function RatingBadge({ rating, reviews, compact = false }: { rating: number; reviews: number; compact?: boolean }) {
  if (!reviews || reviews <= 0) {
    return (
      <span
        className={`font-bold uppercase tracking-wide text-muted-foreground bg-muted rounded ${
          compact ? "text-[7px] px-1 py-0.5" : "text-[9px] px-1.5 py-0.5"
        }`}
      >
        New
      </span>
    );
  }
  return (
    <div
      className={`flex items-center gap-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded border border-orange-500/10 ${
        compact ? "text-[7px] px-1 py-0.5" : "text-[10px] px-1.5 py-0.5"
      }`}
    >
      <Star size={compact ? 7 : 10} fill="currentColor" />
      <span className="font-black">{rating.toFixed(1)}</span>
    </div>
  );
}

/** Collapses MOQ / lead time into whichever rows actually have data,
 *  instead of printing "Ask Supplier" twice on every card. */
function MoqLeadTimeRows({ product, compact = false }: { product: Product; compact?: boolean }) {
  const hasMoq = !!product.moq;
  const hasLead = !!product.leadTime;

  if (!hasMoq && !hasLead) {
    return (
      <p className={`text-muted-foreground italic ${compact ? "text-[8px]" : "text-[11px]"}`}>
        Contact supplier for MOQ &amp; lead time
      </p>
    );
  }

  return (
    <div className={`flex flex-col gap-0.5 ${compact ? "text-[8px]" : "text-[11px]"} text-muted-foreground w-full min-w-0`}>
      {hasMoq && (
        <div className="flex justify-between gap-2 w-full min-w-0">
          <span className="shrink-0">MOQ:</span>
          <span className="font-semibold text-foreground truncate text-right min-w-0 flex-1">{product.moq} units</span>
        </div>
      )}
      {hasLead && (
        <div className="flex justify-between gap-2 w-full min-w-0">
          <span className="shrink-0">Lead time:</span>
          <span className="font-semibold text-foreground truncate text-right min-w-0 flex-1">{product.leadTime}</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MOBILE CARD  (shown below sm breakpoint)
// Designed for a 2-col grid. Readable at small width — no sub-8px text.
// ─────────────────────────────────────────────────────────────
function MobileProductCard({
  product,
  user,
  onContactSupplier,
}: {
  product: Product;
  user: any;
  onContactSupplier: (sellerId: string, sellerName: string) => void;
}) {
  const isGold = product.isSellerVerified === true;
  const pricing = getProductPricing(product);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card w-full h-full">
      {/* Image */}
      <Link
        href={`/marketplace/${product.id}`}
        className="block relative aspect-square w-full bg-muted/40 dark:bg-slate-900 overflow-hidden flex-shrink-0"
      >
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package size={20} className="text-muted-foreground opacity-20" />
          </div>
        )}
        <div className="absolute top-1.5 left-1.5">
          <RatingBadge rating={product.rating} reviews={product.reviews} compact />
        </div>
        <div className="absolute top-1.5 right-1.5">
          <VerifiedBadge showText={false} />
        </div>
      </Link>

      {/* Body */}
      <div className="p-2 flex flex-col gap-1 w-full min-w-0">
        <div className="flex items-center justify-between gap-1 w-full min-w-0">
          <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground truncate min-w-0 flex-1">
            {product.category}
          </span>
          <div className="shrink-0">
            {isGold && <GoldSupplierPill compact />}
          </div>
        </div>

        <Link href={`/marketplace/${product.id}`} className="w-full min-w-0 block">
          <p className="text-[11px] font-bold leading-tight line-clamp-2 text-foreground min-h-[2.2em] w-full min-w-0 break-words">
            {product.name}
          </p>
        </Link>

        <div className="border-t border-border/50 pt-1 mt-0.5 w-full min-w-0">
          <MoqLeadTimeRows product={product} compact />
        </div>

        <p className="text-xs font-black text-primary tracking-tight mt-0.5 truncate w-full min-w-0">
          ₦{pricing.minPrice.toLocaleString()} - ₦{pricing.maxPrice.toLocaleString()}
        </p>

        <div className="flex gap-2 items-stretch mt-1 w-full min-w-0">
          <button
            onClick={() => onContactSupplier(product.sellerId, product.sellerName || "Manufacturer")}
            className="w-11 h-11 bg-muted hover:bg-accent text-primary rounded-lg border border-border flex items-center justify-center shrink-0"
            title="Chat with Supplier"
          >
            <MessageCircle size={13} />
          </button>
          <div className="flex-1 overflow-hidden rounded-lg min-w-0">
            <PayWithPaystack product={product} user={user} compact />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DESKTOP CARD  (shown from sm breakpoint upward)
// ─────────────────────────────────────────────────────────────
function DesktopProductCard({
  product,
  user,
  onAddToCart,
  onContactSupplier,
}: {
  product: Product;
  user: any;
  onAddToCart: (product: Product) => void;
  onContactSupplier: (sellerId: string, sellerName: string) => void;
}) {
  const isGold = product.isSellerVerified === true;
  const pricing = getProductPricing(product);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card w-full group hover:shadow-lg transition-all duration-300">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted/30 dark:bg-slate-900 overflow-hidden">
        <Link href={`/marketplace/${product.id}`} className="absolute inset-0 z-10">
          <span className="sr-only">View product</span>
        </Link>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package
              size={36}
              className="text-muted-foreground opacity-20 group-hover:scale-110 transition-transform duration-700"
            />
          </div>
        )}
        <button className="absolute top-2 right-2 p-1.5 bg-white/70 dark:bg-black/60 backdrop-blur-sm rounded-full hover:text-red-500 transition-all z-20 shadow">
          <Heart size={13} />
        </button>
        {/* Verified is the identity/trust signal — anchored to the image, on its own */}
        <div className="absolute bottom-2 left-2 z-20">
          <VerifiedBadge showText={true} />
        </div>
      </div>

      {/* Body */}
      <div className="p-3 md:p-4 flex-1 flex flex-col gap-2">
        {/* Category + Rating */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground italic truncate">
            {product.category}
          </span>
          <RatingBadge rating={product.rating} reviews={product.reviews} />
        </div>

        {/* Seller Info — Gold Supplier sits here as a merchandising tag, not on the image */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link href={`/manufacturers/${product.sellerId}`} className="flex items-center gap-1 group/seller min-w-0">
            <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] font-black uppercase text-primary border border-primary/10 shrink-0">
              {product.sellerName ? product.sellerName.charAt(0) : "S"}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground group-hover/seller:text-primary transition-colors truncate">
              {product.sellerName || "Partner"}
            </span>
          </Link>
          {isGold && <GoldSupplierPill />}
          {product.reviews > 0 && (
            <span className="text-[8px] font-medium text-muted-foreground bg-muted px-1 py-0.5 rounded">
              {product.reviews} review{product.reviews === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {/* Name */}
        <Link href={`/marketplace/${product.id}`}>
          <h3 className="text-sm md:text-[14px] font-black tracking-tight leading-snug line-clamp-2 hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Tiered pricing — collapses to fewer columns if tiers are de-duped */}
        <div
          className="grid gap-1 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl text-center text-[9px] border border-border/50 my-1 font-medium"
          style={{ gridTemplateColumns: `repeat(${pricing.tiers.length}, minmax(0, 1fr))` }}
        >
          {pricing.tiers.map((t, idx) => (
            <div key={idx} className="flex flex-col border-r last:border-r-0 border-border/40">
              <span className="text-muted-foreground">{t.minQty}+ units</span>
              <span className="font-bold text-primary">₦{t.price.toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* MOQ + Lead time — only shows rows that have real data */}
        <div className="border-t border-border/50 pt-2">
          <MoqLeadTimeRows product={product} />
        </div>

        {/* Price + actions */}
        <div className="mt-auto flex flex-col gap-2 pt-2 border-t border-border/50">
          <p className="text-sm font-black text-foreground tracking-tighter truncate w-full">
            ₦{pricing.minPrice.toLocaleString()} - ₦{pricing.maxPrice.toLocaleString()}{" "}
            <span className="text-[10px] text-muted-foreground font-normal font-sans">/ unit</span>
          </p>
          <div className="flex gap-1 items-stretch">
            <button
              onClick={() => onAddToCart(product)}
              className="w-8.5 h-8.5 shrink-0 bg-muted/50 dark:bg-slate-800 text-primary rounded-lg hover:bg-accent transition-all flex items-center justify-center border border-border"
              title="Add to PO"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={() => onContactSupplier(product.sellerId, product.sellerName || "Manufacturer")}
              className="flex-1 px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all text-[11px] font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1"
            >
              <MessageCircle size={12} />
              Contact
            </button>
            <div className="flex-1 min-w-0 rounded-lg overflow-hidden shadow-sm">
              <PayWithPaystack product={product} user={user} compact />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN EXPLORER
// ─────────────────────────────────────────────────────────────
export default function ProductExplorer({ limit }: { limit?: number }) {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All Products");
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(1000000);
  const [sortBy, setSortBy] = useState("Newest");
  const [showFilters, setShowFilters] = useState(false);
  const [activeChat, setActiveChat] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("products")
          .select(`
            id, title, description, category_id, image_urls,
            tiered_pricing, min_order_quantity, status,
            supplier_organization_id, unit_of_measure,
            product_categories ( name )
          `)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const live: Product[] = (data ?? []).map((row) => {
          const categoryName =
            (Array.isArray(row.product_categories)
              ? row.product_categories[0]?.name
              : (row.product_categories as { name?: string } | null)?.name) ??
            row.category_id ??
            "General";

          const tiers: { minQty: number; price: number }[] =
            Array.isArray(row.tiered_pricing)
              ? (row.tiered_pricing as { min_qty: number; unit_price: number }[])
                  .sort((a, b) => a.min_qty - b.min_qty)
                  .map((t) => ({ minQty: t.min_qty, price: t.unit_price }))
              : [];

          const basePrice = tiers.length > 0 ? tiers[0].price : 0;

          return {
            id: row.id,
            name: row.title,
            price: basePrice,
            category: categoryName,
            imageUrl: Array.isArray(row.image_urls) ? row.image_urls[0] : undefined,
            desc: row.description ?? "",
            rating: 0,
            reviews: 0,
            sellerId: row.supplier_organization_id ?? "",
            moq: row.min_order_quantity,
            tiers,
            isSellerVerified: false,
          };
        });

        setProducts(live);
      } catch (error) {
        console.error("Failed to fetch products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleAddToCart = (product: Product) => {
    addToCart({
      id: String(product.id),
      name: product.name,
      price: product.price,
      category: product.category,
      imageUrl: product.imageUrl,
      desc: product.desc,
      sellerId: product.sellerId,
      manufacturerId: product.sellerId,
      moq: product.moq,
      tiers: product.tiers,
    });
  };

  const filtered = products
    .filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCategory === "All Products" || p.category === activeCategory;
      const matchPrice = p.price >= minPrice && p.price <= maxPrice;
      return matchSearch && matchCat && matchPrice;
    })
    .sort((a, b) => {
      if (sortBy === "Price: Low to High") return a.price - b.price;
      if (sortBy === "Price: High to Low") return b.price - a.price;
      if (sortBy === "Top Rated") return b.rating - a.rating;
      return 0;
    });

  const displayed = limit ? filtered.slice(0, limit) : filtered;

  const resetFilters = () => {
    setMinPrice(0);
    setMaxPrice(1000000);
    setActiveCategory("All Products");
    setSearch("");
  };

  return (
    <div className="w-full overflow-x-hidden">
      {/* Search + Sort */}
      <div className="flex flex-col lg:flex-row gap-2 sm:gap-3 lg:gap-6 mb-6 sm:mb-8 lg:mb-12 w-full min-w-0">
        <div className="flex-1 relative group min-w-0 overflow-hidden">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
          />
          <input
            type="text"
            placeholder={t("market_search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full min-w-0 max-w-full placeholder:truncate pl-11 pr-4 py-2.5 sm:py-3.5 bg-background rounded-lg border border-input focus:ring-2 focus:ring-ring outline-none transition-all font-medium text-base sm:text-sm"
          />
        </div>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto shrink-0 overflow-hidden">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex-1 sm:flex-none h-10 sm:h-12 px-3 sm:px-4 rounded-lg border flex items-center justify-center gap-2 font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
              showFilters
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-input hover:bg-accent text-muted-foreground"
            }`}
          >
            <Filter size={14} className="sm:hidden" />
            <Filter size={16} className="hidden sm:block" />
            <span className="hidden sm:inline">{t("market_filters")}</span>
          </button>
          <div className="flex-1 sm:flex-none relative min-w-0 shrink">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full h-10 sm:h-12 pl-3 sm:pl-4 pr-8 sm:pr-9 bg-background border border-input rounded-lg font-medium outline-none cursor-pointer hover:bg-accent transition-all text-base sm:text-sm appearance-none truncate"
            >
              <option value="Newest">{t("market_sort_newest")}</option>
              <option value="Price: Low to High">{t("market_sort_low")}</option>
              <option value="Price: High to Low">{t("market_sort_high")}</option>
              <option value="Top Rated">{t("market_sort_rated")}</option>
            </select>
            <ArrowUpRight
              size={14}
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 rotate-45"
            />
          </div>
        </div>
      </div>

      {/* Filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="bg-card p-3 sm:p-5 md:p-8 rounded-lg border border-border grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 items-end shadow-sm">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 italic">
                  Price Range (₦)
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice || ""}
                    onChange={(e) => setMinPrice(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-background rounded-lg border border-input outline-none text-sm font-bold"
                  />
                  <span className="opacity-30 font-black">—</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice === 1000000 ? "" : maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value) || 1000000)}
                    className="w-full px-4 py-2.5 bg-background rounded-lg border border-input outline-none text-sm font-bold"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={resetFilters}
                  className="w-full sm:w-auto px-6 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-500 hover:text-white transition-all"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories */}
      <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-2 sm:pb-3 mb-4 sm:mb-6 lg:mb-10 scrollbar-hide snap-x w-full">
        {["All Products", "Electronics", "Furniture", "Fashion", "Groceries", "Industrial"].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-semibold text-[10px] sm:text-[11px] whitespace-nowrap border transition-all snap-start flex-shrink-0 ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-input hover:bg-accent"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">
          {[...Array(limit || 6)].map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="py-24 text-center bg-card rounded-xl border border-dashed border-border px-6">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Search size={28} className="text-muted-foreground opacity-30" />
          </div>
          {products.length === 0 ? (
            <>
              <h3 className="text-2xl font-black mb-2 tracking-tighter">No Products Listed Yet</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-8">
                Manufacturers can list products from their dashboard. Check back soon.
              </p>
              <Link
                href="/register"
                className="inline-block px-8 py-3.5 bg-primary text-white rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
              >
                Become a Supplier
              </Link>
            </>
          ) : (
            <>
              <h3 className="text-2xl font-black mb-2 tracking-tighter">No Suppliers Found</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-8">
                Adjust your filters or search terms to source specific manufacturers.
              </p>
              <button
                onClick={resetFilters}
                className="px-8 py-3.5 bg-primary text-white rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
              >
                Clear All Filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 w-full overflow-hidden">
          {displayed.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="w-full min-w-0 overflow-hidden"
            >
              <div className="block sm:hidden w-full">
                <MobileProductCard
                  product={product}
                  user={user}
                  onContactSupplier={(sellerId, name) => setActiveChat({ id: sellerId, name })}
                />
              </div>

              <div className="hidden sm:block w-full">
                <DesktopProductCard
                  product={product}
                  user={user}
                  onAddToCart={handleAddToCart}
                  onContactSupplier={(sellerId, name) => setActiveChat({ id: sellerId, name })}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* View all */}
      {limit && filtered.length > limit && (
        <div className="mt-12 sm:mt-16 text-center">
          <Link
            href="/marketplace"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-4 bg-primary text-white rounded-2xl font-black text-base sm:text-lg hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/20 group"
          >
            {t("market_explore")}
            <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform" />
          </Link>
        </div>
      )}

      {/* Floating Chat Box for B2B Sourcing Inquiry */}
      {activeChat && (
        <FloatingChatBox
          manufacturerId={activeChat.id}
          manufacturerName={activeChat.name}
          isOpen={!!activeChat}
          onClose={() => setActiveChat(null)}
        />
      )}
    </div>
  );
}
