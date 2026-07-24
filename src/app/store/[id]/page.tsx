"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  ShoppingBag, 
  Star, 
  MapPin, 
  Mail, 
  Phone, 
  MessageSquare, 
  Package, 
  Search,
  CheckCircle2,
  Zap,
  Globe,
  Loader2,
  Building2
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useParams } from "next/navigation";

export default function StorefrontPage() {
  const { id: sellerId } = useParams() as { id: string };
  const { user } = useAuth();
  const { addToCart } = useCart();
  
  const [seller, setSeller] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const fetchStoreData = async () => {
      if (!sellerId) return;
      setLoading(true);
      
      try {
        const { data: org } = await supabase.from("organizations").select("*").eq("id", sellerId).single();
        if (org) {
          setSeller({
            businessName: org.company_name,
            address: org.country_code || "Global",
            isVerified: org.verification_level === "verified",
          });
        }

        const { data: fetchedProducts } = await supabase.from("products").select("*").eq("supplier_organization_id", sellerId);
        setProducts((fetchedProducts || []).map(p => ({
          id: p.id,
          name: p.title,
          price: p.tiered_pricing?.[0]?.unit_price || 10,
          category: "Industrial",
          desc: p.description || ""
        })));
      } catch (error) {
        console.error("Critical error fetching storefront:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStoreData();
  }, [sellerId, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 size={48} className="text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Establishing Link...</p>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
        <h1 className="text-2xl font-black mb-2">Storefront Not Found</h1>
        <Link href="/marketplace" className="px-8 py-3 bg-primary text-white rounded-2xl font-bold">Return to Market</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="h-64 md:h-80 bg-slate-900 relative overflow-hidden flex items-end p-8 text-white">
        <div>
          <h1 className="text-4xl font-extrabold">{seller.businessName}</h1>
          <p className="text-sm opacity-75">{seller.address}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map(p => (
            <div key={p.id} className="solid-card p-4 rounded-2xl border border-borderline">
              <h4 className="font-bold text-sm mb-2">{p.name}</h4>
              <p className="font-black text-primary mb-4">${p.price}</p>
              <button 
                onClick={() => addToCart(p)}
                className="w-full py-2 bg-primary text-white font-bold rounded-xl text-xs"
              >
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
