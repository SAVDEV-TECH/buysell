"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { 
  BarChart, 
  TrendingUp, 
  Users, 
  Activity, 
  DollarSign, 
  ArrowUpRight,
  TrendingDown,
  Download,
  Loader2,
  Calendar,
  ShoppingBag
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function AnalyticsPage() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({
    revenue: 0,
    customers: new Set(),
    avgOrder: 0,
    conversions: 3.2 // Hardcoded mock
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user || !role) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, "orders"),
          where("sellerId", "==", user.uid)
        );
        const snap = await getDocs(q);
        const fetchedOrders: any[] = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setOrders(fetchedOrders);

        let rev = 0;
        const custs = new Set();
        fetchedOrders.forEach((o: any) => {
          rev += (o.totalAmount || 0);
          if (o.userId) custs.add(o.userId);
        });

        setStats({
          revenue: rev,
          customers: custs,
          avgOrder: fetchedOrders.length > 0 ? (rev / fetchedOrders.length) : 0,
          conversions: 3.2
        });
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [user, role]);

  const handleExport = () => {
    const headers = ["Order ID", "Date", "Customer", "Amount", "Status", "Items"];
    const rows = orders.map(o => [
      o.id,
      o.createdAt?.toDate().toLocaleDateString() || "N/A",
      o.customerName || "Platform User",
      o.totalAmount || 0,
      o.status,
      o.items?.map((i: any) => `${i.name} (x${i.quantity})`).join("; ")
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `BuySell_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!user || (role !== "MANUFACTURER" && role !== "WHOLESALER" && role !== "ADMIN")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
        <p className="text-muted-foreground mb-6">This section is for sellers to review their business performance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div>
            <h1 className="text-3xl font-black">Business Intelligence</h1>
            <p className="text-muted-foreground font-medium italic">Scanning global commerce telemetry for node {user?.uid.slice(0, 8)}</p>
         </div>
         <button 
           onClick={handleExport}
           className="px-8 py-4 bg-primary text-white rounded-2xl font-black flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20"
         >
           <Download size={20} /> Export Aggregate Ledger
         </button>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Aggregate Revenue", value: "₦" + stats.revenue.toLocaleString(), icon: DollarSign, trend: "+12.5%", positive: true, bg: "bg-emerald-500/10", color: "text-emerald-500" },
          { label: "Active Channels", value: stats.customers.size, icon: Users, trend: "+5.2%", positive: true, bg: "bg-blue-500/10", color: "text-blue-500" },
          { label: "Conversion Rate", value: stats.conversions + "%", icon: Activity, trend: "-1.1%", positive: false, bg: "bg-purple-500/10", color: "text-purple-500" },
          { label: "Avg Node Value", value: "₦" + Math.round(stats.avgOrder).toLocaleString(), icon: BarChart, trend: "+8.4%", positive: true, bg: "bg-orange-500/10", color: "text-orange-500" }
        ].map((kpi, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-8 rounded-[2.5rem] border border-borderline relative overflow-hidden group hover:bg-white/40 transition-all cursor-crosshair"
          >
             <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${kpi.bg}`}>
                   <kpi.icon size={28} className={kpi.color} />
                </div>
                <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest flex items-center gap-1 uppercase ${
                  kpi.positive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                }`}>
                  {kpi.positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {kpi.trend}
                </div>
             </div>
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">{kpi.label}</p>
             <h3 className="text-3xl font-black tracking-tight">{kpi.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Placeholder for Data Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass rounded-[2.5rem] p-8 border border-borderline">
           <div className="flex justify-between items-center mb-8">
             <h3 className="text-xl font-bold">Revenue Overview (Mock)</h3>
             <select className="bg-muted/50 border-none outline-none text-sm font-bold p-2 text-muted-foreground rounded-lg">
               <option>Last 30 Days</option>
               <option>This Year</option>
             </select>
           </div>
           
           <div className="aspect-[2/1] bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-borderline border-dashed flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <BarChart size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-medium">Chart Visualization Coming Soon</p>
                <p className="text-xs">Once enough live data is aggregated.</p>
              </div>
           </div>
        </div>

        <div className="glass rounded-[2.5rem] p-8 border border-borderline flex flex-col h-full">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
               <Activity size={24} className="text-primary" /> Recent Conversions
            </h3>
            <div className="space-y-4 flex-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 opacity-30 italic">
                   <Loader2 className="animate-spin mb-2" size={24} />
                   <span>Retrieving ledger records...</span>
                </div>
              ) : orders.slice(0, 5).map((order, i) => (
                <div key={i} className="p-5 rounded-2xl bg-white/20 dark:bg-slate-900/20 hover:bg-white/40 transition-all group flex items-center gap-4 border border-borderline/10">
                  <div className="w-12 h-12 rounded-[1rem] bg-primary/10 text-primary font-black flex items-center justify-center shrink-0">
                    <ShoppingBag size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                     <p className="font-black truncate text-sm">₦{order.totalAmount?.toLocaleString()}</p>
                     <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{order.customerName || "Platform Client"}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{order.status}</p>
                     <p className="text-[9px] font-black uppercase tracking-widest text-primary mt-1">{order.id.slice(0, 5)}</p>
                  </div>
                </div>
              ))}
              {orders.length === 0 && !loading && (
                <div className="py-20 text-center opacity-30 italic">No business cycles recorded yet.</div>
              )}
            </div>
            <Link href="/dashboard/orders" className="w-full mt-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2">
              Full Transaction Log <ArrowUpRight size={16} />
            </Link>
         </div>
      </div>
    </div>
  );
}
