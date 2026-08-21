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
import Image from "next/image";
import dynamic from "next/dynamic";
import ReviewSection from "@/components/ReviewSection";
import { getAllProductImages } from "@/lib/productUtils";
import BuySellLoader from "@/components/BuySellLoader";
import AITranslationButton from "@/components/AITranslationButton";
import FreightCalculator from "@/components/FreightCalculator";

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
      <div className="aspect-square bg-card rounded-2xl border border-border overflow-hidden flex items-center justify-center relative shadow-sm group">
        {activeImage && !imageErrors[selectedIndex] ? (
          <Image
            src={activeImage}
            alt={`${title} - View ${selectedIndex + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            onError={() => setImageErrors((prev) => ({ ...prev, [selectedIndex]: true }))}
            className="object-cover transition-all duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
            <Package size={64} className="text-muted-foreground opacity-30" />
            <span className="text-xs text-muted-foreground font-medium">No Image Preview</span>
          </div>
        )}

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm border border-border text-foreground flex items-center justify-center shadow-md hover:bg-background transition-all z-10"
              aria-label="Previous Image"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleNext}
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm border border-border text-foreground flex items-center justify-center shadow-md hover:bg-background transition-all z-10"
              aria-label="Next Image"
            >
              <ChevronRight size={18} />
            </button>

            {/* Counter Pill */}
            <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-background/80 backdrop-blur-sm text-[11px] font-bold text-foreground border border-border shadow-sm">
              {selectedIndex + 1} / {images.length}
            </div>
          </>
        )}

        {/* Fullscreen Button */}
        {activeImage && !imageErrors[selectedIndex] && (
          <button
            onClick={() => setIsFullscreen(true)}
            type="button"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:scale-105"
            title="View Fullscreen"
          >
            <Maximize2 size={14} />
          </button>
        )}
      </div>

      {/* Thumbnails Row */}
      {images.length > 1 && (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {images.map((img, idx) => {
            const isSelected = idx === selectedIndex;
            const hasError = imageErrors[idx];
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20 scale-105 shadow-sm"
                    : "border-border opacity-70 hover:opacity-100"
                }`}
              >
                {!hasError ? (
                  <Image
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    fill
                    sizes="64px"
                    onError={() => setImageErrors((prev) => ({ ...prev, [idx]: true }))}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Package size={18} className="opacity-30" />
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
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all z-50"
          >
            <X size={20} />
          </button>

          <div className="relative max-w-5xl max-h-[85vh] w-full h-full flex items-center justify-center">
            <Image
              src={activeImage}
              alt={title}
              fill
              className="object-contain rounded-xl shadow-2xl"
            />

            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  type="button"
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={handleNext}
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all"
                >
                  <ChevronRight size={20} />
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
  const [translatedDesc, setTranslatedDesc] = useState<string | null>(null);
  const [translatedLang, setTranslatedLang] = useState<string | null>(null);
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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background text-foreground">
        <Package size={64} className="text-muted-foreground mb-4 opacity-30" />
        <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
        <button 
          onClick={() => router.back()}
          className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all text-sm"
        >
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-12 pb-20 bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <button 
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-semibold text-sm group"
        >
          <ArrowLeft size={16} /> Back to Marketplace
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <ProductImageGallery images={product.images || []} title={product.name} />

          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 size={12} /> Verified Export Grade
              </span>
              <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full border border-blue-500/20">
                SGS / ISO 9001
              </span>
            </div>

            <h1 className="text-2xl md:text-4xl font-bold tracking-tight mb-3 text-foreground">{product.name}</h1>
            <p className="text-2xl font-bold text-primary mb-4">${product.price.toLocaleString()} USD <span className="text-xs font-medium text-muted-foreground">/ unit</span></p>
            
            {/* AI Translation Toolbar */}
            <div className="mb-3">
              <AITranslationButton
                originalText={product.desc}
                onTranslated={(text, lang) => {
                  setTranslatedDesc(text);
                  setTranslatedLang(lang);
                }}
                onReset={() => {
                  setTranslatedDesc(null);
                  setTranslatedLang(null);
                }}
              />
            </div>

            <p className="text-muted-foreground mb-6 leading-relaxed text-sm">
              {translatedDesc ? (
                <>
                  <span className="inline-block px-2 py-0.5 mb-2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[11px] font-bold">
                    Translated to {translatedLang}
                  </span>
                  <br />
                  {translatedDesc}
                </>
              ) : (
                product.desc
              )}
            </p>

            {/* Incoterms & Export Specs */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-card border border-border text-xs mb-6 shadow-sm">
              <div>
                <span className="text-muted-foreground font-semibold">Incoterm Terms:</span>
                <p className="font-bold text-foreground mt-0.5">FOB / CIF Available</p>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold">Nearest Departure Port:</span>
                <p className="font-bold text-foreground mt-0.5">Lagos / Tema / Mombasa</p>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold">Min. Bulk Order (MOQ):</span>
                <p className="font-bold text-foreground mt-0.5">100 Units</p>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold">Export Lead Time:</span>
                <p className="font-bold text-foreground mt-0.5">7-14 Days</p>
              </div>
            </div>

            {/* Freight & Bulk Calculator */}
            <div className="mb-6">
              <FreightCalculator
                basePrice={product.price || 10}
                moq={product.moq || 100}
                unit="pcs"
                tieredPricing={product.tiered_pricing || []}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => addToCart(product, quantity)} 
                className="flex-1 px-6 py-3.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <ShoppingCart size={18} /> Add Bulk Order to Cart
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
                className="flex-1 px-5 py-3.5 bg-card border border-border text-foreground hover:bg-muted rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Package size={18} className="text-primary" /> Order Sample Unit ($15)
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground text-center sm:text-left mt-3 font-medium">
              💡 Sample costs are 100% credited back toward your first container order.
            </p>
          </div>
        </div>

        <ReviewSection productId={id as string} />
      </div>
    </div>
  );
}
