"use client";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  ShoppingCart, 
  Package, 
  ArrowLeft, 
  Star, 
  Heart, 
  Loader2, 
  Plus, 
  Minus,
  CheckCircle2,
  Building2,
  DollarSign
} from "lucide-react";
import { motion } from "framer-motion";
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
  const supabase = createClient();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
        if (error) throw error;
        if (data) {
          setProduct({
            id: data.id,
            name: data.title,
            price: data.tiered_pricing?.[0]?.unit_price || 10,
            category: "Industrial",
            desc: data.description || "",
            sellerId: data.supplier_organization_id,
            sellerName: "Supplier Node",
          });
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id, supabase]);

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
          <ArrowLeft size={20} /> Back to Marketplace
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <div className="aspect-square glass rounded-[3rem] border border-borderline overflow-hidden flex items-center justify-center">
            <Package size={80} className="text-muted-foreground opacity-20" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-black rounded-full ring-1 ring-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 size={13} /> Verified Export Grade
              </span>
              <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-xs font-black rounded-full ring-1 ring-blue-500/20">
                SGS / ISO 9001
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-black mb-4">{product.name}</h1>
            <p className="text-3xl font-black text-primary mb-6">${product.price.toLocaleString()} USD <span className="text-xs font-bold text-muted-foreground">/ unit</span></p>
            <p className="text-muted-foreground mb-6 leading-relaxed">{product.desc}</p>

            {/* Incoterms & Export Specs */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-borderline text-xs mb-8">
              <div>
                <span className="text-muted-foreground font-bold">Incoterm Terms:</span>
                <p className="font-black text-slate-900 dark:text-white mt-0.5">FOB / CIF Available</p>
              </div>
              <div>
                <span className="text-muted-foreground font-bold">Nearest Departure Port:</span>
                <p className="font-black text-slate-900 dark:text-white mt-0.5">Lagos / Tema / Mombasa</p>
              </div>
              <div>
                <span className="text-muted-foreground font-bold">Min. Bulk Order (MOQ):</span>
                <p className="font-black text-slate-900 dark:text-white mt-0.5">100 Units</p>
              </div>
              <div>
                <span className="text-muted-foreground font-bold">Export Lead Time:</span>
                <p className="font-black text-slate-900 dark:text-white mt-0.5">7-14 Days</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => addToCart(product, quantity)} 
                className="flex-1 px-8 py-5 bg-primary text-white rounded-2xl font-black text-base hover:bg-primary/90 flex items-center justify-center gap-3 shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                <ShoppingCart size={22} /> Add Bulk Order to Cart
              </button>

              <button 
                onClick={() => {
                  addToCart({
                    ...product,
                    name: `[SAMPLE] ${product.name}`,
                    price: Math.max(15, Math.round(product.price * 1.5)),
                  }, 1);
                  router.push("/checkout");
                }}
                className="flex-1 px-6 py-5 glass border border-primary/40 text-primary rounded-2xl font-black text-base hover:bg-primary/10 flex items-center justify-center gap-2 transition-all"
              >
                <Package size={22} /> Order Sample Unit ($15)
              </button>
            </div>

            <p className="text-[10px] text-muted-foreground text-center sm:text-left mt-3 font-bold">
              💡 Sample costs are 100% credited back toward your first container order.
            </p>
          </div>
        </div>

        <ReviewSection productId={id as string} />
      </div>
    </div>
  );
}
