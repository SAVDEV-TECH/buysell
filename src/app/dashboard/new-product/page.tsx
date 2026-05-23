"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Package, 
  Tag, 
  DollarSign, 
  Type, 
  Image as ImageIcon,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  X
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function NewProductPage() {
  const { user, role } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [tiers, setTiers] = useState<{ minQty: number, price: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImages(prev => [...prev, ...files]);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const addTier = () => {
    setTiers([...tiers, { minQty: 1, price: 0 }]);
  };

  const removeTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: "minQty" | "price", value: string) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
    setTiers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (role !== "MANUFACTURER" && role !== "WHOLESALER" && role !== "ADMIN") {
      setError("Only manufacturers and wholesalers can list new products.");
      return;
    }

    if (images.length === 0) {
      setError("Please add at least one product photo.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const uploadAndSave = async () => {
        const imageUrls: string[] = [];
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "cloud_name";
        const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "unsigned_preset";

        // Upload all images in parallel
        await Promise.all(images.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("upload_preset", preset);
          
          const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: "POST",
            body: formData,
          });
          
          if (!res.ok) {
             const errorData = await res.json();
             throw new Error(`Cloudinary Error: ${errorData.error?.message || "Failed to upload"}`);
          }
          
          const data = await res.json();
          imageUrls.push(data.secure_url);
        }));

        // 2. Save to Firestore with Tiers & Array of Images
        await addDoc(collection(db, "products"), {
          name,
          price: parseFloat(price),
          category,
          description,
          imageUrl: imageUrls[0], // Primary image for compatibility
          images: imageUrls,      // Full gallery array
          tiers: tiers.length > 0 ? tiers.sort((a, b) => a.minQty - b.minQty) : null,
          sellerId: user.uid,
          sellerName: user.displayName || "Anonymous Seller",
          createdAt: serverTimestamp(),
          rating: 0,
          reviews: 0
        });
      };

      // Wrap the process in a strict 15-second timeout to combat silent Next.js offline queue hangs
      await Promise.race([
        uploadAndSave(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Network timeout: Ensure your dev server is active and try refreshing the page.")), 15000))
      ]);

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: unknown) {
      console.error("Error adding product:", err);
      setError((err as { message?: string }).message || "Failed to add product. Please navigate completely back and try again.");
    } finally {
      setLoading(false);
    }
  };

  const categories = ["Electronics", "Furniture", "Fashion", "Groceries", "Industrial", "Wholesale Pack"];

  if (role !== "MANUFACTURER" && role !== "WHOLESALER" && role !== "ADMIN" && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold mb-4">Access Restricted</h2>
        <p className="text-muted-foreground mb-6">Only manufacturers and wholesalers can access this page.</p>
        <Link href="/dashboard" className="text-primary font-bold hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="flex items-center justify-between mb-10">
        <div>
           <h1 className="text-3xl font-bold">List New Product</h1>
           <p className="text-muted-foreground">Add your item to the global marketplace</p>
        </div>
        <Package size={48} className="text-primary/20" />
      </div>

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-3xl p-12 text-center border-green-500/20 shadow-xl"
          >
            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Product Listed Successfully!</h2>
            <p className="text-muted-foreground">Redirecting you to dashboard...</p>
          </motion.div>
        ) : (
          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit} 
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Product Info */}
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-sm font-medium ml-1">Product Name</label>
                    <div className="relative">
                       <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                       <input 
                         type="text" 
                         required
                         placeholder="e.g. Wireless Noise Cancelling Headphones"
                         className="w-full pl-12 pr-4 py-4 glass rounded-2xl border border-borderline focus:ring-2 focus:ring-primary/50 outline-none"
                         value={name}
                         onChange={(e) => setName(e.target.value)}
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-sm font-medium ml-1">Price (₦)</label>
                       <div className="relative">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                          <input 
                            type="number" 
                            required
                            placeholder="0.00"
                            className="w-full pl-12 pr-4 py-4 glass rounded-2xl border border-borderline focus:ring-2 focus:ring-primary/50 outline-none"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                          />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-medium ml-1">Category</label>
                       <div className="relative">
                          <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                          <select 
                             className="w-full pl-12 pr-4 py-4 glass rounded-2xl border border-borderline focus:ring-2 focus:ring-primary/50 outline-none appearance-none"
                             value={category}
                             onChange={(e) => setCategory(e.target.value)}
                          >
                             {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                       </div>
                    </div>
                 </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium ml-1">Description</label>
                    <textarea 
                      required
                      placeholder="Detailed product specifications, shipping info, and unique selling points..."
                      rows={4}
                      className="w-full p-4 glass rounded-2xl border border-borderline focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  {/* Wholesale Tiers UI */}
                  <div className="p-6 glass rounded-2xl border border-primary/10 space-y-4">
                     <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                           <TrendingUp size={16} className="text-primary" /> Wholesale Price Tiers
                        </h3>
                        <button 
                          type="button"
                          onClick={addTier}
                          className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm"
                        >
                           Add Tier
                        </button>
                     </div>
                     {tiers.length === 0 ? (
                       <p className="text-[10px] text-muted-foreground italic">No bulk discounts configured. Fixed price will apply to all quantities.</p>
                     ) : (
                       <div className="space-y-3">
                         {tiers.map((tier, idx) => (
                           <div key={idx} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                              <div className="flex-1 relative">
                                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">QTY+</span>
                                 <input 
                                   type="number" 
                                   placeholder="10"
                                   value={tier.minQty || ""}
                                   onChange={(e) => updateTier(idx, "minQty", e.target.value)}
                                   className="w-full pl-12 pr-3 py-2.5 glass rounded-xl border border-borderline text-xs outline-none focus:border-primary/50"
                                 />
                              </div>
                              <div className="flex-1 relative">
                                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">₦</span>
                                 <input 
                                   type="number" 
                                   placeholder="8000"
                                   value={tier.price || ""}
                                   onChange={(e) => updateTier(idx, "price", e.target.value)}
                                   className="w-full pl-8 pr-3 py-2.5 glass rounded-xl border border-borderline text-xs outline-none focus:border-primary/50 font-bold"
                                 />
                              </div>
                              <button 
                                type="button"
                                onClick={() => removeTier(idx)}
                                className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                              >
                                 <X size={14} />
                              </button>
                           </div>
                         ))}
                       </div>
                     )}
                  </div>
               </div>

              {/* Multi-Image Upload & Tips */}
              <div className="space-y-8">
                 <div className="space-y-2">
                    <label className="text-sm font-medium ml-1">Product Media (Up to 5 images)</label>
                    <div className="grid grid-cols-2 gap-4">
                       {imagePreviews.map((preview, index) => (
                         <div key={index} className="relative aspect-square rounded-2xl overflow-hidden group border border-borderline">
                            <img src={preview} className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                               <X size={14} />
                            </button>
                            {index === 0 && (
                              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-primary text-white text-[8px] font-black uppercase tracking-widest rounded-md">Main</div>
                            )}
                         </div>
                       ))}
                       
                       {imagePreviews.length < 5 && (
                         <label className="aspect-square rounded-2xl border-2 border-dashed border-borderline hover:border-primary/50 flex flex-col items-center justify-center p-4 cursor-pointer transition-all hover:bg-primary/5 group">
                            <ImageIcon size={24} className="text-muted-foreground group-hover:text-primary transition-colors mb-2" />
                            <p className="text-[10px] font-bold text-center">Add Node</p>
                            <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageChange} />
                         </label>
                       )}
                    </div>
                 </div>

                 <div className="p-6 glass rounded-2xl border border-primary/10">
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                       <AlertCircle size={16} className="text-primary" /> Listing Tips
                    </h3>
                    <ul className="text-xs text-muted-foreground space-y-2">
                       <li>• Use high-quality photos to attract purchasers.</li>
                       <li>• Mention Minimum Order Quantity (MOQ) for wholesale.</li>
                       <li>• Be transparent about shipping and availability.</li>
                    </ul>
                 </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-2 text-sm">
                 <AlertCircle size={18} />
                 <span>{error}</span>
              </div>
            )}

            <div className="pt-6">
               <button 
                 type="submit" 
                 disabled={loading}
                 className="w-full py-5 bg-primary text-white rounded-2xl font-extrabold text-lg flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-2xl shadow-primary/30 disabled:opacity-50"
               >
                 {loading ? (
                   <>
                     <Loader2 size={24} className="animate-spin" /> Publishing...
                   </>
                 ) : (
                   <>
                     Create Listing <Plus size={24} />
                   </>
                 )}
               </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
