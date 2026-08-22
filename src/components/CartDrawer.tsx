"use client";

import { useCart } from "@/context/CartContext";
import { X, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Image from "next/image";
import { DualPriceTag } from "@/components/DualPriceTag";

const PaystackButton = dynamic(() => import('@/components/PaystackButton'), { ssr: false });

export default function CartDrawer() {
  const { isCartOpen, setIsCartOpen, cartItems, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();
  const { user } = useAuth();

  const mockProductForPaystack = {
    id: "cart-total",
    name: "Cart Total",
    price: cartTotal,
    category: "Multiple Items",
    desc: "Payment for your cart items",
    rating: 5,
    reviews: 0,
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-card shadow-2xl z-[60] flex flex-col border-l border-border"
          >
            {/* Header */}
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingBag className="text-primary" />
                <h2 className="text-xl font-bold">Purchase Order</h2>
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-bold">
                  {cartItems.length}
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                  <ShoppingBag size={64} className="mb-4" />
                  <p>Your Purchase Order is empty</p>
                </div>
              ) : (
                cartItems.map((item) => (
                   <div key={item.id} className="flex gap-4 border-b border-border/50 pb-6 last:border-0">
                    <div className="w-20 h-20 rounded-xl bg-muted overflow-hidden flex-shrink-0 relative">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.name} fill sizes="80px" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          {item.image || <ShoppingBag size={24} className="text-muted-foreground opacity-20" />}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold line-clamp-1">{item.name}</h3>
                          <div className="mt-0.5">
                            <DualPriceTag amountInUsd={item.price} size="xs" layout="stacked" />
                          </div>
                          {item.moq && item.quantity < item.moq && (
                            <p className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-tighter animate-pulse">
                              Requires min. {item.moq} units
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                        >
                          -
                        </button>
                        <span className="font-bold w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {cartItems.length > 0 && (
              <div className="p-6 border-t border-border bg-muted/30">
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-muted-foreground items-baseline">
                    <span>Subtotal</span>
                    <DualPriceTag amountInUsd={cartTotal} size="xs" layout="inline" />
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span>Calculated upon PO submission</span>
                  </div>
                  <div className="flex justify-between items-baseline font-black text-lg pt-4 border-t border-border/50">
                    <span>Estimated Total</span>
                    <DualPriceTag amountInUsd={cartTotal} size="lg" layout="stacked" showTooltip />
                  </div>
                </div>

                <div className="space-y-3">
                  <Link 
                    href={cartItems.some(item => item.moq && item.quantity < item.moq) ? "#" : "/checkout"} 
                    onClick={(e) => {
                      if (cartItems.some(item => item.moq && item.quantity < item.moq)) {
                        e.preventDefault();
                      } else {
                        setIsCartOpen(false);
                      }
                    }}
                    className={`w-full py-4 rounded-2xl font-black text-lg transition-all shadow-xl flex items-center justify-center gap-2 ${
                      cartItems.some(item => item.moq && item.quantity < item.moq)
                        ? "bg-muted text-muted-foreground cursor-not-allowed grayscale"
                        : "bg-primary text-primary-foreground hover:opacity-90 hover:scale-105 active:scale-95 shadow-primary/20"
                    }`}
                  >
                    Submit Purchase Order <ArrowRight size={20} />
                  </Link>
                  
                  <button 
                    onClick={clearCart}
                    className="w-full py-3 text-destructive font-medium hover:bg-destructive/10 rounded-xl transition-colors"
                  >
                    Clear Order
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
