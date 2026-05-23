"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, 
  Search, 
  Filter, 
  Package, 
  TrendingUp, 
  ShieldCheck, 
  ArrowRight,
  ShoppingCart,
  Loader2,
  ChevronRight
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  imageUrl?: string;
  sellerName: string;
}

export default function WholesaleDirectoryPage() {
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", "Electronics", "Groceries", "Industrial", "Wholesale Pack", "Furniture"];

  useEffect(() => {
    const fetchWholesaleProducts = async () => {
      try {
        const q = query(collection(db, "products"), limit(50));
        const querySnapshot = await getDocs(q);
        const fetchedProducts = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
        setProducts(fetchedProducts);
      } catch (error) {
        console.error("Error fetching wholesale catalog:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWholesaleProducts();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sellerName.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen pt-24 pb-20 bg-slate-50 dark:bg-slate-950">
      
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mb-16">
        <div className="glass rounded-[3rem] p-8 md:p-16 border border-primary/20 bg-primary/5 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3 pointer-events-none" />
          
          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase mb-6 tracking-wider ring-1 ring-primary/20">
              <Building2 size={16} /> B2B Sourcing Hub
            </div>
            <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight text-slate-900 dark:text-white leading-[1.1]">
              Source Direct From <br/><span className="gradient-text">Verified Wholesalers</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              Buy in bulk directly from top manufacturers and distributors. Negotiate prices, manage inventory effortlessly, and scale your retail business globally.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 hover:scale-105 active:scale-95">
                 Become a Seller <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats/Value Props */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mb-16">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass p-6 rounded-3xl border border-borderline flex items-center gap-4 hover:-translate-y-1 transition-transform">
               <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0">
                 <ShieldCheck size={28} />
               </div>
               <div>
                 <h4 className="font-bold text-lg">Verified Sellers</h4>
                 <p className="text-sm text-muted-foreground">Every business is vetted manually.</p>
               </div>
            </div>
            <div className="glass p-6 rounded-3xl border border-borderline flex items-center gap-4 hover:-translate-y-1 transition-transform">
               <div className="w-14 h-14 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center shrink-0">
                 <TrendingUp size={28} />
               </div>
               <div>
                 <h4 className="font-bold text-lg">Bulk Pricing</h4>
                 <p className="text-sm text-muted-foreground">Volume discounts on high quantities.</p>
               </div>
            </div>
            <div className="glass p-6 rounded-3xl border border-borderline flex items-center gap-4 hover:-translate-y-1 transition-transform">
               <div className="w-14 h-14 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center shrink-0">
                 <Package size={28} />
               </div>
               <div>
                 <h4 className="font-bold text-lg">Fast Freight</h4>
                 <p className="text-sm text-muted-foreground">Dedicated logistics and shipping.</p>
               </div>
            </div>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
           <h2 className="text-3xl font-black">Wholesale Directory</h2>
           
           <div className="flex gap-4 w-full md:w-auto">
             <div className="flex-1 md:w-80 relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
               <input 
                 type="text" 
                 placeholder="Search wholesale products..."
                 className="w-full pl-12 pr-4 py-3 glass rounded-xl border border-borderline focus:ring-2 focus:ring-primary/50 outline-none"
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
               />
             </div>
             <button className="px-4 glass rounded-xl border border-borderline flex items-center gap-2 hover:bg-muted/50 transition-colors">
               <Filter size={18} />
             </button>
           </div>
        </div>

        {/* Categories */}
        <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-full whitespace-nowrap font-bold text-sm transition-all border ${
                activeCategory === cat 
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                  : "bg-white/50 dark:bg-slate-900/50 text-muted-foreground border-borderline hover:border-primary/50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
             <Loader2 size={48} className="text-primary animate-spin mb-4" />
             <p className="text-muted-foreground font-medium">Loading wholesale catalog...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatePresence>
              {filteredProducts.map((product) => (
                <motion.div 
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="solid-card rounded-[2rem] overflow-hidden group transition-all hover:-translate-y-2 flex flex-col"
                >
                  <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-slate-100 dark:bg-slate-900">
                        <Package size={48} className="mb-2 opacity-20" />
                        <span className="text-xs font-bold uppercase tracking-wider">No Image</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 px-3 py-1 bg-white/90 dark:bg-slate-900/90 text-primary text-[10px] font-black uppercase tracking-wider rounded-full backdrop-blur-sm border border-primary/20 shadow-sm">
                      {product.category}
                    </div>
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5 uppercase font-bold tracking-wider">
                      <Building2 size={12} className="text-primary" /> {product.sellerName}
                    </p>
                    <Link href={`/marketplace/${product.id}`} className="group/details">
                      <h3 className="font-bold text-lg mb-4 line-clamp-2 leading-tight group-hover/details:text-primary transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    
                    <div className="mt-auto pt-4 border-t border-borderline flex items-center justify-between">
                       <div>
                         <p className="text-[10px] text-muted-foreground uppercase font-bold">Bulk Price</p>
                         <p className="font-black text-xl text-primary">₦{product.price.toLocaleString()}</p>
                       </div>
                       <button 
                         onClick={() => addToCart({
                           id: product.id,
                           name: product.name,
                           price: product.price,
                           category: product.category,
                           imageUrl: product.imageUrl,
                           desc: product.description
                         })}
                         className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer"
                       >
                         <ShoppingCart size={18} />
                       </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="py-24 text-center glass rounded-[3rem] border border-borderline">
             <div className="w-24 h-24 bg-muted border border-borderline rounded-full flex items-center justify-center mx-auto mb-6">
                <Package size={40} className="text-muted-foreground" />
             </div>
             <h3 className="text-2xl font-black mb-2">No items found</h3>
             <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
               We couldn&apos;t find any wholesale items matching your current filters.
             </p>
             <button onClick={() => {setSearch(""); setActiveCategory("All");}} className="px-8 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                Clear Filters
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
