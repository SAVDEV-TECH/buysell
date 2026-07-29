"use client";

import { MapPin, Calendar, Users, MessageSquare, ArrowLeft, Star, CheckCircle2, Video, Package, Loader2 } from "lucide-react";
import Link from "next/link";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import FloatingChatBox from "@/components/FloatingChatBox";
import RFQModal from "@/components/RFQModal";
import { createClient } from "@/lib/supabase/client";
import { getProductImageUrl } from "@/lib/productUtils";
import BuySellLoader from "@/components/BuySellLoader";

function ProductCardImage({ product }: { product: any }) {
  const [imgError, setImgError] = useState(false);
  const imgUrl = getProductImageUrl(product);

  if (!imgUrl || imgError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <Package size={32} className="text-muted-foreground opacity-20" />
      </div>
    );
  }

  return (
    <img 
      src={imgUrl} 
      alt={product.title || "Product"} 
      onError={() => setImgError(true)} 
      className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
    />
  );
}

export default function ManufacturerProfile({ id }: { id: string }) {
  const { setIsCartOpen } = useCart();
  const [manufacturer, setManufacturer] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"catalog" | "about">("catalog");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRFQOpen, setIsRFQOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const supabase = createClient();

  const handleRequestQuote = (product?: any) => {
    setSelectedProduct(product || null);
    setIsRFQOpen(true);
  };

  useEffect(() => {
    const fetchManufacturerData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data: org } = await supabase.from("organizations").select("*").eq("id", id).single();
        
        if (org) {
          setManufacturer({
            id,
            name: org.company_name,
            isVerified: org.verification_level === "verified",
            location: org.country_code || "Global",
            yearEstablished: "2020",
            employees: "50-100",
            categories: ["Industrial"],
            responseRate: "95%+", 
            description: "Verified supplier on BuySell network.",
            certifications: ["Verified Business"],
          });
        }

        const { data: fetchedProducts } = await supabase.from("products").select("*").eq("supplier_organization_id", id);
        setProducts(fetchedProducts || []);
      } catch (error) {
        console.error("Error fetching manufacturer profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchManufacturerData();
  }, [id, supabase]);

  if (loading) {
    return <BuySellLoader message="Accessing Manufacturer Records..." fullScreen />;
  }

  if (!manufacturer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-secondary/10 text-center p-6">
        <h2 className="text-3xl font-black mb-4">Manufacturer Not Found</h2>
        <p className="text-muted-foreground mb-8">The requested manufacturer node does not exist.</p>
        <Link href="/manufacturers" className="px-8 py-3 bg-primary text-white rounded-xl font-bold">Return to Directory</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/20 pb-24">
      <div className="h-48 md:h-64 bg-slate-800 w-full relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl -mt-16 md:-mt-24 relative z-10">
        <div className="solid-card p-6 md:p-8 mb-8 flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-xl shadow-md border flex items-center justify-center text-4xl font-black text-primary shrink-0">
            {manufacturer?.name?.charAt(0) || "M"}
          </div>
          
          <div className="flex-1">
            <Link href="/manufacturers" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
              <ArrowLeft size={16} className="mr-1" /> Back to Directory
            </Link>
            
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground flex items-center gap-3 mb-3">
              {manufacturer.name}
              {manufacturer.isVerified && <VerifiedBadge />}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
              <div className="flex items-center gap-1.5">
                <MapPin size={16} className="text-primary/70" />
                <span>{manufacturer.location}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={16} className="text-primary/70" />
                <span>Est. {manufacturer.yearEstablished}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users size={16} className="text-primary/70" />
                <span>{manufacturer.employees} Employees</span>
              </div>
            </div>

            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 md:flex md:flex-row gap-3 border-t border-border pt-6 flex-wrap">
              <button 
                onClick={() => setIsChatOpen(true)} 
                className="flex-1 sm:flex-none bg-[#0f172a] text-white h-12 px-8 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-[#0f172a]/90 transition-all shadow-sm"
              >
                <MessageSquare size={18} /> Message Supplier
              </button>
              <button 
                onClick={() => handleRequestQuote()}
                className="flex-1 sm:flex-none border border-input bg-background hover:bg-accent hover:text-accent-foreground h-12 px-8 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Star size={18} className="text-amber-500" /> Request Custom Quote
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-8 border-b border-border mb-8">
          <button 
            onClick={() => setActiveTab("catalog")}
            className={`pb-4 text-sm font-bold border-b-2 transition-colors ${activeTab === "catalog" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Product Catalog
          </button>
          <button 
            onClick={() => setActiveTab("about")}
            className={`pb-4 text-sm font-bold border-b-2 transition-colors ${activeTab === "about" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            About Company
          </button>
        </div>

        {activeTab === "catalog" && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.length > 0 ? products.map(product => (
              <div key={product.id} className="solid-card overflow-hidden group hover:shadow-md transition-all flex flex-col">
                <div className="aspect-square bg-muted relative overflow-hidden flex items-center justify-center">
                  <ProductCardImage product={product} />
                </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-sm mb-2 line-clamp-2">{product.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2">HS Code: {product.hs_code || "N/A"}</p>
                    <div className="mt-auto flex justify-between items-end pt-3 border-t border-border">
                      <button 
                        onClick={() => handleRequestQuote(product)}
                        className="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 p-2 rounded-xl transition-all font-bold text-xs flex items-center gap-1.5"
                      >
                        <MessageSquare size={16} /> Request Quote
                      </button>
                    </div>
                  </div>
                </div>
            )) : (
              <div className="col-span-full py-20 text-center glass rounded-3xl border border-dashed border-borderline">
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">This manufacturer hasn't uploaded a catalog yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <FloatingChatBox 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        manufacturerId={manufacturer?.id || id}
        manufacturerName={manufacturer?.name || "Supplier"}
      />

      <RFQModal 
        isOpen={isRFQOpen}
        onClose={() => setIsRFQOpen(false)}
        product={selectedProduct}
        manufacturer={{
          id: manufacturer?.id || id,
          name: manufacturer?.name || "Supplier"
        }}
      />
    </div>
  );
}
