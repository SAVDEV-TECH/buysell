"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
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
  Loader2
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  imageUrl?: string;
  sellerName: string;
  sellerId?: string;
  manufacturerId?: string;
}

export default function WholesaleDirectoryPage() {
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const supabase = createClient();

  const categories = ["All", "Industrial", "Electronics", "Groceries", "Furniture"];

  useEffect(() => {
    const fetchWholesaleProducts = async () => {
      try {
        const { data, error } = await supabase.from("products").select("*, product_categories(name)").limit(50);
        if (error) throw error;

        const fetched = (data || []).map((p: any) => ({
          id: p.id,
          name: p.title,
          price: p.tiered_pricing?.[0]?.unit_price || 10,
          category: p.product_categories?.name || "Industrial",
          description: p.description || "",
          sellerName: "Verified Supplier",
          sellerId: p.supplier_organization_id,
          manufacturerId: p.supplier_organization_id,
        }));

        setProducts(fetched);
      } catch (error) {
        console.error("Error fetching wholesale catalog:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWholesaleProducts();
  }, [supabase]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen pt-24 pb-20 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 md:px-8 mb-16">
        <div className="glass rounded-[3rem] p-8 md:p-16 border border-primary/20 bg-primary/5 text-center relative overflow-hidden">
          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase mb-6 tracking-wider ring-1 ring-primary/20">
              <Building2 size={16} /> B2B Sourcing Hub
            </div>
            <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight text-slate-900 dark:text-white leading-[1.1]">
              Source Direct From <br/><span className="gradient-text">Verified Wholesalers</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              Buy in bulk directly from top manufacturers and distributors.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 hover:scale-105 active:scale-95">
                 Become a Seller <ArrowRight size={20} />
              </Link>
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
           </div>
        </div>

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
                  <div className="p-6 flex-1 flex flex-col">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5 uppercase font-bold tracking-wider">
                      <Building2 size={12} className="text-primary" /> {product.sellerName}
                    </p>
                    <Link href={`/marketplace/${product.id}`}>
                      <h3 className="font-bold text-lg mb-4 line-clamp-2 leading-tight">
                        {product.name}
                      </h3>
                    </Link>
                    
                    <div className="mt-auto pt-4 border-t border-borderline flex items-center justify-between">
                       <div>
                         <p className="text-[10px] text-muted-foreground uppercase font-bold">Bulk Price</p>
                         <p className="font-black text-xl text-primary">${product.price}</p>
                       </div>
                       <button 
                         onClick={() => addToCart({
                           id: product.id,
                           name: product.name,
                           price: product.price,
                           category: product.category,
                           imageUrl: product.imageUrl,
                           desc: product.description,
                           sellerId: product.sellerId,
                           manufacturerId: product.manufacturerId
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
             <h3 className="text-2xl font-black mb-2">No items found</h3>
          </div>
        )}
      </div>
    </div>
  );
}
