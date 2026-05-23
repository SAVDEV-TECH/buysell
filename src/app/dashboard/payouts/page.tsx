"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, Timestamp, doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { 
  CreditCard, 
  Wallet,
  ArrowUpRight,
  TrendingUp,
  History,
  AlertCircle,
  Building,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Clock,
  X,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function PayoutsPage() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState({ available: 0, pending: 0, total: 0 });
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankDetails, setBankDetails] = useState<any>(null);
  
  // Bank Form State
  const [banks, setBanks] = useState<any[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [bankForm, setBankForm] = useState({ bankName: "", accountName: "", accountNumber: "", bankCode: "" });
  const [submitting, setSubmitting] = useState(false);

  // Fetch Banks from Paystack
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const res = await fetch("https://api.paystack.co/bank", {
          headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY}` }
        });
        const data = await res.json();
        if (data.status) setBanks(data.data);
      } catch (err) {
        console.error("Failed to fetch banks", err);
      }
    };
    fetchBanks();
  }, []);

  // Verify Account Number
  useEffect(() => {
    const verifyAccount = async () => {
      if (bankForm.accountNumber.length === 10 && bankForm.bankCode) {
        setVerifying(true);
        try {
          const res = await fetch(`https://api.paystack.co/bank/resolve?account_number=${bankForm.accountNumber}&bank_code=${bankForm.bankCode}`, {
            headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY}` }
          });
          const data = await res.json();
          if (data.status) {
            setBankForm(prev => ({ ...prev, accountName: data.data.account_name }));
          } else {
            alert("Could not resolve account name. Please check details.");
          }
        } catch (err) {
          console.error("Verification failed", err);
        } finally {
          setVerifying(false);
        }
      }
    };
    verifyAccount();
  }, [bankForm.accountNumber, bankForm.bankCode]);

  useEffect(() => {
    const fetchWalletData = async () => {
      if (!user || !role) return;
      setLoading(true);
      try {
        // Calculate balance from orders
        const ordersQ = query(
          collection(db, "orders"),
          where("sellerId", "==", user.uid)
        );
        const ordersSnap = await getDocs(ordersQ);
        
        let available = 0;
        let pending = 0;
        
        ordersSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.status === "Delivered" || data.status === "Completed") {
            available += data.totalAmount || 0;
          } else if (data.status !== "Cancelled") {
            pending += data.totalAmount || 0;
          }
        });

        // Subtract previous payouts from payoutRequests
        let paidOut = 0;
        try {
          const payoutsQ = query(
            collection(db, "payoutRequests"),
            where("userId", "==", user.uid)
          );
          const payoutsSnap = await getDocs(payoutsQ);
          
          const fetchedPayouts: any[] = payoutsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          fetchedPayouts.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
          setPayoutHistory(fetchedPayouts);

          fetchedPayouts.forEach(po => {
            if (po.status !== "Failed" && po.status !== "Cancelled") {
               paidOut += po.amount || 0;
            }
          });
        } catch (poError) {
          console.warn("Payout fetch error:", poError);
        }

        setBalance({ 
          available: available - paidOut, 
          pending, 
          total: available + pending 
        });

        // Fetch bank details
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().bankDetails) {
          setBankDetails(userDoc.data().bankDetails);
          setBankForm(userDoc.data().bankDetails);
        }
      } catch (error) {
        console.error("Wallet fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWalletData();
  }, [user, role]);

  const handleWithdrawalRequest = async () => {
    if (!bankDetails) {
       alert("Please add a bank account first");
       return;
    }
    if (balance.available <= 0) {
       alert("No funds available for withdrawal");
       return;
    }

    setSubmitting(true);
    try {
      const newRequest = {
        userId: user?.uid,
        userName: user?.displayName,
        userEmail: user?.email,
        amount: balance.available,
        status: "Pending",
        bankDetails: bankDetails,
        createdAt: Timestamp.now()
      };
      const docRef = await addDoc(collection(db, "payoutRequests"), newRequest);
      setPayoutHistory(prev => [{ id: docRef.id, ...newRequest }, ...prev]);
      setBalance(prev => ({ ...prev, available: 0 }));
      alert("Withdrawal request submitted successfully!");
      setShowWithdrawModal(false);
    } catch (error) {
      console.error("Error requesting withdrawal:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        bankDetails: bankForm,
        bankDetailsUpdatedAt: Timestamp.now()
      }, { merge: true });
      
      setBankDetails(bankForm);
      setShowBankModal(false);
    } catch (error) {
      console.error("Error saving bank details:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || (role !== "MANUFACTURER" && role !== "WHOLESALER" && role !== "ADMIN")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
        <p className="text-muted-foreground mb-6">Wallet and payout management is available for sellers processing orders.</p>
        <Link href="/dashboard" className="px-6 py-2 bg-primary text-white rounded-xl font-bold">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Wallet & Payouts</h1>
          <p className="text-muted-foreground">Manage your earnings, bank accounts, and withdrawals</p>
        </div>
        <button 
          onClick={() => setShowWithdrawModal(true)}
          disabled={balance.available <= 0 || !bankDetails}
          className="px-6 py-3 bg-primary text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:grayscale"
        >
          <ArrowUpRight size={20} /> Request Withdrawal
        </button>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Balance Card */}
        <div className="lg:col-span-2">
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="relative rounded-[2.5rem] p-8 md:p-12 overflow-hidden h-full flex flex-col justify-center bg-slate-900 border border-white/10 shadow-2xl group"
           >
              {/* Decorative Elements */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-[100px] group-hover:bg-primary/30 transition-colors" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent/10 rounded-full blur-[100px]" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-10">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Capital Ledger</p>
                      <h3 className="text-white text-xl font-bold flex items-center gap-2">
                        {(user?.displayName || "Merchant Node").toUpperCase()}
                        <ShieldCheck size={16} className="text-primary" />
                      </h3>
                   </div>
                   <div className="w-12 h-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center">
                      <Zap size={24} className="text-primary" />
                   </div>
                </div>

                <div className="mb-12">
                   <p className="font-bold text-white/40 uppercase tracking-widest mb-2 text-[10px] flex items-center gap-2">
                     <Wallet size={14} className="text-primary" /> Available for Settlement
                   </p>
                   <div className="flex items-baseline gap-2">
                      <span className="text-3xl md:text-4xl text-white/50 font-light">₦</span>
                      <h2 className="text-5xl md:text-8xl font-black tracking-tighter text-white">
                        {balance.available.toLocaleString()}
                      </h2>
                   </div>
                </div>
                
                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                       <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                       <p className="text-[9px] text-white/40 font-black uppercase tracking-widest">In Escrow (Pending)</p>
                    </div>
                    <p className="font-black text-xl md:text-2xl text-white">₦{balance.pending.toLocaleString()}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                       <div className="w-2 h-2 rounded-full bg-primary" />
                       <p className="text-[9px] text-white/40 font-black uppercase tracking-widest">Lifetime Volume</p>
                    </div>
                    <p className="font-black text-xl md:text-2xl text-white/80">₦{balance.total.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Card Footer Decoration */}
              <div className="absolute bottom-6 right-8 flex gap-1 opacity-20">
                 {[...Array(4)].map((_, i) => (
                   <div key={i} className="w-8 h-1 bg-white rounded-full" />
                 ))}
              </div>
           </motion.div>
        </div>


        {/* Bank Account Info */}
        <div className="lg:col-span-1">
           <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             className="glass rounded-[2.5rem] p-8 border border-borderline h-full flex flex-col justify-between"
           >
              <div>
                 <h3 className="text-xl font-bold mb-8">Payout Method</h3>
                 
                 {bankDetails ? (
                   <div className="p-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-primary/20 relative group">
                      <div className="flex items-center gap-4 mb-4">
                         <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center">
                            <Building size={24} />
                         </div>
                         <div>
                            <p className="font-black text-sm">{bankDetails.bankName}</p>
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Connected Account</p>
                         </div>
                      </div>
                      <div className="space-y-4 pt-4 border-t border-borderline/30">
                         <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Account Holder</p>
                            <p className="font-bold text-sm uppercase">{bankDetails.accountName}</p>
                         </div>
                         <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Account Number</p>
                            <p className="font-mono font-bold text-primary">{bankDetails.accountNumber.replace(/.(?=.{4})/g, '*')}</p>
                         </div>
                      </div>
                   </div>
                 ) : (
                   <div className="p-6 rounded-2xl bg-orange-500/5 border border-orange-500/20 relative group flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center mb-4">
                        <AlertCircle size={32} />
                      </div>
                      <h4 className="font-black text-sm mb-2">No Bank Account Linked</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        You need to connect a bank account to receive your payouts from sales.
                      </p>
                   </div>
                 )}
              </div>

              <button 
                onClick={() => setShowBankModal(true)}
                className="w-full mt-8 py-5 bg-muted/50 text-foreground rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-muted transition-all border-2 border-borderline border-dashed hover:border-primary/30"
              >
                {bankDetails ? "Update Bank Account" : "+ Connect Bank Account"}
              </button>
           </motion.div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="glass rounded-[3rem] p-10 border border-borderline">
         <div className="flex justify-between items-center mb-10">
           <h3 className="text-2xl font-black flex items-center gap-3">
             <History size={24} className="text-primary" /> Wallet Activity
           </h3>
         </div>
         
         {loading ? (
            <div className="py-20 flex flex-col items-center">
               <Loader2 className="animate-spin text-primary mb-4" size={40} />
               <p className="text-muted-foreground font-medium">Syncing Ledger...</p>
            </div>
         ) : payoutHistory.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-borderline rounded-[2.5rem] bg-white/5 dark:bg-slate-900/5">
                <div className="w-20 h-20 bg-muted rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                   <TrendingUp size={32} className="text-muted-foreground opacity-30" />
                </div>
                <h4 className="text-xl font-black mb-2">Ledger is Empty</h4>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto font-medium">
                  Once you start making sales and receiving payouts, your activity history will appear here.
                </p>
            </div>
         ) : (
            <div className="space-y-4">
              {payoutHistory.map(tx => (
                <div key={tx.id} className="p-6 glass rounded-3xl border border-borderline flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-primary/20 transition-all">
                   <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                         tx.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' : 
                         tx.status === 'Pending' ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                         {tx.status === 'Approved' ? <CheckCircle2 size={24} /> : 
                          tx.status === 'Pending' ? <Clock size={24} /> : <AlertCircle size={24} />}
                      </div>
                      <div>
                         <p className="font-bold text-lg leading-none mb-1">Withdrawal Request</p>
                         <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-2">
                           <Building size={10} /> {tx.bankDetails?.bankName} (***{tx.bankDetails?.accountNumber?.slice(-4)})
                         </p>
                      </div>
                   </div>
                   
                   <div className="text-left sm:text-right">
                      <p className="text-xl font-black mb-1">₦{tx.amount?.toLocaleString()}</p>
                      <div className="flex items-center gap-2 text-xs font-bold sm:justify-end">
                         <span className={`px-2 py-0.5 rounded-md text-[9px] uppercase tracking-widest ${
                            tx.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' : 
                            tx.status === 'Pending' ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500'
                         }`}>
                           {tx.status}
                         </span>
                         <span className="text-muted-foreground opacity-50">
                           {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString() : 'Just now'}
                         </span>
                      </div>
                   </div>
                </div>
              ))}
            </div>
         )}
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {showBankModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowBankModal(false)}
               className="absolute inset-0 bg-black/60 backdrop-blur-md"
             />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="glass w-full max-w-md p-10 rounded-[3.5rem] border border-borderline relative z-10"
             >
                <div className="flex justify-between items-center mb-10">
                   <h3 className="text-2xl font-black">Bank Settings</h3>
                   <button onClick={() => setShowBankModal(false)} className="p-2 hover:bg-muted rounded-xl"><X size={20} /></button>
                </div>
                <form onSubmit={handleSaveBank} className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Bank</label>
                       <select 
                         required
                         value={bankForm.bankCode}
                         onChange={(e) => {
                           const selected = banks.find(b => b.code === e.target.value);
                           setBankForm({...bankForm, bankCode: e.target.value, bankName: selected?.name || ""});
                         }}
                         className="w-full px-6 py-4 rounded-2xl glass border border-borderline focus:border-primary outline-none appearance-none bg-transparent"
                       >
                          <option value="">Choose your bank...</option>
                          {banks.map(bank => (
                            <option key={bank.id} value={bank.code}>{bank.name}</option>
                          ))}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Account Number</label>
                       <div className="relative">
                          <input 
                            required
                            value={bankForm.accountNumber}
                            onChange={(e) => setBankForm({...bankForm, accountNumber: e.target.value})}
                            className="w-full px-6 py-4 rounded-2xl glass border border-borderline focus:border-primary outline-none"
                            placeholder="10 Digits"
                            maxLength={10}
                          />
                          {verifying && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                               <Loader2 className="animate-spin text-primary" size={18} />
                            </div>
                          )}
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Account Name</label>
                       <input 
                         required
                         readOnly
                         value={bankForm.accountName}
                         className="w-full px-6 py-4 rounded-2xl glass border border-borderline bg-muted/50 cursor-not-allowed outline-none font-bold"
                         placeholder="Auto-resolved from account number"
                       />
                       <p className="text-[9px] text-muted-foreground italic ml-1">* Resolved via Paystack Security</p>
                    </div>
                    <button disabled={submitting || !bankForm.accountName || verifying} type="submit" className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50">
                       {submitting ? <Loader2 className="animate-spin" /> : "Verify & Save Identity"}
                    </button>
                 </form>
             </motion.div>
          </div>
        )}

        {showWithdrawModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowWithdrawModal(false)}
               className="absolute inset-0 bg-black/60 backdrop-blur-md"
             />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="glass w-full max-w-md p-10 rounded-[3.5rem] border border-borderline relative z-10 text-center"
             >
                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                   <ArrowUpRight size={40} />
                </div>
                <h3 className="text-3xl font-black mb-4">Payout Request</h3>
                <p className="text-muted-foreground mb-10 leading-relaxed font-medium">
                   You are requesting to withdraw <span className="text-primary font-black">₦{balance.available.toLocaleString()}</span> to your connected account at <br/><span className="text-foreground font-bold">{bankDetails?.bankName}</span>.
                </p>

                <div className="space-y-4">
                   <button 
                     onClick={handleWithdrawalRequest}
                     disabled={submitting}
                     className="w-full py-5 bg-primary text-white rounded-2xl font-black text-xl hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-primary/20 flex items-center justify-center gap-2"
                   >
                      {submitting ? <Loader2 className="animate-spin" /> : "Confirm & Send"}
                   </button>
                   <button 
                     onClick={() => setShowWithdrawModal(false)}
                     className="w-full py-4 glass border-borderline rounded-2xl font-bold hover:bg-muted transition-all"
                   >
                      Cancel
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
