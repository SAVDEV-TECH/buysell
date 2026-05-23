"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, updateDoc, doc, Timestamp } from "firebase/firestore";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MessageSquare, 
  DollarSign, 
  Loader2,
  ChevronRight,
  ArrowRight,
  User,
  Package
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface RFQ {
  id: string;
  wholesalerId: string;
  wholesalerName: string;
  manufacturerId: string;
  manufacturerName: string;
  productId: string;
  productName: string;
  quantity: number;
  status: "pending" | "quoted" | "accepted" | "rejected" | "cancelled";
  notes: string;
  offeredPrice?: number;
  createdAt: any;
  updatedAt: any;
}

export default function RFQManagementPage() {
  const { user, role } = useAuth();
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRFQ, setSelectedRFQ] = useState<RFQ | null>(null);
  const [quotePrice, setQuotePrice] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchRFQs = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const fieldToQuery = (role === "MANUFACTURER") ? "manufacturerId" : "wholesalerId";
        const q = query(
          collection(db, "rfqs"), 
          where(fieldToQuery, "==", user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const fetched = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as RFQ[];
        
        fetched.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setRfqs(fetched);
      } catch (error) {
        console.error("Error fetching RFQs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRFQs();
  }, [user, role]);

  const handleUpdateStatus = async (rfqId: string, status: RFQ["status"], extraData = {}) => {
    setUpdating(true);
    try {
      const rfqRef = doc(db, "rfqs", rfqId);
      await updateDoc(rfqRef, { 
        status, 
        updatedAt: Timestamp.now(),
        ...extraData 
      });
      
      setRfqs(prev => prev.map(r => r.id === rfqId ? { ...r, status, ...extraData } : r));
      setSelectedRFQ(null);
    } catch (error) {
      console.error("Error updating RFQ:", error);
      alert("Failed to update request.");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: RFQ["status"]) => {
    switch(status) {
      case "pending": return <span className="bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-500/20">Pending Inquiry</span>;
      case "quoted": return <span className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">Quote Offered</span>;
      case "accepted": return <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/20">Accepted</span>;
      case "rejected": return <span className="bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-500/20">Rejected</span>;
      default: return <span className="bg-slate-500/10 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-500/20">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 size={48} className="text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs italic">Syncing B2B Negotiations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tighter">B2B Negotiations</h1>
        <p className="text-muted-foreground">{role === "MANUFACTURER" ? "Manage custom quotes and bulk inquiries from wholesalers" : "Track your custom pricing requests"}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* RFQ List */}
        <div className="lg:col-span-2 space-y-4">
          {rfqs.length > 0 ? rfqs.map((rfq) => (
            <motion.div 
              key={rfq.id}
              layoutId={rfq.id}
              onClick={() => setSelectedRFQ(rfq)}
              className={`p-6 rounded-[2rem] border transition-all cursor-pointer group ${selectedRFQ?.id === rfq.id ? 'bg-primary/5 border-primary shadow-xl shadow-primary/10' : 'glass border-borderline hover:border-primary/30'}`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${selectedRFQ?.id === rfq.id ? 'bg-primary text-white border-primary' : 'bg-muted/50 border-borderline'}`}>
                    <FileText size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                       <span className="text-xs font-black uppercase tracking-widest text-primary">RFQ-{rfq.id.slice(0, 5).toUpperCase()}</span>
                       {getStatusBadge(rfq.status)}
                    </div>
                    <h3 className="font-bold text-lg mb-1">{rfq.productName}</h3>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Package size={14} /> {rfq.quantity.toLocaleString()} units</span>
                      <span className="flex items-center gap-1"><User size={14} /> {role === "MANUFACTURER" ? rfq.wholesalerName : rfq.manufacturerName}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  {rfq.offeredPrice ? (
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground mb-0.5">Offered Price</p>
                      <p className="text-xl font-black text-primary">₦{rfq.offeredPrice.toLocaleString()}</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground italic text-sm">
                      <Clock size={16} /> Pending Review
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="glass p-20 text-center rounded-[3rem] border border-dashed border-borderline">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground/30">
                 <MessageSquare size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">No Negotiations Found</h3>
              <p className="text-muted-foreground">Your RFQ ledger is currently empty.</p>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedRFQ ? (
              <motion.div 
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="glass rounded-[2.5rem] border border-borderline p-8 sticky top-24 shadow-2xl"
              >
                <div className="flex justify-between items-start mb-8">
                  <h2 className="text-2xl font-black tracking-tighter">Inquiry Details</h2>
                  <button onClick={() => setSelectedRFQ(null)} className="p-2 hover:bg-muted rounded-full">
                    <ArrowRight size={20} />
                  </button>
                </div>

                <div className="space-y-6 mb-8">
                  <div className="p-4 bg-muted/20 rounded-2xl border border-borderline">
                     <p className="text-[10px] font-black uppercase text-muted-foreground mb-2 italic">Wholesaler Requirements</p>
                     <p className="text-sm leading-relaxed">"{selectedRFQ.notes}"</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-borderline">
                       <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Volume</p>
                       <p className="font-bold">{selectedRFQ.quantity.toLocaleString()} pcs</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-borderline">
                       <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Status</p>
                       <p className="font-bold capitalize">{selectedRFQ.status}</p>
                    </div>
                  </div>
                </div>

                {role === "MANUFACTURER" && selectedRFQ.status === "pending" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest ml-1">Proposed Unit Price (₦)</label>
                      <div className="relative">
                        <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                        <input 
                          type="number"
                          value={quotePrice}
                          onChange={(e) => setQuotePrice(e.target.value)}
                          placeholder="Enter your best offer..."
                          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-950 border-2 border-primary/20 rounded-2xl focus:border-primary outline-none transition-all font-black"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                       <button 
                         onClick={() => handleUpdateStatus(selectedRFQ.id, "quoted", { offeredPrice: Number(quotePrice) })}
                         disabled={!quotePrice || updating}
                         className="flex-1 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                       >
                         {updating ? <Loader2 className="animate-spin" /> : "Submit Offer"}
                       </button>
                       <button 
                         onClick={() => handleUpdateStatus(selectedRFQ.id, "rejected")}
                         className="p-4 border border-red-500/20 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                       >
                         <XCircle size={20} />
                       </button>
                    </div>
                  </div>
                )}

                {role === "WHOLESALER" && selectedRFQ.status === "quoted" && (
                  <div className="space-y-4">
                     <div className="p-6 bg-primary/10 rounded-3xl border border-primary/20 text-center mb-6">
                        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2 italic">Manufacturer's Offer</p>
                        <p className="text-4xl font-black text-primary tracking-tighter">₦{selectedRFQ.offeredPrice?.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground mt-2 italic">Unit Price</p>
                     </div>
                     <div className="flex gap-3">
                       <button 
                         onClick={() => handleUpdateStatus(selectedRFQ.id, "accepted")}
                         className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-black shadow-xl shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                       >
                         Accept Quote
                       </button>
                       <button 
                         onClick={() => handleUpdateStatus(selectedRFQ.id, "cancelled")}
                         className="p-4 border border-red-500/20 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                       >
                         <XCircle size={20} />
                       </button>
                    </div>
                  </div>
                )}

                {selectedRFQ.status === "accepted" && (
                   <div className="p-6 bg-green-500/10 rounded-3xl border border-green-500/20 text-center">
                      <CheckCircle2 size={32} className="text-green-500 mx-auto mb-3" />
                      <h3 className="font-bold text-green-600">Negotiation Successful</h3>
                      <p className="text-xs text-muted-foreground mt-2">This quote has been locked in. You can now proceed to fulfillment.</p>
                      {role === "WHOLESALER" && (
                        <button className="w-full mt-6 py-4 bg-black text-white rounded-2xl font-bold hover:scale-105 transition-all">
                           Generate Purchase Order
                        </button>
                      )}
                   </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-[400px] flex flex-col items-center justify-center text-center p-8 glass rounded-[2.5rem] border border-dashed border-borderline"
              >
                <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mb-4 text-muted-foreground/50">
                  <ChevronRight size={32} />
                </div>
                <p className="text-sm text-muted-foreground font-bold italic tracking-wider">Select a negotiation node to view details and take action.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
