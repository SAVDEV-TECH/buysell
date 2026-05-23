"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, orderBy, doc, getDoc } from "firebase/firestore";
import { 
  ShoppingBag, 
  Users, 
  ArrowUpRight, 
  TrendingUp, 
  Package, 
  DollarSign, 
  CreditCard, 
  Clock,
  ChevronRight,
  Plus,
  Zap,
  Settings,
  ShieldCheck,
  FileText
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function DashboardOverview() {
  const { user, role, isVerified, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([
    { label: "Total Orders", value: "0", icon: ShoppingBag, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Revenue", value: "₦0", icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Products", value: "0", icon: Package, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Growth", value: "0%", icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-500/10" },
  ]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [newManufacturers, setNewManufacturers] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Don't fetch if still loading auth or if no user
      if (authLoading || !user) return;
      
      setLoading(true);
      try {
        // Fetch User Wallet Detail
        let userData = {};
        let walletBalance = 0;
        try {
          console.log("Fetching user doc for:", user.uid);
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          userData = userDocSnap.exists() ? userDocSnap.data() : {};
          walletBalance = (userData as any).wallet || 0;
        } catch (err: any) {
          console.error("Error fetching user doc:", err);
          if (err.code === 'permission-denied') console.error("Permission denied on users/uid");
        }

        // Determine role
        const currentRole = role || (userData as any).role;
        const isSeller = currentRole === "MANUFACTURER";
        const fieldToQuery = isSeller ? "sellerId" : "wholesalerId";
        
        // Query orders
        let ordersCount = 0;
        let totalRev = 0;
        let fetchedOrders: any[] = [];
        
        try {
          console.log(`Querying orders with ${fieldToQuery} == ${user.uid} (Role: ${currentRole})`);
          const ordersQ = query(
            collection(db, "orders"),
            where(fieldToQuery, "==", user.uid)
          );
          const ordersSnap = await getDocs(ordersQ);
          ordersCount = ordersSnap.size;
          
          fetchedOrders = ordersSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

          fetchedOrders.forEach((o: any) => totalRev += (o.totalAmount || 0));
        } catch (err: any) {
          console.error("Error fetching orders:", err);
          if (err.code === 'permission-denied') console.error(`Permission denied on orders query (${fieldToQuery})`);
        }

        // Query products - only for sellers
        let productsCount = 0;
        if (isSeller) {
          try {
            console.log("Querying products for seller:", user.uid);
            const productsQ = query(
              collection(db, "products"),
              where("sellerId", "==", user.uid)
            );
            const productsSnap = await getDocs(productsQ);
            productsCount = productsSnap.size;
          } catch (err: any) {
            console.error("Error fetching products:", err);
            if (err.code === 'permission-denied') console.error("Permission denied on products query");
          }
        }

        const newStats = [
          { label: "Total Orders", value: ordersCount.toString(), icon: ShoppingBag, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Wallet Balance", value: `₦${walletBalance.toLocaleString()}`, icon: CreditCard, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: isSeller ? "Total Revenue" : "Total Spent", value: `₦${totalRev.toLocaleString()}`, icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10" },
        ];

        if (isSeller) {
          newStats.push({ label: "Active Items", value: productsCount.toString(), icon: Package, color: "text-purple-500", bg: "bg-purple-500/10" });
        } else {
          newStats.push({ label: "Growth Status", value: "Active Node", icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-500/10" });
        }

        // Query new manufacturers for wholesalers
        if (!isSeller) {
          try {
            const mfgQ = query(
              collection(db, "users"),
              where("role", "==", "MANUFACTURER"),
              where("isPublic", "==", true),
              limit(3)
            );
            const mfgSnap = await getDocs(mfgQ);
            setNewManufacturers(mfgSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          } catch (err) {
            console.error("Error fetching new manufacturers for dashboard:", err);
          }
        }

        setStats(newStats);
        setRecentOrders(fetchedOrders.slice(0, 5));
      } catch (error: any) {
        console.error("Critical error in dashboard overview:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, role, authLoading]);

  return (
    <div className="space-y-10">
      {/* Verification Notice for Partners */}
      {(role === "MANUFACTURER" || role === "WHOLESALER") && !isVerified && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-[2rem] bg-orange-500/10 border border-orange-500/20 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-orange-600 dark:text-orange-400">Account Verification Pending</h3>
              <p className="text-sm text-muted-foreground max-w-md">Our admins are currently reviewing your credentials. Once verified, you will have full access to platform features and payouts.</p>
            </div>
          </div>
          <Link href="/help" className="px-6 py-3 bg-white dark:bg-slate-900 border border-orange-500/30 text-orange-600 dark:text-orange-400 rounded-xl font-bold text-sm whitespace-nowrap hover:bg-orange-50 transition-all">
            Check Status Details
          </Link>
        </motion.div>
      )}

      {/* Welcome Section */}
      <section>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Hello, {user?.displayName || "User"} 👋</h1>
            <p className="text-muted-foreground">Welcome to your <span className="text-primary font-bold">{role?.toLowerCase() || "user"}</span> dashboard</p>
          </div>
          <div className="flex gap-4">
             <Link 
               href="/dashboard/payouts" 
               className="px-6 py-2.5 glass rounded-xl text-sm font-medium hover:bg-muted/50 transition-all flex items-center gap-2"
             >
               <CreditCard size={18} /> Payouts
             </Link>
             {role === "ADMIN" && (
                <Link 
                  href="/admin/dashboard" 
                  className="px-6 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-xl shadow-black/10"
                >
                  <ShieldCheck size={18} /> System Console
                </Link>
             )}
             {(role === "MANUFACTURER" || role === "ADMIN") && (
               <Link 
                 href="/dashboard/new-product" 
                 className={`px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 ${!isVerified && role === "MANUFACTURER" ? 'opacity-30 pointer-events-none grayscale' : ''}`}
               >
                 <Plus size={18} /> New Item
               </Link>
             )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass p-6 rounded-3xl border border-white/20 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <stat.icon size={64} />
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <p className="text-sm text-muted-foreground mb-1 font-medium">{stat.label}</p>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">{stat.value}</h2>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stat.color === 'text-green-500' ? 'bg-green-500/10' : 'bg-blue-500/10'}`}>
                  {stat.value === '124,000' ? 'Today' : 'Month'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 glass rounded-3xl p-8 border border-white/20 shadow-sm"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Recent Orders</h2>
            <Link href="/dashboard/orders" className="text-primary text-sm font-bold flex items-center hover:underline">
              View All <ChevronRight size={16} />
            </Link>
          </div>

          <div className="space-y-4">
            {recentOrders.length > 0 ? recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-muted/30 transition-all border border-transparent hover:border-borderline/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Package size={20} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="font-bold">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">{order.customerName || "Guest"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">₦{(order.totalAmount || 0).toLocaleString()}</p>
                  <div className="flex items-center gap-1 justify-end">
                    <Clock size={12} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Recent</span>
                  </div>
                </div>
                <div className="hidden sm:flex ml-8">
                   <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                     order.status === 'Completed' || order.status === 'Delivered' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 
                     order.status === 'Processing' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 
                     'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                   }`}>
                     {order.status || "Pending"}
                   </span>
                </div>
              </div>
            )) : (
              <div className="py-12 text-center text-muted-foreground">
                 <p>No recent orders found.</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Links / Next Steps */}
        <div className="space-y-8">
           {/* New Manufacturers for Wholesalers */}
           {role === "WHOLESALER" && newManufacturers.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass rounded-3xl p-6 border border-emerald-500/20 shadow-sm"
              >
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500 italic">Verified Supply Nodes</h3>
                    <Link href="/manufacturers" className="text-[10px] font-bold hover:underline">View All</Link>
                 </div>
                 <div className="space-y-4">
                    {newManufacturers.map(mfg => (
                      <Link key={mfg.id} href={`/manufacturers/${mfg.id}`} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-emerald-500/5 transition-all group border border-transparent hover:border-emerald-500/10">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold group-hover:scale-110 transition-transform">
                          {mfg.businessName?.charAt(0) || mfg.name?.charAt(0) || "M"}
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-xs font-bold truncate">{mfg.businessName || mfg.name}</p>
                           <p className="text-[10px] text-muted-foreground">{mfg.industry || "General Manufacturing"}</p>
                        </div>
                        <ChevronRight size={14} className="text-muted-foreground" />
                      </Link>
                    ))}
                 </div>
              </motion.div>
           )}

           <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass rounded-3xl p-8 border border-white/20 shadow-sm flex flex-col h-full"
           >
              <h2 className="text-xl font-bold mb-6">Quick Actions</h2>
              <div className="space-y-3">
                <QuickActionLink title="Custom RFQs" desc="Negotiate bulk prices" icon={<FileText size={18} />} href="/dashboard/rfqs" />
                <QuickActionLink title="Store Settings" desc="Update your business details" icon={<Settings size={18} />} href="/dashboard/settings" />
                <QuickActionLink title="Manage Products" desc="List or update items" icon={<ArrowUpRight size={18} />} href="/dashboard/products" />
                <QuickActionLink title="Invite Team" desc="Add staff members" icon={<Users size={18} />} href="/dashboard/team" />
                <QuickActionLink title="Help Center" desc="Get support for issues" icon={<ShieldCheck size={18} />} href="/help" />
              </div>

              <div className="mt-auto pt-8">
                 <div className="p-6 bg-gradient-to-br from-primary to-accent rounded-2xl text-white relative overflow-hidden group hover:scale-[1.02] transition-transform shadow-xl shadow-primary/20 cursor-pointer">
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-125 transition-transform">
                      <Zap size={32} />
                    </div>
                    <h3 className="font-extrabold text-lg mb-1">Upgrade to Pro</h3>
                    <p className="text-sm opacity-90 mb-4">Unlimited listings and advanced analytics.</p>
                    <button className="px-4 py-2 bg-white text-primary rounded-lg text-xs font-bold shadow-sm">Get Pro Access</button>
                 </div>
              </div>
           </motion.div>
        </div>
      </div>
    </div>
  );
}



function QuickActionLink({ title, desc, icon, href }: { title: string, desc: string, icon: React.ReactNode, href: string }) {
  return (
    <Link 
      href={href} 
      className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white dark:hover:bg-slate-800 transition-all border border-transparent hover:border-borderline/50 group"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-900 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
      <ChevronRight size={14} className="ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
