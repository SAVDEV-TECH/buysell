"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { 
  ShoppingBag, 
  ArrowLeft, 
  CheckCircle2, 
  Truck, 
  Package, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Loader2,
  Calendar,
  ChevronRight,
  AlertCircle,
  FileText,
  Printer,
  ShieldCheck
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, role } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const docRef = doc(db, "orders", id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setOrder({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.error("Order not found");
        }
      } catch (error) {
        console.error("Error fetching order detail:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchOrder();
  }, [id]);

  const updateStatus = async (newStatus: string, note?: string) => {
    try {
      const orderRef = doc(db, "orders", id as string);
      const timelineEntry = {
        status: newStatus,
        message: note || `Order status updated to ${newStatus}`,
        timestamp: new Date().toISOString()
      };
      
      const updatedTimeline = [...(order.timeline || []), timelineEntry];
      await updateDoc(orderRef, { 
        status: newStatus,
        timeline: updatedTimeline
      });
      setOrder({...order, status: newStatus, timeline: updatedTimeline});
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
         <Loader2 size={48} className="text-primary animate-spin mb-4" />
         <p className="text-muted-foreground font-medium italic">Syncing order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
         <AlertCircle size={64} className="text-muted-foreground mb-4 opacity-20" />
         <h2 className="text-2xl font-black mb-4">Order Not Found</h2>
         <Link href="/dashboard/orders" className="text-primary font-bold hover:underline">Back to All Orders</Link>
      </div>
    );
  }

  const getStatusStep = (status: string) => {
    switch(status) {
      case "Pending": return 1;
      case "Processing": return 2;
      case "Shipped": return 3;
      case "Delivered": case "Completed": return 4;
      default: return 1;
    }
  };

  const steps = [
    { title: "Confirmed", icon: <CheckCircle2 size={18}/>, status: "Pending" },
    { title: "Processing", icon: <Clock size={18}/>, status: "Processing" },
    { title: "On the Way", icon: <Truck size={18}/>, status: "Shipped" },
    { title: "Delivered", icon: <Package size={18}/>, status: "Delivered" }
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div>
            <button 
              onClick={() => router.back()}
              className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-bold"
            >
              <ArrowLeft size={16} /> Back to Orders
            </button>
            <h1 className="text-3xl font-black flex items-center gap-3">
               Order <span className="text-primary">#{order.id.slice(0, 8).toUpperCase()}</span>
            </h1>
         </div>
         
         {(role === "MANUFACTURER" || role === "ADMIN") && (
            <div className="flex flex-wrap gap-4 items-center glass p-4 rounded-2xl border border-primary/20">
               <span className="text-[10px] font-black uppercase tracking-widest text-primary italic">Control Node</span>
               <select 
                 value={order.status}
                 onChange={(e) => updateStatus(e.target.value)}
                 className="px-6 py-2 glass border border-borderline/50 rounded-xl font-bold bg-transparent outline-none cursor-pointer text-xs"
               >
                  <option value="Pending">Mark as Pending</option>
                  <option value="Processing">Mark as Processing</option>
                  <option value="Shipped">Mark as Shipped</option>
                  <option value="Delivered">Mark as Delivered</option>
                  <option value="Cancelled">Mark as Cancelled</option>
               </select>
               <button 
                 onClick={() => {
                   const note = prompt("Enter logistics update message (e.g. 'Dispatched from Port Harcourt Hub'):");
                   if (note) updateStatus(order.status, note);
                 }}
                 className="px-4 py-2 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm"
               >
                  Inject Log
               </button>
            </div>
         )}
         
         <button 
           onClick={() => window.print()}
           className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-black/10"
         >
           <Printer size={16} /> Download Invoice (PDF)
         </button>
      </div>

      {/* Tracking Stepper */}
      <div className="glass p-10 rounded-[3rem] border border-borderline relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] rotate-12">
           <Truck size={200} />
        </div>
        
        <div className="relative z-10">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Status Protocol</p>
                 <p className="text-2xl font-black text-primary uppercase">{order.status || "In Transit"}</p>
              </div>
              <div className="text-left md:text-right">
                 <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Estimated Arrival</p>
                 <p className="font-black text-xl">3-5 Business Days</p>
              </div>
           </div>

           {/* Stepper Logic */}
           <div className="relative mb-12">
              <div className="absolute top-5 left-8 right-8 h-1 bg-muted/30 -z-10 hidden md:block" />
              <div 
                className="absolute top-5 left-8 h-1 bg-primary transition-all duration-1000 -z-10 hidden md:block" 
                style={{ width: `${(getStatusStep(order.status) - 1) * 33.33}%` }}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                 {steps.map((step, i) => (
                    <div key={i} className={`flex flex-row md:flex-col items-center gap-4 text-center ${getStatusStep(order.status) > i ? 'text-primary' : 'text-muted-foreground opacity-50'}`}>
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-500 scale-100 ${getStatusStep(order.status) > i ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-muted/10 border-borderline'}`}>
                          {step.icon}
                       </div>
                       <div>
                          <p className="text-xs font-black uppercase tracking-widest">{step.title}</p>
                          <p className="text-[10px] opacity-70 mt-1 hidden md:block">Process Verified</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           {/* Detailed Timeline Node */}
           <div className="mt-12 bg-white/5 dark:bg-black/20 rounded-[2rem] p-8 border border-white/10">
              <h4 className="text-xs font-black uppercase tracking-widest mb-8 text-primary shadow-sm">Logistics Ledger</h4>
              <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-primary before:to-transparent">
                 {order.timeline && order.timeline.length > 0 ? (
                   [...order.timeline].reverse().map((entry: any, idx: number) => (
                     <div key={idx} className="relative pl-10 animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg">
                           <Clock size={10} className="text-white" />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                           <div>
                              <p className="text-sm font-black uppercase tracking-tight">{entry.status}</p>
                              <p className="text-xs text-muted-foreground font-medium">{entry.message}</p>
                           </div>
                           <p className="text-[10px] font-bold text-muted-foreground opacity-50 italic">
                             {new Date(entry.timestamp).toLocaleString()}
                           </p>
                        </div>
                     </div>
                   ))
                 ) : (
                    <div className="flex items-center gap-4 text-muted-foreground">
                       <Clock size={16} className="opacity-20" />
                       <p className="text-xs font-medium italic">Establishing baseline logistics node... Initial entry pending.</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         {/* Order Items */}
         <div className="lg:col-span-2 space-y-6">
            <div className="glass p-8 rounded-[2.5rem] border border-borderline">
               <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                  <ShoppingBag className="text-primary" size={20} /> Order Inventory
               </h3>
               <div className="space-y-6">
                  {order.items?.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-6 p-4 rounded-2xl bg-white/30 dark:bg-slate-900/30 border border-borderline/20 hover:-translate-y-1 transition-all">
                       <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                          {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <ShoppingBag size={24} className="text-muted-foreground opacity-20" />}
                       </div>
                       <div className="flex-1">
                          <h4 className="font-bold text-sm">{item.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">Quantity: {item.quantity || 1} • ₦{item.price?.toLocaleString() || "0"}</p>
                       </div>
                       <p className="font-black text-primary">₦{((item.price || 0) * (item.quantity || 1)).toLocaleString()}</p>
                    </div>
                  ))}
               </div>
               
               <div className="mt-10 pt-8 border-t border-borderline/50 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                  <div className="space-y-2">
                     <p className="text-xs text-muted-foreground font-medium">Payment Protocol</p>
                     <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-xl font-black text-xs uppercase tracking-widest border border-emerald-500/20">
                        <CheckCircle2 size={16} /> Paid Fully
                     </div>
                  </div>
                  <div className="text-left md:text-right">
                     <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Final Transaction Amount</p>
                     <p className="text-4xl font-black">₦{order.totalAmount?.toLocaleString() || "0"}</p>
                  </div>
               </div>
            </div>

            {/* Logistics Info */}
            <div className="glass p-8 rounded-[2.5rem] border border-borderline bg-gradient-to-br from-primary/5 to-transparent">
               <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                  <Truck className="text-primary" size={20} /> Logistics & Fulfilment
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/50 dark:bg-slate-800/50 flex items-center justify-center border border-borderline flex-shrink-0">
                           <MapPin size={18} className="text-primary" />
                        </div>
                        <div>
                           <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Destination Address</p>
                           <p className="text-sm font-medium leading-relaxed italic opacity-80">Final address provided during checkout process.</p>
                        </div>
                     </div>
                     <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/50 dark:bg-slate-800/50 flex items-center justify-center border border-borderline flex-shrink-0">
                           <ShieldCheck size={18} className="text-primary" />
                        </div>
                        <div>
                           <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Business Verification</p>
                           <p className="text-sm font-bold text-emerald-500">SELLER-VERIFIED-LOGISTICS</p>
                        </div>
                     </div>
                  </div>
                  <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-4">
                     <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl border border-borderline flex items-center justify-center">
                        <Calendar size={24} className="text-primary" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Order Placed On</p>
                        <p className="font-black text-lg">Recently</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Customer Context Side */}
         <div className="lg:col-span-1 space-y-6 shrink-0">
            <div className="glass p-8 rounded-[2.5rem] border border-borderline sticky top-24">
               <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                  <User className="text-primary" size={20} /> Customer Insight
               </h3>
               <div className="space-y-8">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-borderline/20">
                     <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-black text-xl">
                        {order.customerName?.charAt(0) || "U"}
                     </div>
                     <div>
                        <p className="font-extrabold text-sm">{order.customerName || "Platform Wholesaler"}</p>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Verified Client</p>
                     </div>
                  </div>
                  
                  <div className="space-y-6">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center"><Mail size={14} className="text-muted-foreground"/></div>
                        <p className="text-xs font-bold text-muted-foreground">wholesaler@platform.com</p>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center"><Phone size={14} className="text-muted-foreground"/></div>
                        <p className="text-xs font-bold text-muted-foreground">+234-ORDER-SUPPORT</p>
                     </div>
                  </div>

                  <div className="pt-8 border-t border-borderline/50">
                     <button className="w-full py-4 glass border-primary/20 text-primary font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-primary/5 transition-all">
                        Support Message
                     </button>
                  </div>
               </div>
            </div>

            {/* Need Help? */}
            <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white relative overflow-hidden group hover:scale-[1.02] transition-all cursor-help shadow-2xl">
               <div className="absolute top-0 right-0 p-8 opacity-20 rotate-12 group-hover:scale-125 transition-transform duration-500">
                  <ShoppingBag size={80} />
               </div>
               <h4 className="text-xl font-black mb-4 relative z-10">Issues with Order?</h4>
               <p className="text-white/60 text-sm leading-relaxed mb-8 relative z-10 font-medium">Contact our dispatch support team if you notice any discrepancies in your consignment.</p>
               <button className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-primary hover:gap-3 transition-all relative z-10">
                  Open Support Ticket <ChevronRight size={16} />
               </button>
            </div>
         </div>
      </div>

      {/* Hidden Invoice for Printing */}
      <div className="hidden print:block p-10 bg-white text-black min-h-screen">
        <div className="flex justify-between items-start border-b-4 border-black pb-8 mb-8">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">Purchase Order</h1>
            <p className="text-sm font-bold text-slate-500">#{order.id.toUpperCase()}</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-black uppercase">BuySell B2B</h2>
            <p className="text-sm">Verified Marketplace Node</p>
            <p className="text-xs text-slate-500">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-12">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest mb-3 border-b pb-1">Supplier Node</h3>
            <p className="font-bold text-lg">{order.items?.[0]?.sellerName || "Verified Manufacturer"}</p>
            <p className="text-sm text-slate-600 italic">Credentials Verified via BuySell Protocol</p>
          </div>
          <div className="text-right">
            <h3 className="text-xs font-black uppercase tracking-widest mb-3 border-b pb-1 text-right">Wholesaler Node</h3>
            <p className="font-bold text-lg">{order.customerName || "Platform Partner"}</p>
            <p className="text-sm text-slate-600 italic">B2B Purchasing Verified</p>
          </div>
        </div>

        <table className="w-full mb-12">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="py-3 text-xs font-black uppercase">Description</th>
              <th className="py-3 text-xs font-black uppercase text-center">Qty</th>
              <th className="py-3 text-xs font-black uppercase text-right">Unit Price</th>
              <th className="py-3 text-xs font-black uppercase text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item: any, i: number) => (
              <tr key={i} className="border-b border-slate-200">
                <td className="py-4 font-bold">{item.name}</td>
                <td className="py-4 text-center">{item.quantity || 1}</td>
                <td className="py-4 text-right">₦{(item.price || 0).toLocaleString()}</td>
                <td className="py-4 text-right font-bold">₦{((item.price || 0) * (item.quantity || 1)).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-64 space-y-3">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span className="font-bold">₦{order.totalAmount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax (VAT)</span>
              <span className="font-bold">₦0.00</span>
            </div>
            <div className="flex justify-between text-xl font-black border-t-2 border-black pt-3">
              <span>Total Amount</span>
              <span>₦{order.totalAmount?.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="mt-24 pt-8 border-t border-slate-100 text-[10px] text-slate-400 italic text-center">
          This document is electronically generated via the BuySell B2B marketplace and serves as a valid Purchase Order between the identified nodes.
        </div>
      </div>
    </div>
  );
}
