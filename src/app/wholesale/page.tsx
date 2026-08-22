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
    <div className="min-h-screen pt-12 pb-20 bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 md:px-8 mb-12">
        <div className="bg-card rounded-3xl p-8 md:p-12 border border-border text-center relative overflow-hidden shadow-sm">
          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase mb-4 tracking-wider">
              <Building2 size={15} /> B2B Sourcing Hub
            </div>
            <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight text-foreground leading-[1.1]">
              Source Direct From <br/><span className="gradient-text">Verified Wholesalers</span>
            </h1>
            <p className="text-base text-muted-foreground mb-8 max-w-2xl mx-auto">
              Buy in bulk directly from top manufacturers and verified distributors.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register" className="w-full sm:w-auto px-6 py-3.5 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-md">
                 Become a Seller <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
           <h2 className="text-2xl font-bold text-foreground">Wholesale Directory</h2>
           
           <div className="flex gap-4 w-full md:w-auto">
             <div className="flex-1 md:w-80 relative">
               <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
               <input 
                 type="text" 
                 placeholder="Search wholesale products..."
                 className="w-full pl-10 pr-4 py-2.5 bg-card rounded-xl border border-border focus:ring-1 focus:ring-primary outline-none text-xs text-foreground placeholder:text-muted-foreground"
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
               />
             </div>
           </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
             <Loader2 size={36} className="text-primary animate-spin mb-3" />
             <p className="text-muted-foreground font-medium text-xs">Loading wholesale catalog...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AnimatePresence>
              {filteredProducts.map((product) => (
                <motion.div 
                  key={product.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md hover:border-primary/30 transition-all flex flex-col"
                >
                  <div className="p-4 flex-1 flex flex-col">
                    <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1.5 uppercase font-bold tracking-wider">
                      <Building2 size={11} className="text-primary" /> {product.sellerName}
                    </p>
                    <Link href={`/marketplace/${product.id}`}>
                      <h3 className="font-bold text-sm mb-3 line-clamp-2 text-foreground hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    
                    <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                       <div>
                         <p className="text-[9px] text-muted-foreground uppercase font-semibold">Bulk Price</p>
                         <p className="font-bold text-base text-primary">${product.price}</p>
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
                         className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer"
                       >
                         <ShoppingCart size={15} />
                       </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="py-20 text-center bg-card rounded-2xl border border-border">
             <h3 className="text-lg font-bold text-foreground mb-1">No items found</h3>
             <p className="text-xs text-muted-foreground">Try adjusting your search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
