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
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import ReviewSection from "@/components/ReviewSection";
import { getAllProductImages } from "@/lib/productUtils";
import BuySellLoader from "@/components/BuySellLoader";

const PaystackButton = dynamic(() => import('@/components/PaystackButton'), { ssr: false });

function ProductImageGallery({ images, title }: { images: string[]; title: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  const activeImage = images[selectedIndex] || "";

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image Stage */}
      <div className="aspect-square glass rounded-[2.5rem] md:rounded-[3rem] border border-borderline overflow-hidden flex items-center justify-center relative bg-muted/20 group">
        {activeImage && !imageErrors[selectedIndex] ? (
          <img
            src={activeImage}
            alt={`${title} - View ${selectedIndex + 1}`}
            onError={() => setImageErrors((prev) => ({ ...prev, [selectedIndex]: true }))}
            className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
            <Package size={72} className="text-muted-foreground opacity-20" />
            <span className="text-xs text-muted-foreground font-medium">No Image Preview</span>
          </div>
        )}

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              type="button"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass border border-white/20 text-slate-900 dark:text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all z-10"
              aria-label="Previous Image"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNext}
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass border border-white/20 text-slate-900 dark:text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all z-10"
              aria-label="Next Image"
            >
              <ChevronRight size={20} />
            </button>

            {/* Counter Pill */}
            <div className="absolute bottom-4 right-4 px-3.5 py-1 rounded-full glass text-[11px] font-black text-slate-900 dark:text-white border border-white/20 shadow-md">
              {selectedIndex + 1} / {images.length}
            </div>
          </>
        )}

        {/* Fullscreen Button */}
        {activeImage && !imageErrors[selectedIndex] && (
          <button
            onClick={() => setIsFullscreen(true)}
            type="button"
            className="absolute top-4 right-4 w-9 h-9 rounded-full glass border border-white/20 text-slate-900 dark:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:scale-110"
            title="View Fullscreen"
          >
            <Maximize2 size={15} />
          </button>
        )}
      </div>

      {/* Thumbnails Row */}
      {images.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
          {images.map((img, idx) => {
            const isSelected = idx === selectedIndex;
            const hasError = imageErrors[idx];
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                  isSelected
                    ? "border-primary ring-4 ring-primary/20 scale-105 shadow-md"
                    : "border-borderline opacity-60 hover:opacity-100 hover:scale-100"
                }`}
              >
                {!hasError ? (
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    onError={() => setImageErrors((prev) => ({ ...prev, [idx]: true }))}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Package size={20} className="opacity-30" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <button
            onClick={() => setIsFullscreen(false)}
            type="button"
            className="absolute top-6 right-6 w-12 h-12 rounded-full glass text-white flex items-center justify-center hover:bg-white/20 transition-all z-50"
          >
            <X size={24} />
          </button>

          <div className="relative max-w-5xl max-h-[85vh] w-full h-full flex items-center justify-center">
            <img
              src={activeImage}
              alt={title}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
            />

            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  type="button"
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full glass text-white flex items-center justify-center hover:bg-white/20 transition-all"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={handleNext}
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full glass text-white flex items-center justify-center hover:bg-white/20 transition-all"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
        const { data, error } = await supabase
          .from("products")
          .select("*, supplier_organizations(company_name), product_categories(name)")
          .eq("id", id)
          .single();
        let productData = data;
        if (error) {
          const fallback = await supabase.from("products").select("*").eq("id", id).single();
          productData = fallback.data;
        }
        if (productData) {
          const imgs = getAllProductImages(productData);
          setProduct({
            id: productData.id,
            name: productData.title,
            price: Array.isArray(productData.tiered_pricing) && productData.tiered_pricing.length > 0
              ? (productData.tiered_pricing[0].unit_price || productData.tiered_pricing[0].price || 10)
              : 10,
            category: productData.product_categories?.name || "General B2B",
            desc: productData.description || "",
            sellerId: productData.supplier_organization_id,
            sellerName: productData.supplier_organizations?.company_name || "Verified Supplier",
            imageUrl: imgs[0] || "",
            images: imgs,
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
    return <BuySellLoader message="Opening product details..." fullScreen />;
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
          <ProductImageGallery images={product.images || []} title={product.name} />

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
