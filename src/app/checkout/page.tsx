"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { 
  ArrowLeft, 
  CreditCard, 
  Truck, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Loader2,
  ShieldCheck,
  ShoppingBag,
  ArrowRight
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
  const { user } = useAuth();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "flutterwave" | "mobile-money">("paystack");
  const [formData, setFormData] = useState({
    fullName: user?.displayName || "",
    email: user?.email || "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: ""
  });

  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [promoError, setPromoError] = useState("");
  const [applying, setApplying] = useState(false);
  const [appliedCode, setAppliedCode] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const checkPromo = async () => {
    if (!promoCode.trim()) return;
    setApplying(true);
    setPromoError("");
    try {
      const q = query(collection(db, "coupons"), where("code", "==", promoCode.toUpperCase().trim()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setPromoError("Invalid code");
      } else {
        const data = snap.docs[0].data();
        if (cartTotal < data.minSpend) {
          setPromoError(`Min spend: ₦${data.minSpend.toLocaleString()}`);
        } else {
          const discountVal = data.type === 'percentage' ? (cartTotal * data.discount / 100) : data.discount;
          setDiscount(discountVal);
          setAppliedCode(promoCode.toUpperCase().trim());
        }
      }
    } catch (err) {
       console.error("Error checking promo:", err);
    } finally {
       setApplying(false);
    }
  };

  const finalTotal = cartTotal - discount;

  if (cartItems.length === 0 && step !== 3) {
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

  const mockProductForPaystack = {
    id: "order-" + Date.now(),
    name: "Platform Order",
    price: finalTotal,
    category: "Multiple Items",
    desc: "Payment for BuySell order items",
    rating: 5,
    reviews: 0,
  };

  return (
    <div className="min-h-screen pt-24 pb-20 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
           <div>
              <h1 className="text-4xl font-black mb-2 tracking-tight">Finalize <span className="gradient-text">Checkout</span></h1>
              <p className="text-muted-foreground font-medium flex items-center gap-2">
                 Secure B2B Transaction <ShieldCheck size={16} className="text-primary" />
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
          
          {/* Main Form */}
          <div className="lg:col-span-7 space-y-8">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="glass p-8 md:p-12 rounded-[3.5rem] border border-borderline/50"
                >
                  <div className="space-y-10">
                    <div>
                       <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                          <User className="text-primary" /> Your Information
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                             <input 
                               name="fullName"
                               value={formData.fullName}
                               onChange={handleInputChange}
                               className="w-full px-6 py-4 rounded-2xl glass border border-borderline focus:border-primary/50 outline-none transition-all"
                               placeholder="Business or Personal Name"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Work Email</label>
                             <input 
                               name="email"
                               type="email"
                               value={formData.email}
                               onChange={handleInputChange}
                               className="w-full px-6 py-4 rounded-2xl glass border border-borderline focus:border-primary/50 outline-none transition-all"
                               placeholder="example@company.com"
                             />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                             <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</label>
                             <input 
                               name="phone"
                               value={formData.phone}
                               onChange={handleInputChange}
                               className="w-full px-6 py-4 rounded-2xl glass border border-borderline focus:border-primary/50 outline-none transition-all"
                               placeholder="+234 XXX XXX XXXX"
                             />
                          </div>
                       </div>
                    </div>

                    <div>
                       <h3 className="text-2xl font-black mb-6 flex items-center gap-3 pt-6 border-t border-borderline">
                          <MapPin className="text-primary" /> Delivery Address
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2 md:col-span-2">
                             <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Street Address</label>
                             <textarea 
                               name="address"
                               rows={3}
                               value={formData.address}
                               onChange={handleInputChange}
                               className="w-full px-6 py-4 rounded-2xl glass border border-borderline focus:border-primary/50 outline-none transition-all"
                               placeholder="B5, Estate Road, Lagos..."
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">City</label>
                             <input 
                               name="city"
                               value={formData.city}
                               onChange={handleInputChange}
                               className="w-full px-6 py-4 rounded-2xl glass border border-borderline focus:border-primary/50 outline-none transition-all"
                               placeholder="Lagos"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">State</label>
                             <input 
                               name="state"
                               value={formData.state}
                               onChange={handleInputChange}
                               className="w-full px-6 py-4 rounded-2xl glass border border-borderline focus:border-primary/50 outline-none transition-all"
                               placeholder="Lagos State"
                             />
                          </div>
                       </div>
                    </div>

                    <button 
                      onClick={nextStep}
                      disabled={!formData.address}
                      className="w-full py-5 bg-primary text-white rounded-2xl font-black text-xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                    >
                       Continue to Payment <ArrowRight size={24} />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="glass p-12 rounded-[3.5rem] border border-primary/20 bg-primary/5 space-y-8"
                >
                   <div className="text-center">
                      <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-8 mx-auto">
                         <CreditCard size={48} className="text-primary" />
                      </div>
                      <h2 className="text-3xl font-black mb-4">Secure Payment</h2>
                      <p className="text-muted-foreground mb-4">
                         Your order for ₦{finalTotal.toLocaleString()} {discount > 0 && `(with ₦${discount.toLocaleString()} discount)`}
                      </p>
                   </div>

                   {/* Payment Method Selector */}
                   <PaymentMethodSelector 
                     onMethodChange={setPaymentMethod}
                     selectedMethod={paymentMethod}
                   />

                   {/* Payment Buttons */}
                   <div className="flex gap-4 justify-center flex-wrap [&>button]:py-5 [&>button]:font-bold [&>button]:text-lg [&>button]:min-h-[48px]">
                      {paymentMethod === "paystack" && (
                        <PaystackButton product={mockProductForPaystack} user={user} />
                      )}
                      {paymentMethod === "flutterwave" && (
                        <FlutterwaveButton product={mockProductForPaystack} user={user} currency="NGN" />
                      )}
                      {paymentMethod === "mobile-money" && (
                        <MobileMoneyButton product={mockProductForPaystack} user={user} currency="NGN" />
                      )}
                   </div>

                   <button 
                     onClick={prevStep}
                     className="w-full py-4 border border-borderline rounded-2xl hover:bg-muted transition-all font-black min-h-[48px]"
                   >
                      ← Modify Shipping Details
                   </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar: Order Summary */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass p-8 rounded-[3rem] border border-borderline sticky top-24">
              <h3 className="text-2xl font-black mb-8 border-b border-borderline pb-4 flex items-center gap-3">
                 <ShoppingBag size={24} className="text-primary" /> Order Summary
              </h3>
              
              <div className="space-y-6 max-h-[400px] overflow-y-auto mb-8 pr-2 no-scrollbar">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 group">
                     <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center opacity-20">
                            <ShoppingBag size={18} />
                          </div>
                        )}
                     </div>
                     <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{item.name}</h4>
                        <p className="text-xs text-muted-foreground mr-1">Qty: {item.quantity} x ₦{item.price.toLocaleString()}</p>
                     </div>
                     <p className="font-black text-sm text-primary">₦{(item.quantity * item.price).toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {/* Promo Code Input */}
              <div className="mb-8 pt-6 border-t border-borderline">
                 <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Promo Code" 
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      className="flex-1 px-4 py-3 glass border border-borderline rounded-xl text-xs font-bold outline-none focus:border-primary/50"
                    />
                    <button 
                      onClick={checkPromo}
                      disabled={applying || !promoCode.trim()}
                      className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50"
                    >
                      {applying ? <Loader2 className="animate-spin" size={14}/> : "Apply"}
                    </button>
                 </div>
                 {promoError && <p className="text-[10px] text-red-500 font-bold mt-2 ml-1 uppercase transition-all">{promoError}</p>}
                 {appliedCode && <p className="text-[10px] text-emerald-500 font-bold mt-2 ml-1 uppercase transition-all flex items-center gap-1">
                    <CheckCircle2 size={12}/> Code {appliedCode} Applied
                 </p>}
              </div>

              <div className="space-y-4 border-t border-borderline pt-6">
                 <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-bold text-foreground font-mono">₦{cartTotal.toLocaleString()}</span>
                 </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Logistics & Freight</span>
                    <span className="font-bold text-emerald-500 uppercase text-[10px] tracking-widest">Calculated by Seller</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600 font-bold">
                       <span>Discount</span>
                       <span className="font-mono">-₦{discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-end pt-4 border-t border-borderline/50">
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Final Order Total</p>
                        <p className="text-4xl font-black text-primary transition-all">₦{finalTotal.toLocaleString()}</p>
                     </div>
                  </div>
              </div>

              <div className="mt-8 p-4 bg-muted/30 rounded-2xl border border-borderline flex items-center gap-3">
                 <Truck className="text-primary" size={24} />
                 <div>
                    <h5 className="font-bold text-sm">Priority Business Shipping</h5>
                    <p className="text-[10px] text-muted-foreground uppercase font-black">Estimated: 3-5 Working Days</p>
                 </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}


