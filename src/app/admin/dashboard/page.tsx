"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  getDocs, 
  where, 
  updateDoc, 
  doc, 
  Timestamp,
  orderBy
} from "firebase/firestore";
import { 
  Users, 
  ShoppingBag, 
  DollarSign, 
  CheckCircle2, 
  X, 
  Loader2, 
  ShieldAlert, 
  ArrowUpRight,
  UserCheck,
  Package,
  TrendingUp,
  AlertTriangle,
  History,
  Building
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/context/NotificationContext";
import { processPaystackPayout } from "@/app/actions/payout";

export default function AdminDashboard() {
  const { user, role } = useAuth();
  const { sendNotification } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, products: 0, volume: 0, pendingPayouts: 0 });
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [pendingWholesalers, setPendingWholesalers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("payouts");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchAdminData = async () => {
      if (role !== "ADMIN") return;
      setLoading(true);
      try {
        const [usersSnap, productsSnap, ordersSnap] = await Promise.all([
          getDocs(collection(db, "users")).catch(() => ({ size: 0, docs: [] })),
          getDocs(collection(db, "products")).catch(() => ({ size: 0, docs: [] })),
          getDocs(collection(db, "orders")).catch(() => ({ size: 0, docs: [] }))
        ]);
        
        let totalVolume = 0;
        if ("docs" in ordersSnap) {
          (ordersSnap as any).docs.forEach((doc: any) => {
            totalVolume += doc.data()?.totalAmount || 0;
          });
        }

        setStats({
          users: usersSnap.size,
          products: productsSnap.size,
          volume: totalVolume,
          pendingPayouts: 0
        });

        // Fetch Payout Requests
        const payoutsQ = query(collection(db, "payoutRequests"), where("status", "==", "Pending"));
        const payoutsSnap = await getDocs(payoutsQ);
        const fetchedPayouts = payoutsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        
        setPayoutRequests(fetchedPayouts);
        setStats(prev => ({ ...prev, pendingPayouts: fetchedPayouts.length }));

        // Fetch Pending Verifications (Wholesalers & Manufacturers)
        // We fetch all to catch legacy accounts where isVerified might be missing
        const sellersQ = query(
          collection(db, "users"), 
          where("role", "in", ["WHOLESALER", "MANUFACTURER"])
        );
        const sellersSnap = await getDocs(sellersQ);
        const fetchedSellers = sellersSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((user: any) => user.isVerified !== true);
        
        setPendingWholesalers(fetchedSellers);

      } catch (error) {
        console.error("Admin fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [role]);

  const approvePayout = async (request: any) => {
    if (!request.bankDetails?.bankCode) {
      alert("Invalid bank details. Wholesaler needs to reconnect bank account.");
      return;
    }
    
    setSubmitting(true);
    try {
      const result = await processPaystackPayout(
        user?.uid || "",
        request.id, 
        request.userId, 
        request.amount, 
        request.bankDetails
      );

      if (!result.success) throw new Error(result.message);

      await sendNotification(
        request.userId,
        "Withdrawal Approved! 💸",
        `Your request for ₦${request.amount.toLocaleString()} has been processed. The funds are now in transit to your bank.`,
        "ORDER",
        "/dashboard/payouts"
      );

      setPayoutRequests(prev => prev.filter(p => p.id !== request.id));
      alert(result.message);
    } catch (error: any) {
       console.error("Payout error:", error);
       alert(`Payout failed: ${error.message}`);
    } finally {
       setSubmitting(false);
    }
  };

  const approvePartner = async (sellerId: string) => {
    setSubmitting(true);
    try {
      await updateDoc(doc(db, "users", sellerId), { isVerified: true });
      
      // Notify the wholesaler
      await sendNotification(
        sellerId,
        "Account Verified! 🔓",
        "Your partner identity has been verified. You now have full clearance to manage products and payouts.",
        "SYSTEM",
        "/dashboard"
      );

      setPendingWholesalers(prev => prev.filter(s => s.id !== sellerId));
      alert("Account status verified successfully!");
    } catch (error) {
      console.error("Error verifying wholesaler:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (role !== "ADMIN") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8 bg-slate-900 text-white">
         <ShieldAlert size={64} className="text-red-500 mb-6 drop-shadow-2xl" />
         <h1 className="text-4xl font-black mb-4">RESTRICTED ZONE</h1>
         <p className="text-slate-400 font-medium mb-8 max-w-sm">Access to this command center is limited to authenticated administrative protocols.</p>
         <button onClick={() => window.location.href = "/"} className="px-8 py-4 bg-white text-black rounded-2xl font-black hover:scale-105 active:scale-95 transition-all">Emergency Egress</button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
         <div>
            <h1 className="text-3xl font-black flex items-center gap-3">
               COMMAND <span className="text-primary tracking-tighter">CENTER</span>
            </h1>
            <p className="text-muted-foreground font-medium">Monitoring platform-wide telemetry & protocols.</p>
         </div>
         <div className="px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest border border-emerald-500/20">
            Node: Live-Alpha-BuySell
         </div>
      </div>

      {/* Analytics Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {[
           { label: "Aggregate Volume", val: "₦" + stats.volume.toLocaleString(), icon: <DollarSign />, color: "text-emerald-500" },
           { label: "Active Nodes", val: stats.users, icon: <Users />, color: "text-blue-500" },
           { label: "Total Assets", val: stats.products, icon: <ShoppingBag />, color: "text-purple-500" },
           { label: "Pending Payouts", val: stats.pendingPayouts, icon: <AlertTriangle />, color: "text-orange-500" }
         ].map((stat, i) => (
           <motion.div 
             key={i}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: i * 0.1 }}
             className="glass p-8 rounded-[2.5rem] border border-borderline relative overflow-hidden group hover:scale-[1.02] transition-all"
           >
              <div className={`w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-6 ${stat.color}`}>
                 {stat.icon}
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
              <h4 className="text-2xl font-black tracking-tight">{stat.val}</h4>
           </motion.div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         {/* Command Management Tabs */}
         <div className="lg:col-span-2 space-y-6">
            <div className="flex gap-4 mb-4">
               {["payouts", "verification"].map(tab => (
                 <button 
                   key={tab}
                   onClick={() => setActiveTab(tab)}
                   className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border ${activeTab === tab ? 'bg-primary text-white border-primary shadow-2xl shadow-primary/20' : 'glass border-borderline hover:bg-muted/50'}`}
                 >
                   {tab === "payouts" ? "Payout Protocol" : "Account Vetting"}
                 </button>
               ))}
            </div>

            <div className="glass p-10 rounded-[3rem] border border-borderline min-h-[400px]">
               {activeTab === "payouts" ? (
                 <div className="space-y-6">
                    <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                       <History size={20} className="text-primary" /> Pending Financial Requests
                    </h3>
                    
                    {payoutRequests.length === 0 ? (
                       <div className="py-20 text-center opacity-30 italic">No pending payout requests.</div>
                    ) : (
                      payoutRequests.map(req => (
                        <div key={req.id} className="p-6 rounded-3xl bg-white/40 dark:bg-slate-900/40 border border-borderline flex items-center justify-between gap-6 hover:bg-white/60 transition-all">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
                                 <Building size={24} />
                              </div>
                              <div>
                                 <p className="font-black text-lg">₦{req.amount?.toLocaleString()}</p>
                                 <p className="text-[10px] text-muted-foreground font-bold uppercase">{req.bankDetails?.bankName} • {req.bankDetails?.accountName}</p>
                              </div>
                           </div>
                           <div className="flex gap-2">
                              <button 
                                onClick={() => approvePayout(req)}
                                disabled={submitting}
                                className="p-3 bg-emerald-500 text-white rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg"
                                title="Approve & Distribute"
                              >
                                 {submitting ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle2 size={18} />}
                              </button>
                              <button className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                 <X size={18} />
                              </button>
                           </div>
                        </div>
                      ))
                    )}
                 </div>
               ) : (
                 <div className="space-y-6">
                    <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                       <UserCheck size={20} className="text-primary" /> Identity Authentication
                    </h3>
                    {pendingWholesalers.length === 0 ? (
                       <div className="py-20 text-center opacity-30 italic">All accounts verified at current telemetry level.</div>
                    ) : (
                      pendingWholesalers.map(seller => (
                        <div key={seller.id} className="p-6 rounded-3xl bg-white/40 dark:bg-slate-900/40 border border-borderline flex items-center justify-between gap-6">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center text-xl font-black">
                                 {seller.name?.charAt(0) || "W"}
                              </div>
                              <div>
                                 <p className="font-black">{seller.businessName || seller.name}</p>
                                 <p className="text-[10px] text-muted-foreground font-bold uppercase">{seller.role} • {seller.email}</p>
                              </div>
                           </div>
                           <div className="flex gap-2">
                              <button 
                                onClick={() => approvePartner(seller.id)}
                                disabled={submitting}
                                className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                              >
                                 {submitting ? <Loader2 className="animate-spin" size={14}/> : "Verify Access"}
                              </button>
                           </div>
                        </div>
                      ))
                    )}
                 </div>
               )}
            </div>
         </div>

         {/* Side Telemetry */}
         <div className="lg:col-span-1 space-y-6">
            <div className="glass p-8 rounded-[3rem] border border-borderline h-full flex flex-col justify-between">
               <div>
                  <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                     <TrendingUp className="text-primary" size={20} /> System Vitality
                  </h3>
                  
                  <div className="space-y-6">
                     <div className="p-4 rounded-2xl bg-white/30 dark:bg-slate-800/30 border border-borderline flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase opacity-70">Uptime</span>
                        <span className="text-xs font-black text-emerald-500">99.99% PROTOCOL-OK</span>
                     </div>
                     <div className="p-4 rounded-2xl bg-white/30 dark:bg-slate-800/30 border border-borderline flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase opacity-70">Latency</span>
                        <span className="text-xs font-black text-blue-500">22MS (LOCAL)</span>
                     </div>
                     <div className="p-4 rounded-2xl bg-white/30 dark:bg-slate-800/30 border border-borderline flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase opacity-70">Traffic Level</span>
                        <span className="text-xs font-black text-orange-500 uppercase">High Nominal</span>
                     </div>
                  </div>
               </div>

               <div className="mt-10 p-6 rounded-[2rem] bg-slate-900 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                     <Package size={64} />
                  </div>
                  <h4 className="text-sm font-black mb-2 uppercase tracking-widest">Protocol Updates</h4>
                  <p className="text-[10px] text-white/50 leading-relaxed font-medium">Automatic system backups initiated at 03:00 UTC. Next verification cycle in 14 hours.</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
