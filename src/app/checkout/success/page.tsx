"use client";

import { useEffect, Suspense } from "react";
import { useCart } from "@/context/CartContext";
import { Link } from "lucide-react";
import { motion } from "framer-motion";
import { CheckCircle2, ShoppingBag, ArrowRight, Package, Home } from "lucide-react";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";

function SuccessContent() {
  const { cartItems, clearCart } = useCart();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  useEffect(() => {
    const handlePostPurchase = async () => {
      // Loop through cart items and decrement stock
      try {
        for (const item of cartItems) {
          const productRef = doc(db, "products", item.id);
          const productSnap = await getDoc(productRef);
          
          if (productSnap.exists()) {
            const currentStock = productSnap.data().stock;
            // Only decrement if stock management is enabled for the product
            if (currentStock !== undefined) {
              await updateDoc(productRef, {
                stock: increment(-item.quantity)
              });
            }
          }
        }
      } catch (error) {
        console.error("Error managing inventory:", error);
      } finally {
        // Clear the cart when the user reaches the success page
        clearCart();
      }
    };

    if (cartItems.length > 0) {
      handlePostPurchase();
    }
  }, [cartItems]);

  return (
    <div className="min-h-screen pt-32 pb-20 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <motion.div
           initial={{ scale: 0, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           transition={{ type: "spring", damping: 12, stiffness: 100 }}
           className="w-32 h-32 bg-emerald-500/20 text-emerald-500 rounded-[3rem] flex items-center justify-center mx-auto mb-10"
        >
           <CheckCircle2 size={64} />
        </motion.div>

        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-4xl md:text-5xl font-black mb-6 tracking-tight"
        >
           Order <span className="text-emerald-500">Confirmed!</span>
        </motion.h1>
        
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-lg text-muted-foreground mb-12 max-w-md mx-auto leading-relaxed"
        >
           Thank you for your business. Your transaction has been completed successfully. We've sent a detailed receipt to your email.
        </motion.p>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="glass p-8 rounded-[3rem] border border-emerald-500/10 mb-12 flex flex-col md:flex-row items-center justify-between gap-6"
        >
           <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Transaction Reference</p>
              <p className="font-mono font-bold text-lg text-primary">{ref || "BUYSELL-" + Date.now()}</p>
           </div>
           <div className="flex items-center gap-3 bg-emerald-500/10 text-emerald-600 px-6 py-3 rounded-2xl font-bold">
              <Package size={20} /> Processing Shipment
           </div>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
           <NextLink href="/dashboard" className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all">
              Go to Dashboard <ArrowRight size={20} />
           </NextLink>
           <NextLink href="/" className="w-full sm:w-auto px-8 py-4 glass border-borderline font-bold flex items-center justify-center gap-2 hover:bg-muted transition-all">
              <Home size={20} /> Back to Home
           </NextLink>
        </motion.div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <ShoppingBag className="animate-bounce" size={48} />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
