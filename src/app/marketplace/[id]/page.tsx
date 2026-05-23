"use client";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { 
  ShoppingCart, 
  Package, 
  ArrowLeft, 
  Star, 
  Heart, 
  ShieldCheck, 
  Truck, 
  Loader2, 
  Plus, 
  Minus,
  CheckCircle2,
  Building2,
  DollarSign,
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import ReviewSection from "@/components/ReviewSection";

const PaystackButton = dynamic(() => import('@/components/PaystackButton'), { ssr: false });

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const docRef = doc(db, "products", id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.error("Product not found");
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 size={48} className="text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Package size={64} className="text-muted-foreground mb-4 opacity-20" />
        <h2 className="text-2xl font-black mb-2">Product Not Found</h2>
        <p className="text-muted-foreground mb-8">The product you are looking for doesn't exist or has been removed.</p>
        <button 
          onClick={() => router.back()}
          className="px-8 py-3 bg-primary text-white rounded-2xl font-bold flex items-center gap-2"
        >
          <ArrowLeft size={20} /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <button 
          onClick={() => router.back()}
          className="mb-8 flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-bold group"
        >
          <div className="p-2 glass rounded-xl group-hover:bg-primary/10 transition-colors">
            <ArrowLeft size={20} />
          </div>
          Back to Marketplace
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={activeImage}
              className="aspect-square glass rounded-[3rem] border border-borderline overflow-hidden relative group"
            >
              <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
                <span className="px-3 py-1 bg-primary/10 backdrop-blur-md text-primary text-[10px] font-black uppercase tracking-wider rounded-full ring-1 ring-primary/20">
                   {product.category}
                </span>
              </div>
              
              <AnimatePresence mode="wait">
                <motion.div 
                  key={activeImage}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="w-full h-full"
                >
                  {product.images?.[activeImage] || product.imageUrl ? (
                    <img 
                      src={product.images?.[activeImage] || product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 border border-borderline">
                       <Package size={80} className="text-muted-foreground mb-4 opacity-10" />
                       <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No Image Available</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <button className="absolute top-4 right-4 p-2 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-full text-foreground hover:text-accent transition-colors z-20 shadow-xl">
                <Heart size={18} />
              </button>
            </motion.div>

            {/* Gallery Nodes */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                 {product.images.map((img: string, i: number) => (
                   <button 
                     key={i}
                     onClick={() => setActiveImage(i)}
                     className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 ${activeImage === i ? 'border-primary shadow-lg scale-105' : 'border-borderline opacity-50 hover:opacity-100'}`}
                   >
                      <img src={img} className="w-full h-full object-cover" />
                   </button>
                 ))}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1 text-orange-500">
                  <Star size={16} fill="currentColor" />
                  <span className="font-bold">{product.rating || 4.8}</span>
                </div>
                <span className="text-muted-foreground text-sm">({product.reviews || 120} reviews)</span>
                <span className="w-1 h-1 bg-muted-foreground/30 rounded-full mx-2" />
                <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-sm bg-emerald-500/10 px-3 py-1 rounded-full">
                  <CheckCircle2 size={16} /> In Stock
                </div>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight tracking-tight">
                {product.name}
              </h1>
              
              <Link 
                href={`/store/${product.sellerId}`}
                className="inline-flex items-center gap-2 group/seller hover:text-primary transition-colors mb-6"
              >
                <div className="p-2 glass rounded-xl group-hover/seller:bg-primary/10 transition-colors">
                  <Building2 size={24} className="text-primary" />
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50 mb-0.5 italic">Official Vendor</p>
                   <p className="text-xl font-black flex items-center gap-2">
                     Sold by <span className="text-foreground group-hover/seller:text-primary transition-colors underline decoration-primary/30 decoration-2 underline-offset-4">{product.sellerName || "Verified Wholesaler"}</span>
                   </p>
                </div>
              </Link>

              {/* Dynamic Price Calculation */}
              {(() => {
                let currentUnitPrice = product.price;
                if (product.tiers && product.tiers.length > 0) {
                  const qualifiedTier = [...product.tiers]
                    .sort((a: any, b: any) => b.minQty - a.minQty)
                    .find((t: any) => quantity >= t.minQty);
                  if (qualifiedTier) currentUnitPrice = qualifiedTier.price;
                }

                return (
                  <div className="p-8 glass rounded-[2.5rem] border border-primary/10 bg-gradient-to-br from-primary/5 to-transparent flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] -rotate-12">
                       <DollarSign size={120} />
                    </div>
                    
                    <div className="relative z-10 text-center sm:text-left">
                       <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">
                         {currentUnitPrice < product.price ? "🎉 Bulk Discount active" : "Standard Price"}
                       </p>
                       <div className="flex items-baseline gap-2">
                         <span className="text-4xl font-black text-primary">₦{currentUnitPrice.toLocaleString()}</span>
                         <span className="text-sm text-muted-foreground font-bold italic">/ unit</span>
                       </div>
                    </div>

                    <div className="flex items-center gap-4 bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl shadow-xl border border-borderline relative z-10">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 hover:bg-muted rounded-lg transition-colors"><Minus size={18} /></button>
                      <span className="text-xl font-black w-10 text-center">{quantity}</span>
                      <button onClick={() => setQuantity(quantity + 1)} className="p-2 hover:bg-muted rounded-lg transition-colors"><Plus size={18} /></button>
                    </div>
                  </div>
                );
              })()}

              {/* Wholesale Savings Table */}
              {product.tiers && product.tiers.length > 0 && (
                <div className="mb-8 p-6 glass border border-borderline rounded-[2rem] overflow-hidden">
                   <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                      <TrendingUp size={14} /> Wholesale Pricing Structure
                   </h4>
                   <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted/30 p-3 rounded-xl">
                         <p className="text-[10px] font-black text-muted-foreground uppercase">Qty Range</p>
                         <p className="text-xs font-bold mt-1">1 - {product.tiers[0].minQty - 1}</p>
                         <p className="text-sm font-black text-primary mt-1">₦{product.price.toLocaleString()}</p>
                      </div>
                      {product.tiers.map((t: any, i: number) => {
                        const isActive = quantity >= t.minQty && (i === product.tiers.length - 1 || quantity < product.tiers[i+1].minQty);
                        return (
                          <div key={i} className={`p-3 rounded-xl transition-all border-2 ${isActive ? 'bg-primary/10 border-primary ring-4 ring-primary/5' : 'bg-muted/10 border-transparent opacity-60'}`}>
                             <p className="text-[10px] font-black uppercase tracking-tighter">Buy {t.minQty}+</p>
                             <p className="text-xs font-bold mt-1">{i === product.tiers.length - 1 ? `${t.minQty}+ Units` : `${t.minQty} - ${product.tiers[i+1].minQty - 1}`}</p>
                             <p className="text-sm font-black text-primary mt-1">₦{t.price.toLocaleString()}</p>
                          </div>
                        );
                      })}
                   </div>
                </div>
              )}

              <div className="space-y-6 mb-10">
                <h4 className="text-lg font-bold flex items-center gap-2 italic">
                   <Package size={20} className="text-primary" /> Logistics Intelligence
                </h4>
                <p className="text-muted-foreground leading-relaxed text-lg">{product.description || product.desc}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => addToCart(product, quantity)} 
                  className="flex-1 px-8 py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-primary/20"
                >
                  <ShoppingCart size={24} /> Add to Cart
                </button>
                <div className="flex-1 [&>button]:w-full [&>button]:py-5 [&>button]:font-black [&>button]:text-lg [&>button]:flex [&>button]:justify-center [&>button]:items-center [&>button]:gap-3 [&>button]:bg-transparent [&>button]:text-primary [&>button]:border-2 [&>button]:border-primary/50 [&>button]:rounded-2xl [&>button]:hover:bg-primary/5 [&>button]:transition-all">
                   <PaystackButton product={product} user={user} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Review Node */}
        <ReviewSection productId={id as string} />
      </div>
    </div>
  );
}
