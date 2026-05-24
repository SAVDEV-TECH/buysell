"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { ShoppingCart, Package, ArrowRight, Star, Heart, Filter, Search, Zap, Loader2, Plus, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import dynamic from "next/dynamic";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import ProductSkeleton from "@/components/ProductSkeleton";
import { VerifiedBadge } from "@/components/VerifiedBadge";

const PayWithPaystack = dynamic(() => import('@/components/PaystackButton'), { ssr: false });

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
    leadTime: "7-14 Days"
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
    leadTime: "15-30 Days"
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
    leadTime: "30-45 Days"
  },
];

export default function ProductExplorer({ limit }: { limit?: number }) {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Advanced Filter states
  const [activeCategory, setActiveCategory] = useState("All Products");
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(1000000);
  const [sortBy, setSortBy] = useState("Newest");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const liveProducts: Product[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          desc: doc.data().description || doc.data().desc
        })) as any;
        
        setProducts(liveProducts.length > 0 ? liveProducts : MOCK_PRODUCTS);
      } catch (error) {
        console.error("Error fetching products:", error);
        setProducts(MOCK_PRODUCTS);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         p.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All Products" || p.category === activeCategory;
    const matchesPrice = p.price >= minPrice && p.price <= maxPrice;
    
    return matchesSearch && matchesCategory && matchesPrice;
  }).sort((a, b) => {
    if (sortBy === "Price: Low to High") return a.price - b.price;
    if (sortBy === "Price: High to Low") return b.price - a.price;
    if (sortBy === "Top Rated") return b.rating - a.rating;
    return 0; // Newest is default as fetched from DB
  });

  const displayedProducts = limit ? filteredProducts.slice(0, limit) : filteredProducts;

  return (
    <div className="w-full">
      {/* Header & Search */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 lg:gap-6 mb-8 lg:mb-12">
        <div className="flex-1 w-full max-w-2xl">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search for products, categories or wholesalers..."
              className="w-full pl-11 pr-4 py-3.5 sm:py-4 bg-background rounded-lg border border-input focus:ring-2 focus:ring-ring outline-none transition-all font-medium text-sm sm:text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
           <button 
             onClick={() => setShowFilters(!showFilters)}
             className={`flex-1 lg:flex-none h-[48px] sm:h-[56px] px-4 rounded-lg transition-all border flex items-center justify-center gap-2 font-medium text-sm ${showFilters ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-accent text-muted-foreground'}`}
           >
             <Filter size={18} />
             <span className="lg:hidden">Filters</span>
           </button>
           <div className="flex-1 lg:flex-none relative">
             <select 
               value={sortBy}
               onChange={(e) => setSortBy(e.target.value)}
               className="w-full h-[48px] sm:h-[56px] pl-4 pr-10 bg-background border border-input rounded-lg font-medium outline-none cursor-pointer hover:bg-accent transition-all text-sm appearance-none"
             >
               <option value="Newest">Newest First</option>
               <option value="Price: Low to High">Price: Low to High</option>
               <option value="Price: High to Low">Price: High to Low</option>
               <option value="Top Rated">Top Rated</option>
             </select>
             <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
               <ArrowUpRight size={16} className="rotate-45" />
             </div>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-8 lg:mb-12"
          >
            <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-lg border border-border grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 shadow-sm items-end">
               <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 italic">Price Range (₦)</h4>
                  <div className="flex items-center gap-3 sm:gap-4">
                     <input 
                       type="number" 
                       placeholder="Min" 
                       value={minPrice || ""}
                       onChange={(e) => setMinPrice(Number(e.target.value))}
                       className="w-full px-4 py-3 glass rounded-xl border border-borderline outline-none focus:border-primary/50 text-sm font-bold"
                     />
                     <span className="text-muted-foreground font-black opacity-30">—</span>
                     <input 
                       type="number" 
                       placeholder="Max" 
                       value={maxPrice === 1000000 ? "" : maxPrice}
                       onChange={(e) => setMaxPrice(Number(e.target.value) || 1000000)}
                       className="w-full px-4 py-3 glass rounded-xl border border-borderline outline-none focus:border-primary/50 text-sm font-bold"
                     />
                  </div>
               </div>

               <div className="flex items-end justify-center sm:justify-end">
                  <button 
                    onClick={() => { setMinPrice(0); setMaxPrice(1000000); setActiveCategory("All Products"); setSearch(""); }}
                    className="w-full sm:w-auto px-8 py-3 bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-all"
                  >
                    Reset Applied Filters
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories */}
      <div className="relative mb-12">
        <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
          {["All Products", "Electronics", "Furniture", "Fashion", "Groceries", "Industrial"].map((cat) => (
            <button 
              key={cat} 
              onClick={() => setActiveCategory(cat)}
              className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-md font-medium text-xs whitespace-nowrap transition-all border snap-start ${
                activeCategory === cat ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input hover:bg-accent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid System */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
           {[...Array(limit || 6)].map((_, i) => (
             <ProductSkeleton key={i} />
           ))}
        </div>
      ) : displayedProducts.length === 0 ? (
        <div className="py-20 sm:py-32 text-center bg-card rounded-lg border border-dashed border-border px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
           <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-2xl sm:rounded-[2rem] flex items-center justify-center mx-auto mb-6 sm:mb-8">
             <Search size={32} className="text-muted-foreground opacity-30 sm:hidden" />
             <Search size={40} className="text-muted-foreground opacity-30 hidden sm:block" />
           </div>
           <h3 className="text-2xl sm:text-3xl font-black mb-2 tracking-tighter">No Suppliers Found</h3>
           <p className="text-muted-foreground font-medium max-w-sm mx-auto text-sm sm:text-base">Adjust your filters or search terms to source specific manufacturers.</p>
           <button 
             onClick={() => { setMinPrice(0); setMaxPrice(1000000); setActiveCategory("All Products"); setSearch(""); }}
             className="mt-8 sm:mt-10 px-8 sm:px-10 py-3.5 sm:py-4 bg-primary text-white rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/20"
           >
             Clear All Filters
           </button>
        </div>
      ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 text-slate-800 dark:text-neutral-200 w-full overflow-hidden">
          {displayedProducts.map((product, i) => (
            <motion.div 
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="solid-card overflow-hidden flex flex-col group hover:shadow-md transition-all border border-border w-full min-w-0"
            >
              {/* Image Container */}
              <div className="aspect-[4/3] bg-muted/30 dark:bg-slate-900 flex items-center justify-center border-b border-borderline/50 relative overflow-hidden group">
                 <Link href={`/marketplace/${product.id}`} className="absolute inset-0 z-10 block cursor-pointer">
                    <span className="sr-only">Access Details</span>
                 </Link>
                 
                 <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                 
                 {product.imageUrl ? (
                   <img src={product.imageUrl} alt={product.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                 ) : (
                   <div className="group-hover:scale-125 transition-transform duration-700">
                     <Package size={24} className="text-muted-foreground opacity-20 sm:hidden" />
                     <Package size={32} className="text-muted-foreground opacity-20 hidden sm:block" />
                   </div>
                 )}

                 <button className="absolute top-1 right-1 sm:top-2 sm:right-2 p-1 sm:p-2 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-full text-foreground hover:bg-white dark:hover:bg-black hover:text-red-500 transition-all z-20 shadow-lg">
                   <Heart size={12} className="sm:hidden" />
                   <Heart size={14} className="hidden sm:block" />
                 </button>
                 <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 flex gap-1 z-20">
                    <VerifiedBadge showText={true} />
                  </div>
              </div>

              <div className="p-2 sm:p-3 flex-1 flex flex-col min-w-0">
                <div className="flex justify-between items-start mb-1 sm:mb-2">
                  <span className="text-[10px] sm:text-xs text-muted-foreground font-black uppercase tracking-widest italic truncate">{product.category}</span>
                   <div className="flex items-center gap-0.5 sm:gap-1 px-1 py-0.5 bg-orange-500/10 text-orange-500 rounded-lg border border-orange-500/10 shrink-0">
                    <Star size={8} fill="currentColor" className="sm:hidden" />
                    <Star size={12} fill="currentColor" className="hidden sm:block" />
                    <span className="text-[10px] sm:text-xs font-black">{product.rating}</span>
                  </div>
                </div>
                
                <Link 
                  href={`/manufacturers/${product.sellerId}`}
                  className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-2 group/seller hover:text-primary transition-colors min-w-0"
                >
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-sm sm:rounded-md bg-muted flex items-center justify-center text-[8px] sm:text-[10px] font-black uppercase text-primary border border-primary/10 group-hover/seller:scale-110 transition-all shrink-0">
                    {product.sellerName ? product.sellerName.charAt(0) : 'S'}
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-tight text-muted-foreground group-hover/seller:text-primary transition-colors truncate">
                    {product.sellerName || "Partner"}
                  </span>
                  <VerifiedBadge />
                </Link>

                <Link href={`/marketplace/${product.id}`} className="group/title block min-w-0">
                  <h3 className="text-xs sm:text-sm font-black mb-0.5 sm:mb-1 group-hover/title:text-primary transition-colors flex items-center justify-between tracking-tight leading-tight line-clamp-2">
                    {product.name}
                  </h3>
                </Link>

                <div className="flex flex-col gap-1 my-2 text-[10px] text-muted-foreground border-y border-border py-2">
                  <div className="flex justify-between">
                    <span>MOQ:</span>
                    <span className="font-medium text-foreground">{product.moq ? `${product.moq} units` : "Contact Supplier"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lead Time:</span>
                    <span className="font-medium text-foreground">{product.leadTime || "Contact Supplier"}</span>
                  </div>
                </div>
                
                <div className="mt-auto flex flex-col gap-1 sm:gap-2 pt-1 sm:pt-2">
                  <div className="flex flex-row sm:flex-col justify-between items-center sm:items-start min-w-0">
                     <p className="text-[10px] sm:text-[11px] text-muted-foreground font-black uppercase tracking-widest italic sm:mb-0.5">Price</p>
                     <p className="text-sm sm:text-base font-black text-slate-800 dark:text-white tracking-tighter truncate">₦{product.price.toLocaleString()}</p>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => addToCart({
                        id: String(product.id),
                        name: product.name,
                        price: product.price,
                        category: product.category,
                        imageUrl: product.imageUrl,
                        desc: product.desc
                      })}
                      className="p-1 sm:p-2 bg-muted/50 dark:bg-slate-800 text-primary rounded sm:rounded-lg hover:bg-accent transition-all flex items-center justify-center shrink-0 border border-border"
                      title="Add to PO"
                    >
                      <Plus size={10} className="sm:hidden" />
                      <Plus size={16} className="hidden sm:block" />
                    </button>
                    <div className="flex-1 min-w-0 relative group/pay shadow-xl shadow-primary/10 rounded sm:rounded-lg overflow-hidden [&_button]:text-[9px] sm:[&_button]:text-sm [&_button]:py-1.5 sm:[&_button]:py-2 [&_button]:px-1 sm:[&_button]:px-2 [&_button_svg]:w-3 [&_button_svg]:h-3 sm:[&_button_svg]:w-4 sm:[&_button_svg]:h-4">
                       <PayWithPaystack product={product} user={user} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      
      {limit && filteredProducts.length > limit && (
        <div className="mt-12 sm:mt-16 text-center">
          <Link 
            href="/marketplace" 
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-4 sm:py-5 bg-primary text-white rounded-2xl font-black text-base sm:text-lg hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/20 group"
          >
            Explore Complete Marketplace
            <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
          </Link>
        </div>
      )}
    </div>
  );
}
