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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import dynamic from "next/dynamic";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import ProductSkeleton from "@/components/ProductSkeleton";
import { VerifiedBadge } from "@/components/VerifiedBadge";

const PayWithPaystack = dynamic(() => import("@/components/PaystackButton"), {
  ssr: false,
});

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
}

const MOCK_PRODUCTS: Product[] = [
  {
    id: "mock1",
    name: "Premium Wireless Headphones",
    price: 45000,
    category: "Electronics",
    rating: 4.8,
    reviews: 124,
    desc: "Experience crystal clear sound with our latest noise-cancelling technology.",
    sellerId: "seller1",
    sellerName: "Audio Master",
    moq: 100,
    leadTime: "7-14 Days",
  },
  {
    id: "mock2",
    name: "Ergonomic Office Chair",
    price: 85000,
    category: "Furniture",
    rating: 4.5,
    reviews: 89,
    desc: "Designed for comfort and productivity during long work sessions.",
    sellerId: "seller2",
    sellerName: "WorkSpace Pro",
    moq: 50,
    leadTime: "15-30 Days",
  },
  {
    id: "mock3",
    name: "Smart Watch Series X",
    price: 32000,
    category: "Wearables",
    rating: 4.9,
    reviews: 215,
    desc: "Stay connected and track your fitness with precision and style.",
    sellerId: "seller3",
    sellerName: "Tech Wear",
    moq: 500,
    leadTime: "30-45 Days",
  },
];

// ─────────────────────────────────────────────────────────────
// MOBILE CARD  (shown below sm breakpoint)
// Designed for exactly ~170px card width in a 2-col grid.
// Bare minimum: image · name · price · one CTA.
// ─────────────────────────────────────────────────────────────
function MobileProductCard({
  product,
  user,
}: {
  product: Product;
  user: any;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card w-full">
      {/* Image */}
      <Link href={`/marketplace/${product.id}`} className="block relative aspect-square w-full bg-muted/40 dark:bg-slate-900 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package size={24} className="text-muted-foreground opacity-20" />
          </div>
        )}
        {/* Rating pill over image */}
        <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-black/60 text-white rounded px-1 py-0.5">
          <Star size={8} fill="currentColor" className="text-orange-400" />
          <span className="text-[9px] font-bold leading-none">{product.rating}</span>
        </div>
        {/* Wishlist */}
        <button className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center bg-white/70 dark:bg-black/70 rounded-full z-10">
          <Heart size={11} className="text-slate-600 dark:text-slate-300" />
        </button>
      </Link>

      {/* Body */}
      <div className="p-2 flex flex-col gap-1.5">
        {/* Category */}
        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground truncate">
          {product.category}
        </span>

        {/* Name */}
        <Link href={`/marketplace/${product.id}`}>
          <p className="text-[11px] font-bold leading-tight line-clamp-2 text-foreground">
            {product.name}
          </p>
        </Link>

        {/* Price */}
        <p className="text-xs font-black text-foreground tracking-tight">
          ₦{product.price.toLocaleString()}
        </p>

        {/* CTA — full width, no Plus button at this size */}
        <div className="w-full overflow-hidden rounded-lg">
          <PayWithPaystack product={product} user={user} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DESKTOP CARD  (shown from sm breakpoint upward)
