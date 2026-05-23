"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, addDoc, setDoc, Timestamp } from "firebase/firestore";
import { 
  ShoppingBag, 
  Star, 
  MapPin, 
  Mail, 
  Phone, 
  MessageSquare, 
  ChevronRight, 
  Package, 
  Search,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Globe,
  Loader2,
  Building2,
  Video
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const PayWithPaystack = dynamic(() => import('@/components/PaystackButton'), { ssr: false });

export default function StorefrontPage() {
  const { id: sellerId } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuth();
  const { addToCart } = useCart();
  
  const [seller, setSeller] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const fetchStoreData = async () => {
      if (!sellerId) return;
      setLoading(true);
      
      try {
        // 1. Fetch Seller Details
        const sellerRef = doc(db, "users", sellerId);
        const sellerSnap = await getDoc(sellerRef);
        
        if (sellerSnap.exists()) {
          setSeller(sellerSnap.data());
        }

        // 2. Fetch Seller Products
        const productsQ = query(
          collection(db, "products"), 
          where("sellerId", "==", sellerId)
        );
        const productsSnap = await getDocs(productsQ);
        const fetched = productsSnap.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          desc: doc.data().description || doc.data().desc
        })) as any[];
        
        setProducts(fetched);
      } catch (error: any) {
        if (error.code === 'permission-denied') {
          console.warn("Permission denied for storefront node. This is a Firestore rules configuration issue.");
          // Fallback to empty products if permission denied but seller exists
          if (!seller) setProducts([]);
        } else {
          console.error("Critical error fetching storefront:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStoreData();
  }, [sellerId]);

  const categories = ["All", ...new Set(products.map(p => p.category))];
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleMessageStart = async () => {
    if (!user) {
      alert("Please login to message the seller.");
      return;
    }
    try {
      // Check if a chat already exists
      const chatsQ = query(
        collection(db, "chats"),
        where("participants", "array-contains", user.uid)
      );
      const chatsSnap = await getDocs(chatsQ);
      let existingChatId = null;

      chatsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.participants.includes(sellerId)) {
          existingChatId = doc.id;
        }
      });

      if (existingChatId) {
        router.push(`/dashboard/messages?chatId=${existingChatId}`);
      } else {
        // Create new chat
        const newChatData = {
          participants: [user.uid, sellerId],
          participantNames: {
            [user.uid]: user.displayName || user.email || "Wholesaler",
            [sellerId]: seller.businessName || seller.name || "Seller",
          },
          lastMessage: "",
          lastMessageAt: Timestamp.now(),
          createdAt: Timestamp.now(),
        };
        const docRef = await addDoc(collection(db, "chats"), newChatData);
        router.push(`/dashboard/messages?chatId=${docRef.id}`);
      }
    } catch (error) {
      console.error("Error starting message:", error);
    }
  };

  const handleVideoCallStart = async () => {
    if (!user) {
      alert("Please login to start a video call.");
      return;
    }
    try {
      // Check if a chat already exists to use as the meeting room ID
      const chatsQ = query(
        collection(db, "chats"),
        where("participants", "array-contains", user.uid)
      );
      const chatsSnap = await getDocs(chatsQ);
      let existingChatId = null;

      chatsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.participants.includes(sellerId)) {
          existingChatId = doc.id;
        }
      });

      if (existingChatId) {
        router.push(`/dashboard/meeting/${existingChatId}`);
      } else {
        // Create new chat
        const newChatData = {
          participants: [user.uid, sellerId],
          participantNames: {
            [user.uid]: user.displayName || user.email || "Wholesaler",
            [sellerId]: seller.businessName || seller.name || "Seller",
          },
          lastMessage: "Virtual Meeting Started",
          lastMessageAt: Timestamp.now(),
          createdAt: Timestamp.now(),
        };
        const docRef = await addDoc(collection(db, "chats"), newChatData);
        router.push(`/dashboard/meeting/${docRef.id}`);
      }
    } catch (error) {
      console.error("Error starting video call:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 size={48} className="text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Establishing Seller Link...</p>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
        <ShieldCheck size={64} className="text-muted-foreground mb-4 opacity-20" />
        <h1 className="text-2xl font-black mb-2">Storefront Not Found</h1>
        <p className="text-muted-foreground mb-8">This wholesaler entry does not exist or has been decommissioned.</p>
        <Link href="/marketplace" className="px-8 py-3 bg-primary text-white rounded-2xl font-bold">Return to Market</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Dynamic Banner Header */}
      <div className="h-64 md:h-80 bg-gradient-to-br from-slate-900 via-primary/50 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-end pb-12 relative z-10">
           <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
              <div className="w-32 h-32 rounded-[2.5rem] bg-white dark:bg-slate-900 p-1 shadow-2xl ring-4 ring-primary/20 relative group">
                 <div className="w-full h-full rounded-[2.2rem] overflow-hidden bg-muted flex items-center justify-center transition-transform group-hover:scale-105 duration-500">
                    {seller.avatarUrl ? (
                      <img src={seller.avatarUrl} alt={seller.businessName} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 size={48} className="text-primary/30" />
                    )}
                 </div>
                 {seller.isVerified && (
                   <div className="absolute -top-2 -right-2 p-2 bg-emerald-500 text-white rounded-full shadow-lg ring-4 ring-white dark:ring-slate-800" title="Verified Wholesaler">
                      <CheckCircle2 size={16} />
                   </div>
                 )}
              </div>
              <div className="flex-1">
                 <div className="flex flex-col md:flex-row items-center md:items-center gap-3 mb-2">
                    <h1 className="text-4xl font-extrabold tracking-tight">{seller.businessName || seller.name || "Unnamed Wholesaler"}</h1>
                    <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20">Verified Partner</span>
                 </div>
                 <div className="flex flex-wrap justify-center md:justify-start gap-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium"><MapPin size={14} className="text-primary" /> {seller.address || "Digital Warehouse, NG"}</div>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium"><Star size={14} className="text-orange-500" /> 4.9 Rating (Verified)</div>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium"><Globe size={14} className="text-blue-500" /> Active Supply Chain</div>
                 </div>
              </div>
              <div className="flex gap-4 mb-4">
                 <button 
                   onClick={handleMessageStart}
                   className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-105 transition-all"
                 >
                    <MessageSquare size={18} /> Message
                 </button>
                 <button 
                   onClick={handleVideoCallStart}
                   className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 flex items-center gap-2 hover:scale-105 transition-all"
                 >
                    <Video size={18} /> Video Call
                 </button>
                 <button className="p-3 glass rounded-2xl hover:bg-muted transition-all"><Zap size={20} className="text-orange-500" /></button>
              </div>
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Store Sidebar Info */}
        <div className="lg:col-span-1 space-y-8">
           <div className="glass p-8 rounded-[2.5rem] border border-borderline">
              <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-6">About the Store</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-8 italic">"{seller.storeBio || "Specializing in high-quality wholesale goods with verified supply chains and priority delivery logic."}"</p>
              
              <div className="space-y-4 pt-6 border-t border-borderline">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-muted rounded-xl"><Mail size={14} className="text-muted-foreground" /></div>
                   <div className="overflow-hidden">
                      <p className="text-[10px] font-bold text-muted-foreground">CONTACT EMAIL</p>
                      <p className="text-sm truncate">{seller.email}</p>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-muted rounded-xl"><Phone size={14} className="text-muted-foreground" /></div>
                   <div>
                      <p className="text-[10px] font-bold text-muted-foreground">PHONE LINE</p>
                      <p className="text-sm">{seller.phone || "Verified Private"}</p>
                   </div>
                </div>
              </div>
           </div>

           <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white overflow-hidden relative group">
              <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                 <h3 className="text-lg font-black mb-1">Supply Node Stats</h3>
                 <p className="text-[10px] text-white/50 mb-6 font-bold uppercase tracking-tighter">Verified Performance Hub</p>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                       <span className="opacity-70">Orders Fulfilled:</span>
                       <span className="font-black text-emerald-400">124+ Hub Units</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                       <span className="opacity-70">Verified Assets:</span>
                       <span className="font-black text-primary">{products.length} Node Items</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                       <span className="opacity-70">Response Node:</span>
                       <span className="font-black text-orange-400">~2 Hour Signal</span>
                    </div>
                    <div className="pt-4 border-t border-white/10 mt-4">
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Node Active & Verified</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Product Catalog Area */}
        <div className="lg:col-span-3 space-y-10">
           <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
              <div className="flex-1 max-w-lg relative group w-full">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                 <input 
                   type="text" 
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                   placeholder="Search this wholesaler's stock..."
                   className="w-full pl-12 pr-4 py-4 glass rounded-2xl border border-borderline outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                 />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide max-w-md">
                 {categories.map(cat => (
                   <button 
                     key={cat}
                     onClick={() => setActiveCategory(cat)}
                     className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                       activeCategory === cat ? 'bg-primary text-white border-primary shadow-lg' : 'glass border-borderline hover:border-primary/50'
                     }`}
                   >
                     {cat}
                   </button>
                 ))}
              </div>
           </div>

           {filteredProducts.length === 0 ? (
             <div className="py-20 text-center glass rounded-[3rem] border border-borderline border-dashed">
                <Package size={48} className="mx-auto text-muted-foreground opacity-20 mb-4" />
                <p className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">No matches found in this wholesaler's node</p>
             </div>
           ) : (
             <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-4">
               {filteredProducts.map((p, i) => (
                 <motion.div 
                   key={p.id}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: i * 0.05 }}
                   className="solid-card rounded-xl sm:rounded-2xl overflow-hidden border border-borderline/50 hover:shadow-2xl hover:shadow-primary/5 transition-all group flex flex-col min-w-0"
                 >
                    <div className="aspect-[4/3] bg-muted/30 overflow-hidden relative">
                       <Link href={`/marketplace/${p.id}`} className="absolute inset-0 z-10" />
                       <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                       <div className="absolute top-2 right-2 p-1.5 bg-white/50 backdrop-blur-md rounded-full text-foreground z-20"><Zap size={10} className="text-orange-500" /></div>
                    </div>
                    <div className="p-2.5 sm:p-3 flex-1 flex flex-col min-w-0">
                       <span className="text-[6px] sm:text-[8px] font-black uppercase tracking-widest text-primary mb-1 truncate">{p.category}</span>
                       <h4 className="text-[10px] sm:text-sm font-black mb-1 line-clamp-1 tracking-tight leading-tight">{p.name}</h4>
                       
                       <div className="mt-auto flex flex-col gap-1.5 pt-1.5 sm:pt-2 border-t border-borderline/30">
                          <div className="flex flex-row justify-between items-center min-w-0">
                             <div>
                                <p className="text-[6px] sm:text-[8px] font-black text-muted-foreground uppercase tracking-tighter">Wholesale</p>
                                <p className="text-[10px] sm:text-base font-black tracking-tighter truncate">₦{p.price.toLocaleString()}</p>
                             </div>
                             <button 
                               onClick={() => addToCart(p)}
                               className="p-1.5 sm:p-2 bg-primary/5 text-primary border border-primary/20 rounded-lg sm:rounded-xl hover:bg-primary hover:text-white transition-all"
                             >
                               <ShoppingBag size={12} className="sm:hidden" />
                               <ShoppingBag size={16} className="hidden sm:block" />
                             </button>
                          </div>
                          <div className="flex-1 min-w-0 relative group/pay shadow-xl shadow-primary/10 rounded-lg overflow-hidden [&_button]:text-[7px] sm:[&_button]:text-xs [&_button]:py-1 sm:[&_button]:py-1.5 [&_button]:px-0 [&_button_svg]:w-3 [&_button_svg]:h-3 sm:[&_button_svg]:w-4 sm:[&_button_svg]:h-4">
                             <PayWithPaystack product={p} user={user} />
                          </div>
                       </div>
                    </div>
                 </motion.div>
               ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
