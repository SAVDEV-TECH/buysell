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
import Image from "next/image";
import dynamic from "next/dynamic";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";

const PaystackButton = dynamic(() => import('@/components/PaystackButton'), { ssr: false });
const FlutterwaveButton = dynamic(() => import('@/components/FlutterwaveButton'), { ssr: false });
const MobileMoneyButton = dynamic(() => import('@/components/MobileMoneyButton'), { ssr: false });

import { GlobalPaymentMethod } from "@/lib/globalPaymentRouter";

export default function CheckoutPage() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user, profile, organizationId } = useAuth();
  const { sendNotification } = useNotifications();
  const router = useRouter();

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<GlobalPaymentMethod>("paystack");
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

      // ALWAYS record escrow deposit — even if DB order insert failed
      // This ensures Super Admin always sees funds held in escrow
      try {
        const { error: escrowErr } = await supabase.from("escrow_transactions").insert({
          order_id: dbOrderInserted ? createdOrderId : null,
          user_id: user.id,
          amount: finalTotal,
          currency: "USD",
          type: "deposit",
          status: "held",
          reference: reference,
          description: `Escrow deposit for order ${createdOrderId} via ${paymentMethod}`,
          metadata: { paymentMethod, order_ref: createdOrderId, cart_items: cartItems.length }
        });
        if (escrowErr) {
          console.warn("[Checkout] Escrow insert notice:", escrowErr.message);
        }
      } catch (escrowErr) {
        console.warn("[Checkout] Escrow insert exception:", escrowErr);
      }

      // 4. Resolve supplier user ID for live real-time notification & supplier local persistence
      let supplierUserId: string | null = null;
      if (cartItems.length > 0) {
        const firstProduct = cartItems[0];
        try {
          const { data: prodInfo } = await supabase
            .from("products")
            .select("user_id, supplier_organization_id")
            .eq("id", firstProduct.id)
            .maybeSingle();

          if (prodInfo?.user_id) {
            supplierUserId = prodInfo.user_id;
          }

          if (!supplierUserId && prodInfo?.supplier_organization_id && prodInfo.supplier_organization_id !== "supplier") {
            const { data: orgInfo } = await supabase
              .from("organizations")
              .select("user_id")
              .eq("id", prodInfo.supplier_organization_id)
              .maybeSingle();
            if (orgInfo?.user_id) {
              supplierUserId = orgInfo.user_id;
            }
          }
        } catch (sErr) {
          console.warn("[Checkout] Supplier resolution notice:", sErr);
        }
      }

      // 5. Trigger Real-Time Notification for Buyer
      await sendNotification(
        user.id,
        `🛒 Order #${createdOrderId.slice(0, 8).toUpperCase()} Placed!`,
        `Your wholesale payment of $${finalTotal.toLocaleString()} was confirmed. Status: Processing.`,
        "ORDER",
        `/dashboard/orders`
      );

      // 6. Trigger Real-Time Notification for Supplier/Manufacturer
      if (supplierUserId && supplierUserId !== user.id) {
        try {
          await sendNotification(
            supplierUserId,
            `📦 New Order #${createdOrderId.slice(0, 8).toUpperCase()} Received!`,
            `A buyer placed a wholesale order of $${finalTotal.toLocaleString()}. Payment is secured in escrow.`,
            "ORDER",
            `/dashboard/orders`
          );
          const suppKey = `buysell_user_orders_${supplierUserId}`;
          const suppExisting = JSON.parse(localStorage.getItem(suppKey) || "[]");
          const suppUpdated = [newOrderObject, ...suppExisting.filter((o: any) => o.id !== createdOrderId)];
          localStorage.setItem(suppKey, JSON.stringify(suppUpdated));
        } catch (notifErr) {
          console.warn("[Checkout] Supplier notification notice:", notifErr);
        }
      }

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
      <div className="min-h-screen pt-32 pb-20 px-4 text-center bg-background text-foreground">
         <div className="bg-card max-w-md mx-auto p-10 rounded-3xl border border-border shadow-sm">
            <ShoppingBag size={56} className="mx-auto mb-6 text-muted-foreground opacity-30" />
            <h2 className="text-2xl font-bold mb-2 text-foreground">Cart is empty</h2>
            <p className="text-muted-foreground mb-8 text-sm">You haven&apos;t added anything to your cart yet.</p>
            <Link href="/marketplace" className="inline-flex items-center gap-2 px-6 py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all">
               <ArrowLeft size={18} /> Browse Marketplace
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
    <div className="min-h-screen pt-12 pb-20 bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 md:px-8">

        {/* Header Stepper */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
           <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Finalize <span className="gradient-text">Checkout</span></h1>
              <p className="text-muted-foreground text-sm font-medium flex items-center gap-2 mt-1">
                 Secure B2B Transaction & Escrow Protection <ShieldCheck size={16} className="text-primary" />
              </p>
           </div>
           
           <div className="flex items-center gap-2 bg-card p-1.5 rounded-xl border border-border shadow-sm">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center gap-2 px-3 py-1.5">
                   <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${step >= s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                      {s}
                   </div>
                   <span className={`text-xs font-bold ${step >= s ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {s === 1 ? "Details" : "Payment"}
                   </span>
                   {s === 1 && <ArrowRight size={14} className="text-muted-foreground" />}
                </div>
              ))}
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Form Left Column */}
          <div className="lg:col-span-7 space-y-6">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  className="bg-card p-6 md:p-8 rounded-2xl border border-border space-y-6 shadow-sm"
                >
                  <div>
                     <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground">
                        <User size={20} className="text-primary" /> Contact Information
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                           <label className="text-xs font-bold text-muted-foreground">Full Name</label>
                           <div className="relative">
                             <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                             <input 
                               name="fullName"
                               value={formData.fullName}
                               onChange={handleInputChange}
                               className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary outline-none transition-all text-sm text-foreground"
                               placeholder="Business or Buyer Name"
                             />
                           </div>
                        </div>

                        <div className="space-y-1.5">
                           <label className="text-xs font-bold text-muted-foreground">Work Email</label>
                           <div className="relative">
                             <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                             <input 
                               name="email"
                               type="email"
                               value={formData.email}
                               onChange={handleInputChange}
                               className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary outline-none transition-all text-sm text-foreground"
                               placeholder="buyer@company.com"
                             />
                           </div>
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                           <label className="text-xs font-bold text-muted-foreground">Phone Number</label>
                           <div className="relative">
                             <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                             <input 
                               name="phone"
                               value={formData.phone}
                               onChange={handleInputChange}
                               className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary outline-none transition-all text-sm text-foreground"
                               placeholder="+234 800 000 0000"
                             />
                           </div>
                        </div>
                     </div>
                  </div>

                  <div>
                     <h3 className="text-lg font-bold mb-4 flex items-center gap-2 pt-4 border-t border-border text-foreground">
                        <MapPin size={20} className="text-primary" /> Shipping Destination
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 md:col-span-2">
                           <label className="text-xs font-bold text-muted-foreground">Street Address</label>
                           <textarea 
                             name="address"
                             rows={3}
                             value={formData.address}
                             onChange={handleInputChange}
                             className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary outline-none transition-all resize-none text-sm text-foreground"
                             placeholder="Street address, warehouse location, or delivery port..."
                           />
                        </div>

                        <div className="space-y-1.5">
                           <label className="text-xs font-bold text-muted-foreground">City</label>
                           <input 
                             name="city"
                             value={formData.city}
                             onChange={handleInputChange}
                             className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary outline-none transition-all text-sm text-foreground"
                             placeholder="City / Port"
                           />
                        </div>

                        <div className="space-y-1.5">
                           <label className="text-xs font-bold text-muted-foreground">Country</label>
                           <input 
                             name="country"
                             value={formData.country}
                             onChange={handleInputChange}
                             className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary outline-none transition-all text-sm text-foreground"
                             placeholder="Country"
                           />
                        </div>
                     </div>
                  </div>

                  <button 
                    onClick={nextStep}
                    disabled={!formData.address || !formData.fullName}
                    className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-base hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                     Continue to Payment <ArrowRight size={18} />
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  className="bg-card p-6 md:p-8 rounded-2xl border border-border space-y-6 shadow-sm"
                >
                   <div className="text-center">
                      <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-3 mx-auto">
                         <CreditCard size={28} className="text-primary" />
                      </div>
                      <h2 className="text-xl font-bold text-foreground mb-1">Secure Escrow Payment</h2>
                      <p className="text-muted-foreground text-xs">
                          Total payable: <span className="font-bold text-foreground">${finalTotal.toLocaleString()} USD</span>
                      </p>
                   </div>

                   {orderError && (
                     <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
                       {orderError}
                     </div>
                   )}

                   {isProcessingOrder ? (
                     <div className="py-10 text-center space-y-3">
                       <Loader2 size={32} className="text-primary animate-spin mx-auto" />
                       <h3 className="text-base font-bold text-foreground">Creating Order in PostgreSQL...</h3>
                       <p className="text-xs text-muted-foreground">Confirming escrow payment & notifying supplier.</p>
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
                          {paymentMethod === "stripe" && (
                            <button
                              onClick={() => handlePaymentSuccess(`stripe-${Date.now()}`)}
                              className="w-full py-3.5 bg-[#635BFF] text-white rounded-xl font-bold text-sm hover:bg-[#635BFF]/90 transition-all shadow-md flex items-center justify-center gap-2"
                            >
                              Pay with Stripe (Simulated)
                            </button>
                          )}
                          {paymentMethod === "verto_fx" && (
                            <button
                              onClick={() => handlePaymentSuccess(`verto-${Date.now()}`)}
                              className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-md flex items-center justify-center gap-2"
                            >
                              Pay with VertoFX Wire (Simulated)
                            </button>
                          )}
                       </div>

                       <button 
                         onClick={prevStep}
                         className="w-full py-3 border border-border rounded-xl hover:bg-muted text-foreground transition-all font-semibold text-xs"
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
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm sticky top-24">
              <h3 className="text-lg font-bold mb-4 border-b border-border pb-3 flex items-center gap-2 text-foreground">
                 <ShoppingBag size={18} className="text-primary" /> Order Summary
              </h3>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto mb-4 pr-1">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                     <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center border border-border">
                        {item.imageUrl ? (
                          <div className="relative w-full h-full">
                            <Image src={item.imageUrl} alt={item.name} fill sizes="48px" className="object-cover" />
                          </div>
                        ) : (
                          <ShoppingBag size={18} className="text-muted-foreground opacity-40" />
                        )}
                     </div>
                     <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs truncate text-foreground">{item.name}</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          ${item.price.toLocaleString()} × {item.quantity} units
                        </p>
                     </div>
                     <div className="text-right">
                        <p className="font-bold text-xs text-foreground">${(item.price * item.quantity).toLocaleString()}</p>
                     </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-4 border-t border-border text-xs font-medium">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="text-foreground">${cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Escrow Protection Fee</span>
                  <span className="text-emerald-500 font-bold">FREE</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-foreground pt-2 border-t border-border">
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