// Full-featured card with seller info, MOQ, lead time, both buttons.
// ─────────────────────────────────────────────────────────────
function DesktopProductCard({
  product,
  user,
  onAddToCart,
}: {
  product: Product;
  user: any;
  onAddToCart: (product: Product) => void;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card w-full group hover:shadow-lg transition-all duration-300">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted/30 dark:bg-slate-900 overflow-hidden">
        <Link href={`/marketplace/${product.id}`} className="absolute inset-0 z-10">
          <span className="sr-only">View product</span>
        </Link>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package size={36} className="text-muted-foreground opacity-20 group-hover:scale-110 transition-transform duration-700" />
          </div>
        )}
        <button className="absolute top-2 right-2 p-1.5 bg-white/60 dark:bg-black/60 backdrop-blur-sm rounded-full hover:text-red-500 transition-all z-20 shadow">
          <Heart size={13} />
        </button>
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
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-500/10 text-orange-500 rounded border border-orange-500/10 shrink-0">
            <Star size={10} fill="currentColor" />
            <span className="text-[10px] font-black">{product.rating}</span>
          </div>
        </div>

        {/* Seller */}
        <Link
          href={`/manufacturers/${product.sellerId}`}
          className="flex items-center gap-1.5 group/seller min-w-0"
        >
          <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] font-black uppercase text-primary border border-primary/10 shrink-0">
            {product.sellerName ? product.sellerName.charAt(0) : "S"}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground group-hover/seller:text-primary transition-colors truncate">
            {product.sellerName || "Partner"}
          </span>
        </Link>

        {/* Name */}
        <Link href={`/marketplace/${product.id}`}>
          <h3 className="text-sm md:text-[15px] font-black tracking-tight leading-snug line-clamp-2 hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* MOQ + Lead */}
        <div className="flex flex-col gap-1 text-xs text-muted-foreground border-y border-border py-2">
          <div className="flex justify-between gap-2">
            <span className="shrink-0">MOQ:</span>
            <span className="font-semibold text-foreground truncate text-right">
              {product.moq ? `${product.moq} units` : "Ask Supplier"}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="shrink-0">Lead time:</span>
            <span className="font-semibold text-foreground truncate text-right">
              {product.leadTime || "Ask Supplier"}
            </span>
          </div>
        </div>

        {/* Price + actions */}
        <div className="mt-auto flex flex-col gap-2">
          <p className="text-base md:text-lg font-black text-foreground tracking-tighter">
            ₦{product.price.toLocaleString()}
          </p>
          <div className="flex gap-2 items-stretch">
            <button
              onClick={() => onAddToCart(product)}
              className="w-9 h-9 shrink-0 bg-muted/50 dark:bg-slate-800 text-primary rounded-lg hover:bg-accent transition-all flex items-center justify-center border border-border"
              title="Add to PO"
            >
              <Plus size={15} />
            </button>
            <div className="flex-1 min-w-0 rounded-lg overflow-hidden shadow-md shadow-primary/10">
              <PayWithPaystack product={product} user={user} />
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
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All Products");
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(1000000);
  const [sortBy, setSortBy] = useState("Newest");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const live: Product[] = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          desc: doc.data().description || doc.data().desc,
        })) as any;
        setProducts(live.length > 0 ? live : MOCK_PRODUCTS);
      } catch {
        setProducts(MOCK_PRODUCTS);
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
    <div className="w-full">
      {/* Search + Sort */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 mb-8 lg:mb-12">
        <div className="flex-1 relative group">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
          />
          <input
            type="text"
            placeholder="Search products, categories or wholesalers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-background rounded-lg border border-input focus:ring-2 focus:ring-ring outline-none transition-all font-medium text-sm"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex-1 lg:flex-none h-12 px-4 rounded-lg border flex items-center justify-center gap-2 font-medium text-sm transition-all ${showFilters
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-input hover:bg-accent text-muted-foreground"
              }`}
          >
            <Filter size={16} />
            Filters
          </button>
          <div className="flex-1 lg:flex-none relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full h-12 pl-4 pr-9 bg-background border border-input rounded-lg font-medium outline-none cursor-pointer hover:bg-accent transition-all text-sm appearance-none"
            >
              <option value="Newest">Newest</option>
              <option value="Price: Low to High">Price ↑</option>
              <option value="Price: High to Low">Price ↓</option>
              <option value="Top Rated">Top Rated</option>
            </select>
            <ArrowUpRight
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 rotate-45"
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
            <div className="bg-card p-5 sm:p-8 rounded-lg border border-border grid grid-cols-1 md:grid-cols-2 gap-6 items-end shadow-sm">
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
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 sm:mb-10 scrollbar-hide snap-x">
        {["All Products", "Electronics", "Furniture", "Fashion", "Groceries", "Industrial"].map(
          (cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-md font-semibold text-[11px] whitespace-nowrap border transition-all snap-start ${activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-input hover:bg-accent"
                }`}
            >
              {cat}
            </button>
          )
        )}
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
        </div>
      ) : (
        /*
         * Two-column grid on all screen sizes.
         * The card components themselves differ between mobile and desktop —
         * MobileProductCard is shown below sm, DesktopProductCard from sm up.
         * This avoids fighting Tailwind responsive prefixes for radically
         * different layouts inside a single card structure.
         */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5 w-full">
          {displayed.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="w-full min-w-0"
            >
              {/* Mobile card — hidden from sm upward */}
              <div className="block sm:hidden w-full">
                <MobileProductCard product={product} user={user} />
              </div>

              {/* Desktop card — hidden below sm */}
              <div className="hidden sm:block w-full">
                <DesktopProductCard
                  product={product}
                  user={user}
                  onAddToCart={handleAddToCart}
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
            Explore Complete Marketplace
            <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform" />
          </Link>
        </div>
      )}
    </div>
  );
}