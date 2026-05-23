"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { X, Send, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RFQModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: {
    id: string;
    name: string;
    price: number;
    moq?: number;
  };
  manufacturer: {
    id: string;
    name: string;
  };
}

export default function RFQModal({ isOpen, onClose, product, manufacturer }: RFQModalProps) {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const [quantity, setQuantity] = useState(product?.moq || 100);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const rfqData = {
        wholesalerId: user.uid,
        wholesalerName: user.displayName || "Verified Wholesaler",
        manufacturerId: manufacturer.id,
        manufacturerName: manufacturer.name,
        productId: product?.id || "general",
        productName: product?.name || "General Inquiry",
        quantity: Number(quantity),
        status: "pending",
        notes,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(collection(db, "rfqs"), rfqData);

      // Notify Manufacturer
      await sendNotification(
        manufacturer.id,
        "New RFQ Received",
        `${user.displayName || "A wholesaler"} requested a quote for ${quantity} units of ${product?.name || "general services"}.`,
        "SYSTEM",
        "/dashboard/rfqs"
      );

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setNotes("");
      }, 2000);
    } catch (error) {
      console.error("Error submitting RFQ:", error);
      alert("Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-white/20"
          >
            {success ? (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 size={48} />
                </div>
                <h2 className="text-2xl font-black mb-2">Request Transmitted</h2>
                <p className="text-muted-foreground">Your RFQ has been sent to {manufacturer.name}. You will be notified when they respond.</p>
              </div>
            ) : (
              <>
                <div className="p-8 border-b border-borderline flex items-center justify-between bg-primary/5">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tighter text-primary">Request for Quotation</h2>
                    <p className="text-xs text-muted-foreground font-bold">Inquiry for {manufacturer.name}</p>
                  </div>
                  <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                  {product && (
                    <div className="p-4 bg-muted/30 rounded-2xl border border-borderline flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-primary font-bold shadow-sm">
                        {product.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Target Product</p>
                        <p className="font-bold text-sm">{product.name}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-bold ml-1">Required Quantity</label>
                    <input 
                      type="number" 
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full px-6 py-4 bg-white dark:bg-slate-950 border border-borderline rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                      placeholder="e.g. 5000"
                    />
                    {product?.moq && (
                      <p className="text-[10px] text-muted-foreground ml-1">Manufacturer's Minimum: {product.moq} units</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold ml-1">Specifications & Notes</label>
                    <textarea 
                      required
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      className="w-full px-6 py-4 bg-white dark:bg-slate-950 border border-borderline rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
                      placeholder="Specify colors, branding, lead time requirements, or other custom details..."
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-4 border border-borderline rounded-2xl font-bold hover:bg-muted transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-4 bg-primary text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" size={20} /> : <><Send size={20} /> Submit RFQ</>}
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
