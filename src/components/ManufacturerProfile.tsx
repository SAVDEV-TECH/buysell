"use client";

import { MapPin, Calendar, Users, MessageSquare, ArrowLeft, Star, ShieldCheck, CheckCircle2, Video } from "lucide-react";
import Link from "next/link";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import FloatingChatBox from "@/components/FloatingChatBox";
import RFQModal from "@/components/RFQModal";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Loader2 } from "lucide-react";

// Reuse Product interface structure for catalog
interface ManufacturerProduct {
  id: string;
  name: string;
  price: number;
  moq: number;
  leadTime: string;
  imageColor: string;
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

  const handleRequestQuote = (product?: any) => {
    setSelectedProduct(product || null);
    setIsRFQOpen(true);
  };

  useEffect(() => {
    const fetchManufacturerData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // 1. Fetch Manufacturer Details
        const mfgRef = doc(db, "users", id);
        const mfgSnap = await getDoc(mfgRef);
        
        if (mfgSnap.exists()) {
          const d = mfgSnap.data();
          setManufacturer({
            id,
            name: d.businessName || d.name || "Unnamed Manufacturer",
            isVerified: !!d.isVerified,
            location: d.address || "Location not provided",
            yearEstablished: d.yearEstablished || "N/A",
            employees: d.employeeCount || "N/A",
            categories: d.industry ? [d.industry] : ["General"],
            responseRate: "95%+", 
            description: d.storeBio || "This manufacturer hasn't provided a description yet.",
            certifications: d.certifications || ["Verified Business", "Quality Assured"],
            email: d.email,
            avatarUrl: d.avatarUrl
          });
        }

        // 2. Fetch Manufacturer's Products
        const q = query(collection(db, "products"), where("sellerId", "==", id));
        const querySnapshot = await getDocs(q);
        const fetchedProducts = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(fetchedProducts);
      } catch (error) {
        console.error("Error fetching manufacturer profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchManufacturerData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-secondary/10">
        <Loader2 className="animate-spin text-primary mb-4" size={48} />
        <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs">Accessing Manufacturer Records...</p>
      </div>
    );
  }

  if (!manufacturer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-secondary/10 text-center p-6">
        <h2 className="text-3xl font-black mb-4">Manufacturer Not Found</h2>
        <p className="text-muted-foreground mb-8">The requested manufacturer node does not exist or is currently offline.</p>
        <Link href="/manufacturers" className="px-8 py-3 bg-primary text-white rounded-xl font-bold">Return to Directory</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/20 pb-24">
      {/* Cover Image / Banner */}
      <div className="h-48 md:h-64 bg-slate-800 w-full relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl -mt-16 md:-mt-24 relative z-10">
        
        {/* Profile Header Card */}
        <div className="solid-card p-6 md:p-8 mb-8 flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-xl shadow-md border flex items-center justify-center text-4xl font-black text-primary shrink-0">
            {manufacturer.name.charAt(0)}
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
              <div className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">
                {manufacturer.responseRate} Response Rate
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 border-t border-border pt-6 flex-wrap">
              <button 
                onClick={() => setIsChatOpen(true)} 
                className="flex-1 sm:flex-none bg-[#0f172a] text-white h-12 px-8 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-[#0f172a]/90 transition-all shadow-sm"
              >
                <MessageSquare size={18} /> Message Supplier
              </button>
              <Link href={`/dashboard/meeting/${manufacturer.id}`} className="flex-1 sm:flex-none bg-indigo-600 text-white h-12 px-8 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-sm">
                <Video size={18} /> Video Call
              </Link>
              <button 
                onClick={() => handleRequestQuote()}
                className="flex-1 sm:flex-none border border-input bg-background hover:bg-accent hover:text-accent-foreground h-12 px-8 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Star size={18} className="text-amber-500" /> Request Custom Quote
              </button>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
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

        {/* Tab Content */}
        {activeTab === "catalog" && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.length > 0 ? products.map(product => (
              <div key={product.id} className="solid-card overflow-hidden group hover:shadow-md transition-all flex flex-col">
                <div className="aspect-square bg-muted/30 flex items-center justify-center relative overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <span className="text-muted-foreground/30 font-black text-xl italic uppercase">No Image</span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">{product.name}</h3>
                  <div className="flex flex-col gap-1 text-[10px] text-muted-foreground mb-3">
                    <div className="flex justify-between">
                      <span>MOQ:</span>
                      <span className="font-medium text-foreground">{product.moq || "Contact"} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Lead Time:</span>
                      <span className="font-medium text-foreground">{product.leadTime || "Inquire"}</span>
                    </div>
                  </div>
                  <div className="mt-auto flex justify-between items-end pt-3 border-t border-border">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase italic tracking-tighter">Wholesale Price</p>
                      <p className="font-black text-sm text-foreground">₦{Number(product.price).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleRequestQuote(product)}
                        className="text-amber-600 hover:bg-amber-50 p-2 rounded-xl transition-all"
                        title="Request Quote"
                      >
                        <MessageSquare size={16} />
                      </button>
                      <button 
                        onClick={() => setIsCartOpen(true)}
                        className="text-primary hover:bg-primary/10 p-2 rounded-xl transition-all hover:scale-110"
                        title="Add to PO"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    </div>
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

        {activeTab === "about" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 solid-card p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4">Company Overview</h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                {manufacturer.description}
              </p>
              
              <h2 className="text-xl font-bold mb-4">Certifications</h2>
              <ul className="space-y-3">
                {manufacturer.certifications.map((cert: string) => (
                  <li key={cert} className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle2 size={18} className="text-green-500" />
                    {cert}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="space-y-6">
              <div className="solid-card p-6">
                <h3 className="font-bold mb-4 text-sm uppercase tracking-widest text-muted-foreground">Business Details</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Business Type</p>
                    <p className="font-medium text-sm">Manufacturer / Factory</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Main Products</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {manufacturer.categories.map((cat: string) => (
                         <span key={cat} className="bg-secondary text-[10px] font-bold px-2 py-0.5 rounded text-secondary-foreground">{cat}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Employees</p>
                    <p className="font-medium text-sm">{manufacturer.employees} People</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
      
      <FloatingChatBox 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        manufacturerId={manufacturer.id}
        manufacturerName={manufacturer.name}
      />

      <RFQModal 
        isOpen={isRFQOpen}
        onClose={() => setIsRFQOpen(false)}
        product={selectedProduct}
        manufacturer={{
          id: manufacturer.id,
          name: manufacturer.name
        }}
      />
    </div>
  );
}
