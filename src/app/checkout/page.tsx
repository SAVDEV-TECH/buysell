"use client";

import { useState, useRef } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { createClient } from "@/lib/supabase/client";
import { 
  ArrowLeft, 
  CreditCard, 
  MapPin, 
  User, 
  ShieldCheck,
  ShoppingBag,
  ArrowRight,
  Loader2,
  Phone,
  Mail,
  Building2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";

const PaystackButton = dynamic(() => import('@/components/PaystackButton'), { ssr: false });
const FlutterwaveButton = dynamic(() => import('@/components/FlutterwaveButton'), { ssr: false });
const MobileMoneyButton = dynamic(() => import('@/components/MobileMoneyButton'), { ssr: false });

export default function CheckoutPage() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user, profile, organizationId } = useAuth();
  const { sendNotification } = useNotifications();
  const router = useRouter();

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "flutterwave" | "mobile-money">("paystack");
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");

  const [formData, setFormData] = useState({
    fullName: profile?.full_name || "",
    email: user?.email || "",
    phone: "",
    address: "",
    city: "",
    country: "Nigeria",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const finalTotal = cartTotal;

  // ─── Payment Success Callback — Creates Order in PostgreSQL & Triggers Realtime Notifications ───
  const handlePaymentSuccess = async (reference: string) => {
    if (!user) return;
    setIsProcessingOrder(true);
    setOrderError("");

    try {
      // 1. Determine supplier organization ID from cart items if available
      const supplierOrgId =
        cartItems.find((item) => item.sellerId || item.manufacturerId)?.sellerId || null;

      // 2. Insert order into PostgreSQL orders table with fallbacks
      let createdOrderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
      let dbOrderInserted = false;

      // Attempt 1: Insert with buyer_id and buyer_organization_id
      try {
        const { data: oData, error: err1 } = await supabase
          .from("orders")
          .insert({
            buyer_id: user.id,
            buyer_organization_id: organizationId || null,
            supplier_organization_id: supplierOrgId,
            total_amount: finalTotal,
            currency: "USD",
            status: "processing",
            payment_status: "paid",
            payment_reference: reference,
            payment_method: paymentMethod,
            shipping_address: formData,
          })
          .select("id")
          .maybeSingle();

        if (oData?.id) {
          createdOrderId = oData.id;
          dbOrderInserted = true;
        } else if (err1) {
          console.warn("[Checkout] Insert attempt 1 notice:", err1.message);
        }
      } catch (e) {
        console.warn("[Checkout] Insert attempt 1 exception:", e);
      }

      // Attempt 2 fallback if attempt 1 failed
      if (!dbOrderInserted) {
        try {
          const { data: oData, error: err2 } = await supabase
            .from("orders")
            .insert({
              buyer_organization_id: organizationId || user.id,
              supplier_organization_id: supplierOrgId,
              total_amount: finalTotal,
              currency: "USD",
              status: "processing",
              payment_status: "paid",
              payment_reference: reference,
              payment_method: paymentMethod,
              shipping_address: formData,
            })
            .select("id")
            .maybeSingle();

          if (oData?.id) {
            createdOrderId = oData.id;
            dbOrderInserted = true;
          } else if (err2) {
            console.warn("[Checkout] Insert attempt 2 notice:", err2.message);
          }
        } catch (e) {
          console.warn("[Checkout] Insert attempt 2 exception:", e);
        }
      }

      // 3. Create rich local order object & persist to localStorage as reliable backup
      const newOrderObject = {
        id: createdOrderId,
        created_at: new Date().toISOString(),
        buyer_id: user.id,
        buyer_organization_id: organizationId || user.id,
        supplier_organization_id: supplierOrgId,
        total_amount: finalTotal,
        currency: "USD",
        status: "processing",
        payment_status: "paid",
        payment_reference: reference,
        payment_method: paymentMethod,
        shipping_address: formData,
        cart_items: cartItems,
      };

      try {
        const localKey = `buysell_user_orders_${user.id}`;
        const existing = JSON.parse(localStorage.getItem(localKey) || "[]");
        const updated = [newOrderObject, ...existing.filter((o: any) => o.id !== createdOrderId)];
        localStorage.setItem(localKey, JSON.stringify(updated));
      } catch (localErr) {
        console.warn("[Checkout] LocalStorage backup notice:", localErr);
      }

      // 4. Insert order items into order_items table (if DB order created)
      if (dbOrderInserted && createdOrderId && cartItems.length > 0) {
        try {
          const itemsPayload = cartItems.map((item) => ({
            order_id: createdOrderId,
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.price * item.quantity,
          }));
          await supabase.from("order_items").insert(itemsPayload);
        } catch (itemsErr) {
          console.warn("[Checkout] Could not insert order_items (table optional):", itemsErr);
        }
      }

      // 4. Trigger Real-Time Notification for Buyer
      await sendNotification(
        user.id,
        `🛒 Order #${createdOrderId.slice(0, 8).toUpperCase()} Placed!`,
        `Your wholesale payment of $${finalTotal.toLocaleString()} was confirmed. Status: Processing.`,
        "ORDER",
        `/dashboard/orders`
      );

      // 5. Clear cart state & localStorage
      clearCart();

      // 6. Redirect to confirmation screen
      router.push(`/checkout/success?order_id=${createdOrderId}&ref=${reference}`);
    } catch (err: any) {
      console.error("[Checkout] Order processing error:", err);
      setOrderError(err.message || "Failed to finalize order in database.");
      setIsProcessingOrder(false);
    }
  };

  if (cartItems.length === 0 && !isProcessingOrder) {
    return (
      <div className="min-h-screen pt-32 pb-20 px-4 text-center">
         <div className="glass max-w-md mx-auto p-12 rounded-[3rem] border border-borderline">
            <ShoppingBag size={64} className="mx-auto mb-6 text-muted-foreground opacity-20" />
            <h2 className="text-2xl font-black mb-2">Cart is empty</h2>
            <p className="text-muted-foreground mb-8">You haven't added anything to your cart yet.</p>
            <Link href="/marketplace" className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all">
               <ArrowLeft size={20} /> Browse Marketplace
            </Link>
         </div>
      </div>
    );
  }

  const checkoutProduct = {
    id: "cart-checkout-" + Date.now(),
    name: `BuySell Order (${cartItems.length} items)`,
    price: finalTotal,
    category: "Wholesale Order",
    desc: `Payment for ${cartItems.map(i => `${i.name} (${i.quantity}x)`).join(", ")}`,
    rating: 5,
    reviews: 0,
  };

  return (
    <div className="min-h-screen pt-24 pb-20 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 md:px-8">

        {/* Header Stepper */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
           <div>
              <h1 className="text-4xl font-black mb-2 tracking-tight">Finalize <span className="gradient-text">Checkout</span></h1>
              <p className="text-muted-foreground font-medium flex items-center gap-2">
                 Secure B2B Transaction & Escrow Protection <ShieldCheck size={16} className="text-primary" />
              </p>
           </div>
           
           <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-borderline shadow-sm">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center gap-2 px-4 py-2">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                      {s}
                   </div>
                   <span className={`text-sm font-bold ${step >= s ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {s === 1 ? "Details" : "Payment"}
                   </span>
                   {s === 1 && <ArrowRight size={16} className="text-muted-foreground" />}
                </div>
              ))}
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Form Left Column */}
          <div className="lg:col-span-7 space-y-8">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="glass p-8 md:p-12 rounded-[3.5rem] border border-borderline/50 space-y-8"
                >
                  <div>
                     <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                        <User className="text-primary" /> Contact Information
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                           <div className="relative">
                             <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                             <input 
                               name="fullName"
                               value={formData.fullName}
                               onChange={handleInputChange}
                               className="w-full pl-12 pr-4 py-4 rounded-2xl glass border border-borderline focus:border-primary/50 outline-none transition-all"
                               placeholder="Business or Buyer Name"
                             />
                           </div>
                        </div>

                        <div className="space-y-2">
                           <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Work Email</label>
                           <div className="relative">
                             <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                             <input 
                               name="email"
                               type="email"
                               value={formData.email}
                               onChange={handleInputChange}
                               className="w-full pl-12 pr-4 py-4 rounded-2xl glass border border-borderline focus:border-primary/50 outline-none transition-all"
                               placeholder="buyer@company.com"
                             />
                           </div>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                           <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</label>
                           <div className="relative">
                             <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                             <input 
                               name="phone"
                               value={formData.phone}
                               onChange={handleInputChange}
                               className="w-full pl-12 pr-4 py-4 rounded-2xl glass border border-borderline focus:border-primary/50 outline-none transition-all"
                               placeholder="+234 800 000 0000"
                             />
                           </div>
                        </div>
                     </div>
                  </div>

                  <div>
                     <h3 className="text-2xl font-black mb-6 flex items-center gap-3 pt-6 border-t border-borderline">
                        <MapPin className="text-primary" /> Shipping Destination
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                           <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Street Address</label>
                           <textarea 
                             name="address"
                             rows={3}
                             value={formData.address}
                             onChange={handleInputChange}
                             className="w-full px-6 py-4 rounded-2xl glass border border-borderline focus:border-primary/50 outline-none transition-all resize-none"
                             placeholder="Street address, warehouse location, or delivery port..."
                           />
                        </div>

                        <div className="space-y-2">
                           <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">City</label>
                           <input 
                             name="city"
                             value={formData.city}
                             onChange={handleInputChange}
                             className="w-full px-6 py-4 rounded-2xl glass border border-borderline focus:border-primary/50 outline-none transition-all"
                             placeholder="City / Port"
                           />
                        </div>

                        <div className="space-y-2">
                           <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Country</label>
                           <input 
                             name="country"
                             value={formData.country}
                             onChange={handleInputChange}
                             className="w-full px-6 py-4 rounded-2xl glass border border-borderline focus:border-primary/50 outline-none transition-all"
                             placeholder="Country"
                           />
                        </div>
                     </div>
                  </div>

                  <button 
                    onClick={nextStep}
                    disabled={!formData.address || !formData.fullName}
                    className="w-full py-5 bg-primary text-white rounded-2xl font-black text-xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                  >
                     Continue to Payment <ArrowRight size={24} />
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="glass p-8 md:p-12 rounded-[3.5rem] border border-primary/20 bg-primary/5 space-y-8"
                >
                   <div className="text-center">
                      <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-6 mx-auto">
                         <CreditCard size={40} className="text-primary" />
                      </div>
                      <h2 className="text-3xl font-black mb-2">Secure Escrow Payment</h2>
                      <p className="text-muted-foreground text-sm">
                         Total payable: <span className="font-extrabold text-foreground">${finalTotal.toLocaleString()} USD</span>
                      </p>
                   </div>

                   {orderError && (
                     <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-semibold">
                       {orderError}
                     </div>
                   )}

                   {isProcessingOrder ? (
                     <div className="py-12 text-center space-y-4">
                       <Loader2 size={40} className="text-primary animate-spin mx-auto" />
                       <h3 className="text-xl font-bold">Creating Order in PostgreSQL...</h3>
                       <p className="text-sm text-muted-foreground">Confirming escrow payment & notifying supplier.</p>
                     </div>
                   ) : (
                     <>
                       <PaymentMethodSelector 
                         onMethodChange={setPaymentMethod}
                         selectedMethod={paymentMethod}
                       />

                       <div className="space-y-3 w-full">
                          {paymentMethod === "paystack" && (
                            <PaystackButton
                              product={checkoutProduct}
                              user={user}
                              onPaymentSuccess={handlePaymentSuccess}
                            />
                          )}
                          {paymentMethod === "flutterwave" && (
                            <FlutterwaveButton
                              product={checkoutProduct}
                              user={user}
                              currency="USD"
                            />
                          )}
                          {paymentMethod === "mobile-money" && (
                            <MobileMoneyButton
                              productId={cartItems[0]?.id || "cart"}
                              amount={cartTotal}
                              currency="USD"
                              user={user}
                              onSuccess={(ref) => {
                                router.push(`/checkout/success?reference=${ref}&method=mobile_money`);
                              }}
                            />
                          )}
                       </div>

                       <button 
                         onClick={prevStep}
                         className="w-full py-4 border border-borderline rounded-2xl hover:bg-muted transition-all font-bold text-sm min-h-[48px]"
                       >
                          ← Modify Shipping Details
                       </button>
                     </>
                   )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column Order Summary */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass p-8 rounded-[3rem] border border-borderline sticky top-24">
              <h3 className="text-2xl font-black mb-6 border-b border-borderline pb-4 flex items-center gap-3">
                 <ShoppingBag size={24} className="text-primary" /> Order Summary
              </h3>
              
              <div className="space-y-5 max-h-[350px] overflow-y-auto mb-6 pr-2">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 group">
                     <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center border border-borderline">
                        {item.imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag size={20} className="text-slate-400" />
                        )}
                     </div>
                     <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate">{item.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ${item.price.toLocaleString()} × {item.quantity} units
                        </p>
                     </div>
                     <div className="text-right">
                        <p className="font-black text-sm">${(item.price * item.quantity).toLocaleString()}</p>
                     </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-6 border-t border-borderline text-sm font-semibold">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Escrow Fee</span>
                  <span className="text-emerald-500 font-bold">FREE</span>
                </div>
                <div className="flex justify-between text-lg font-black text-foreground pt-3 border-t border-borderline">
                  <span>Total</span>
                  <span className="text-primary">${finalTotal.toLocaleString()} USD</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
