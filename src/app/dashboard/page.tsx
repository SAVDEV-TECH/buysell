"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
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
  FileText,
  Rocket,
  Store,
  ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function DashboardOverview() {
  const { user, profile, role, organizationId, verificationLevel, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([
    { label: "Total Orders", value: "0", icon: ShoppingBag, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Revenue", value: "$0", icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Products", value: "0", icon: Package, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Growth", value: "0%", icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-500/10" },
  ]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (authLoading || !user) return;
      
      setLoading(true);
      try {
        let ordersCount = 0;
        let totalRev = 0;
        let dbOrders: any[] = [];
        let fetchedOrders: any[] = [];
        
        const orFilter = organizationId
          ? `buyer_organization_id.eq.${organizationId},supplier_organization_id.eq.${organizationId},buyer_organization_id.eq.${user.id},supplier_organization_id.eq.${user.id},buyer_id.eq.${user.id}`
          : `buyer_organization_id.eq.${user.id},supplier_organization_id.eq.${user.id},buyer_id.eq.${user.id}`;

        const { data: ordersData } = await supabase
          .from("orders")
          .select("*")
          .or(orFilter)
          .order("created_at", { ascending: false })
          .limit(10);

        if (!ordersData || ordersData.length === 0) {
          const fallback = await supabase
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(10);
          dbOrders = fallback.data || [];
        } else {
          dbOrders = ordersData || [];
        }

        // Read local storage orders
        let localOrders: any[] = [];
        try {
          const localKey = `buysell_user_orders_${user.id}`;
          localOrders = JSON.parse(localStorage.getItem(localKey) || "[]");
        } catch (localErr) {
          console.warn("[Dashboard] LocalStorage read notice:", localErr);
        }

        const mergedMap = new Map<string, any>();
        localOrders.forEach((o) => mergedMap.set(String(o.id || o.payment_reference), o));
        dbOrders.forEach((o) => mergedMap.set(String(o.id || o.payment_reference), o));

        const allOrders = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );

        ordersCount = allOrders.length;
        fetchedOrders = allOrders.slice(0, 5);
        allOrders.forEach((o: any) => totalRev += (Number(o.total_amount) || 0));

        let productsCount = 0;
        if (organizationId) {
          const { count } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("supplier_organization_id", organizationId);
          productsCount = count || 0;
        }

        const isSeller = role?.startsWith("supplier");

        const newStats = [
          { label: "Total Orders", value: ordersCount.toString(), icon: ShoppingBag, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Wallet Balance", value: "$0.00", icon: CreditCard, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: isSeller ? "Total Revenue" : "Total Spent", value: `$${totalRev.toLocaleString()}`, icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10" },
        ];

        if (isSeller) {
          newStats.push({ label: "Active Items", value: productsCount.toString(), icon: Package, color: "text-purple-500", bg: "bg-purple-500/10" });
        } else {
          newStats.push({ label: "Growth Status", value: "Active Node", icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-500/10" });
        }

        setStats(newStats);
        setRecentOrders(fetchedOrders);
      } catch (error: any) {
        console.error("Critical error in dashboard overview:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role, organizationId, authLoading]);

  return (
    <div className="space-y-10">
      {/* Verification Notice */}
      {verificationLevel && verificationLevel !== "verified" && (
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
          <Link href="/help" className="px-6 py-3 bg-card border border-orange-500/30 text-orange-600 dark:text-orange-400 rounded-xl font-bold text-sm whitespace-nowrap hover:bg-orange-50 transition-all">
            Check Status Details
          </Link>
        </motion.div>
      )}

      {/* ── Supplier Upsell Banner (shown only to buyers with no organization) ── */}
      {!organizationId && !authLoading && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-[2rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6"
          style={{
            background: "linear-gradient(135deg, #1e40af 0%, #7c3aed 60%, #db2777 100%)",
          }}
        >
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white blur-2xl" />
          </div>

          {/* Left: icon + copy */}
          <div className="relative flex items-center gap-5 text-center md:text-left">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0 shadow-lg">
              <Store size={32} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Rocket size={14} className="text-yellow-300" />
                <span className="text-yellow-300 text-xs font-bold uppercase tracking-widest">Become a Supplier</span>
              </div>
              <h3 className="text-white text-lg md:text-xl font-extrabold leading-tight">
                Want to sell on BuySell?
              </h3>
              <p className="text-white/75 text-sm mt-1 max-w-sm">
                Reach thousands of B2B buyers. Set up your business profile in 2 minutes and start listing products today.
              </p>
            </div>
          </div>

          {/* Right: CTA */}
          <div className="relative flex-shrink-0">
            <Link
              href="/onboarding/business"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-primary font-bold text-sm hover:bg-muted/30 hover:scale-105 transition-all shadow-xl shadow-black/20 whitespace-nowrap"
            >
              Set Up Business Profile <ArrowRight size={18} />
            </Link>
          </div>
        </motion.div>
      )}

      {/* Welcome Section */}
      <section>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1 text-foreground">Hello, {profile?.full_name || "User"} 👋</h1>
            <p className="text-muted-foreground text-sm">Welcome to your <span className="text-primary font-bold">{role?.replace("_", " ") || "user"}</span> dashboard</p>
          </div>
          <div className="flex flex-wrap gap-3">
             <Link 
               href="/dashboard/payouts" 
               className="px-4 py-2 bg-card border border-border rounded-xl text-xs font-semibold hover:bg-muted transition-all flex items-center gap-2 text-foreground"
             >
               <CreditCard size={15} /> Payouts
             </Link>
             {role === "super_admin" && (
                <Link 
                  href="/admin" 
                  className="px-4 py-2 bg-foreground text-background rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:opacity-90 transition-all shadow-sm"
                >
                  <ShieldCheck size={15} /> System Console
                </Link>
             )}
             <Link 
               href="/dashboard/new-product" 
               className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-sm"
             >
               <Plus size={15} /> New Item
             </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card p-5 rounded-2xl border border-border shadow-sm relative overflow-hidden group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground">{stat.value}</h2>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 bg-card rounded-2xl p-6 border border-border shadow-sm"
        >
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-foreground">Recent Orders</h2>
            <Link href="/dashboard/orders" className="text-primary text-xs font-bold flex items-center gap-1 hover:underline">
              View All <ChevronRight size={14} />
            </Link>
          </div>

          <div className="space-y-3">
            {recentOrders.length > 0 ? recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3.5 rounded-xl hover:bg-muted transition-all border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                    <Package size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-foreground">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-[11px] text-muted-foreground">{order.currency} {order.total_amount}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xs text-foreground">${(order.total_amount || 0).toLocaleString()}</p>
                  <div className="flex items-center gap-1 justify-end">
                    <Clock size={11} className="text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Recent</span>
                  </div>
                </div>
                <div className="hidden sm:flex ml-4">
                   <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20`}>
                     {order.status || "Pending"}
                   </span>
                </div>
              </div>
            )) : (
              <div className="py-10 text-center text-muted-foreground text-xs">
                 <p>No recent orders found.</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Links */}
        <div className="space-y-6">
           <motion.div 
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col h-full"
           >
              <h2 className="text-lg font-bold text-foreground mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <QuickActionLink title="Custom RFQs" desc="Negotiate bulk prices" icon={<FileText size={16} />} href="/dashboard/rfqs" />
                <QuickActionLink title="Store Settings" desc="Update your business details" icon={<Settings size={16} />} href="/dashboard/settings" />
                <QuickActionLink title="Manage Products" desc="List or update items" icon={<ArrowUpRight size={16} />} href="/dashboard/products" />
                <QuickActionLink title="Help Center" desc="Get support for issues" icon={<ShieldCheck size={16} />} href="/help" />
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
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-all border border-transparent hover:border-border group"
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted text-primary group-hover:scale-105 transition-transform">
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-foreground">{title}</p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
      <ChevronRight size={14} className="ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
