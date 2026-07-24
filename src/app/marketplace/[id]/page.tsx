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
            <h1 className="text-4xl md:text-5xl font-black mb-4">{product.name}</h1>
            <p className="text-3xl font-black text-primary mb-8">${product.price}</p>
            <p className="text-muted-foreground mb-8">{product.desc}</p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => addToCart(product, quantity)} 
                className="flex-1 px-8 py-5 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary/90 flex items-center justify-center gap-3 shadow-2xl"
              >
                <ShoppingCart size={24} /> Add to Cart
              </button>
            </div>
          </div>
        </div>

        <ReviewSection productId={id as string} />
      </div>
    </div>
  );
}
