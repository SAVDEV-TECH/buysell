"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  Timestamp,
  orderBy
} from "firebase/firestore";
import { 
  Ticket, 
  Plus, 
  X, 
  Trash2, 
  Percent, 
  Calendar, 
  MousePointer2, 
  Zap, 
  CheckCircle2, 
  ShieldAlert,
  Loader2,
  Copy,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PromotionsPage() {
  const { user, role } = useAuth();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ 
    code: "", 
    discount: 10, 
    type: "percentage", 
    minSpend: 0, 
    expiry: "" 
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchPromos = async () => {
      if (!user || !role) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, "coupons"), 
          where("sellerId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        setCoupons(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching promos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPromos();
  }, [user, role]);

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const code = newCoupon.code.toUpperCase().replace(/\s+/g, '');
      await addDoc(collection(db, "coupons"), {
        ...newCoupon,
        code,
        sellerId: user.uid,
        createdAt: Timestamp.now(),
        isActive: true
      });
      setCoupons(prev => [{ id: "temp", ...newCoupon, code, createdAt: Timestamp.now(), isActive: true }, ...prev]);
      setShowAddModal(false);
    } catch (error) {
      console.error("Error adding coupon:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      await deleteDoc(doc(db, "coupons", id));
      setCoupons(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error("Error deleting coupon:", error);
    }
  };

  if (role !== "MANUFACTURER" && role !== "WHOLESALER" && role !== "ADMIN") {
     return (
       <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-slate-900 text-white rounded-[3rem]">
          <ShieldAlert size={64} className="text-red-500 mb-6 drop-shadow-2xl" />
          <h1 className="text-3xl font-black mb-4">WHOLESALER PROTOCOL REQUIRED</h1>
          <p className="text-slate-400 font-medium max-w-sm mb-8">Access to promotional code generating systems is restricted to verified seller terminal nodes.</p>
          <button onClick={() => window.history.back()} className="px-8 py-3 bg-white text-black rounded-2xl font-black hover:scale-105 active:scale-95 transition-all">Previous Node</button>
       </div>
     );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
         <div>
            <h1 className="text-3xl font-black flex items-center gap-3 uppercase">
               Promotions <span className="text-primary">& Coupons</span>
            </h1>
            <p className="text-muted-foreground font-medium">Engineer specialized discount nodes for your high-value clients.</p>
         </div>
         <button 
           onClick={() => setShowAddModal(true)}
           className="px-8 py-4 bg-primary text-white rounded-[2rem] font-black flex items-center gap-3 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
         >
           <Plus size={20} /> Generate Discount Node
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         {/* Active Coupons Matrix */}
         <div className="lg:col-span-2 space-y-6">
            <div className="glass p-10 rounded-[3.5rem] border border-borderline min-h-[500px] relative overflow-hidden">
               <div className="absolute top-0 right-0 p-10 opacity-[0.03] rotate-12">
                  <Ticket size={240} />
               </div>
               
               <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-10 flex items-center gap-2">
                     <Zap size={20} className="text-primary fill-primary" /> Active Discount Matrix
                  </h3>
                  
                  {loading ? (
                    <div className="py-20 flex flex-col items-center">
                       <Loader2 className="animate-spin text-primary mb-4" size={40} />
                       <p className="text-muted-foreground font-medium italic">Scanning active nodes...</p>
                    </div>
                  ) : coupons.length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground italic font-medium opacity-50">No promotional nodes active on this seller ID.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {coupons.map((coupon, i) => (
                         <motion.div 
                           key={coupon.id}
                           initial={{ opacity: 0, y: 20 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: i * 0.1 }}
                           className="p-6 rounded-[2.5rem] bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10 relative group overflow-hidden"
                         >
                            <div className="absolute -top-4 -right-4 w-12 h-12 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/30 transition-all duration-500" />
                            
                            <div className="flex justify-between items-start mb-6">
                               <div className="px-4 py-1.5 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
                                  <Percent size={14} /> {coupon.discount}{coupon.type === 'percentage' ? '%' : ' OFF'}
                               </div>
                               <button onClick={() => deleteCoupon(coupon.id)} className="p-2 bg-white/50 dark:bg-slate-900/50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                  <Trash2 size={16} />
                                </button>
                            </div>
                            
                            <h4 className="text-2xl font-black mb-1 group-hover:text-primary transition-colors tracking-tight uppercase">{coupon.code}</h4>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-6 opacity-60 flex items-center gap-1">
                               <Calendar size={12} /> Exp: {coupon.expiry || "NEVER"}
                            </p>

                            <div className="pt-4 border-t border-borderline/30 flex items-center justify-between">
                               <div className="flex flex-col">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Usage Protocol</span>
                                  <span className="text-xs font-bold text-emerald-500">ACTIVE-NODE-77</span>
                               </div>
                               <button className="p-2 glass border-primary/20 rounded-lg hover:bg-primary/10 transition-all">
                                  <Copy size={14} className="text-primary" />
                               </button>
                            </div>
                         </motion.div>
                       ))}
                    </div>
                  )}
               </div>
            </div>
         </div>

         {/* Insights & Metrics Side */}
         <div className="lg:col-span-1 space-y-6">
            <div className="glass p-8 rounded-[3rem] border border-borderline h-full flex flex-col justify-between">
               <div>
                  <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                     <MousePointer2 className="text-primary" size={20} /> Promo Intelligence
                  </h3>
                  <div className="space-y-6">
                     <div className="p-6 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 border border-borderline hover:scale-[1.02] transition-all cursor-pointer group">
                        <div className="flex items-center gap-4 mb-4">
                           <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><ChevronRight size={18}/></div>
                           <p className="text-xs font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">Avg. Conversion Increase</p>
                        </div>
                        <h4 className="text-4xl font-black">+24%</h4>
                     </div>
                     <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-20 rotate-12">
                           <Zap size={80} />
                        </div>
                        <h4 className="text-lg font-black mb-4 relative z-10">Best Practice Matrix</h4>
                        <p className="text-white/60 text-xs leading-relaxed font-bold uppercase tracking-widest relative z-10">
                           Short Codes (4-6 CHARS) <br/>
                           limited Availability ( &lt; 72H ) <br/>
                           Specific Category ( FOCUS )
                        </p>
                     </div>
                  </div>
               </div>

               <div className="mt-10 p-6 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                     <CheckCircle2 size={16} /> Systems Nominal
                  </p>
               </div>
            </div>
         </div>
      </div>

      {/* ADD PROMO MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowAddModal(false)}
               className="absolute inset-0 bg-black/60 backdrop-blur-md"
             />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="glass w-full max-w-lg p-10 rounded-[4rem] border border-borderline relative z-10"
             >
                <div className="flex justify-between items-center mb-10">
                   <h3 className="text-3xl font-black">Generate Node</h3>
                   <button onClick={() => setShowAddModal(false)} className="p-3 hover:bg-muted rounded-2xl transition-all"><X size={24}/></button>
                </div>

                <form onSubmit={handleAddCoupon} className="space-y-8">
                   <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Discount Code</label>
                         <input 
                           required
                           value={newCoupon.code}
                           onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                           placeholder="E.G. FLASH50"
                           className="w-full px-6 py-4 rounded-3xl glass border border-borderline focus:border-primary outline-none font-black text-xl tracking-tighter"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Disc. Type</label>
                         <select 
                           value={newCoupon.type}
                           onChange={(e) => setNewCoupon({...newCoupon, type: e.target.value})}
                           className="w-full h-[62px] px-6 py-4 rounded-3xl glass border border-borderline focus:border-primary outline-none font-black text-sm uppercase tracking-widest"
                         >
                            <option value="percentage">Percentage (%)</option>
                            <option value="fixed">Fixed (₦)</option>
                         </select>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Discount Value</label>
                         <input 
                           required
                           type="number"
                           value={newCoupon.discount}
                           onChange={(e) => setNewCoupon({...newCoupon, discount: Number(e.target.value)})}
                           className="w-full px-6 py-4 rounded-3xl glass border border-borderline focus:border-primary outline-none font-black text-xl"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Expiry Date</label>
                         <input 
                           type="date"
                           value={newCoupon.expiry}
                           onChange={(e) => setNewCoupon({...newCoupon, expiry: e.target.value})}
                           className="w-full h-[62px] px-6 py-4 rounded-3xl glass border border-borderline focus:border-primary outline-none font-black text-sm uppercase tracking-widest"
                         />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Minimum Spend (₦)</label>
                      <input 
                        type="number"
                        value={newCoupon.minSpend}
                        onChange={(e) => setNewCoupon({...newCoupon, minSpend: Number(e.target.value)})}
                        className="w-full px-6 py-4 rounded-3xl glass border border-borderline focus:border-primary outline-none font-black text-xl"
                        placeholder="0"
                      />
                   </div>

                   <button disabled={submitting} type="submit" className="w-full py-6 bg-primary text-white rounded-[2.5rem] font-black text-xl hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-primary/20 flex items-center justify-center gap-3">
                      {submitting ? <Loader2 className="animate-spin" /> : <><Zap size={24} fill="currentColor" /> Initialize Protocol</>}
                   </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
