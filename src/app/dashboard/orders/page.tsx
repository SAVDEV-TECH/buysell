"use client";

import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, updateDoc, doc } from "firebase/firestore";
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  ChevronRight, 
  Loader2,
  Package,
  Clock,
  CheckCircle,
  Truck,
  Zap
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface Order {
  id: string;
  items: any[];
  totalAmount: number;
  status: "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled";
  customerName: string;
  createdAt: any;
  wholesalerId?: string;
}

export default function OrdersPage() {
  const { user, role } = useAuth();
  const { sendNotification } = useNotifications();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const fieldToQuery = (role === "MANUFACTURER") ? "sellerId" : "wholesalerId";
        
        const q = query(
          collection(db, "orders"), 
          where(fieldToQuery, "==", user.uid)
          // We can add orderBy("createdAt", "desc") if an index exists for it
        );
        
        const querySnapshot = await getDocs(q);
        const fetchedOrders: Order[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];
        
        // Sort in memory to avoid missing Firestore index errors for now
        fetchedOrders.sort((a, b) => {
           const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
           const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
           return timeB - timeA;
        });

        setOrders(fetchedOrders);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user, role]);

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.id.toLowerCase().includes(search.toLowerCase()) || 
      (o.customerName && o.customerName.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = statusFilter === "All" || o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
      
      const updatedOrder = orders.find(o => o.id === orderId);
      if (updatedOrder && updatedOrder.wholesalerId) {
         await sendNotification(
            updatedOrder.wholesalerId,
            "Order Status Updated",
            `Your order #${orderId.slice(0, 8).toUpperCase()} is now ${newStatus}.`,
            "ORDER",
            `/dashboard/orders/${orderId}`
         );
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Delivered": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "Shipped": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Processing": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "Cancelled": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-orange-500/10 text-orange-500 border-orange-500/20"; // Pending
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case "Delivered": return <CheckCircle size={14} />;
      case "Shipped": return <Truck size={14} />;
      case "Processing": return <Package size={14} />;
      default: return <Clock size={14} />;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Orders Management</h1>
          <p className="text-muted-foreground">{role === "WHOLESALER" ? "Track your purchases" : "Track and manage customer orders"}</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: orders.length || "0", color: "text-blue-500" },
          { label: "Pending", value: orders.filter(o => o.status === "Pending").length || "0", color: "text-orange-500" },
          { label: "Processing", value: orders.filter(o => o.status === "Processing").length || "0", color: "text-purple-500" },
          { label: "Completed", value: orders.filter(o => o.status === "Delivered").length || "0", color: "text-green-500" }
        ].map((stat, i) => (
          <div key={i} className="glass p-5 rounded-2xl border border-borderline">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">{stat.label}</p>
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search Bar & Filter Toggle */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input 
            type="text" 
            placeholder="Search by Order ID or Customer..."
            className="w-full pl-12 pr-4 py-4 glass rounded-[2rem] border border-borderline focus:ring-2 focus:ring-primary/50 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`p-4 glass rounded-2xl border transition-all flex items-center gap-2 font-medium ${showFilters ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20' : 'border-borderline hover:bg-muted/50'}`}
        >
          <Filter size={20} /> <span className="hidden sm:inline">Filters</span>
        </button>
      </div>

      {/* Advanced Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="glass p-6 md:p-8 rounded-[2.5rem] border border-primary/20 bg-primary/5 shadow-2xl">
               <div className="flex flex-col gap-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                       <Filter size={12} /> Filter by Status
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {["All", "Pending", "Processing", "Shipped", "Delivered", "Cancelled"].map((status) => (
                        <button 
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                            statusFilter === status 
                              ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105" 
                              : "glass border-borderline hover:border-primary/50"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4 border-t border-borderline/20">
                    <button 
                      onClick={() => { setSearch(""); setStatusFilter("All"); }}
                      className="px-8 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg hover:shadow-red-500/20"
                    >
                      Reset All Filters
                    </button>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Orders List */}
      <div className="glass rounded-[2.5rem] p-4 lg:p-8 border border-borderline">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
             <Loader2 size={40} className="text-primary animate-spin mb-4" />
             <p className="text-muted-foreground font-medium">Loading your orders...</p>
          </div>
        ) : filteredOrders.length > 0 ? (
             <div className="space-y-4">
              <AnimatePresence>
                {filteredOrders.map((order) => (
                  <motion.div 
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="solid-card rounded-2xl p-5 border border-borderline/50 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all group min-w-0"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center border border-borderline shrink-0 group-hover:scale-110 transition-transform">
                          <ShoppingBag size={22} className="text-primary/70" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black uppercase tracking-widest text-primary">#{order.id.slice(0, 8).toUpperCase()}</span>
                            <span className="text-[10px] px-2 py-0.5 bg-muted rounded-full font-bold text-muted-foreground">{new Date(order.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                          </div>
                          <h4 className="font-bold text-lg leading-none truncate mb-1">{order.customerName || "Verified Wholesaler"}</h4>
                          <p className="text-xs text-muted-foreground font-medium italic">{(order.items?.length || 1)} Items in Node</p>
                        </div>
                      </div>

                      {/* Fulfillment Timeline */}
                      <div className="flex-1 max-w-md hidden sm:block">
                         <div className="flex justify-between mb-2">
                            {["Pending", "Processing", "Shipped", "Delivered"].map((status, idx) => {
                               const steps = ["Pending", "Processing", "Shipped", "Delivered"];
                               const currentIdx = steps.indexOf(order.status || "Pending");
                               const isActive = idx <= currentIdx;
                               const isCurrent = idx === currentIdx;
                               return (
                                 <div key={status} className="flex flex-col items-center gap-1">
                                    <div className={`w-3 h-3 rounded-full border-2 transition-all ${isActive ? 'bg-primary border-primary scale-110' : 'border-borderline bg-white'} ${isCurrent ? 'ring-4 ring-primary/20' : ''}`} />
                                    <span className={`text-[8px] font-black uppercase tracking-tighter ${isActive ? 'text-primary' : 'text-muted-foreground/40'}`}>{status}</span>
                                 </div>
                               );
                            })}
                         </div>
                         <div className="h-1 w-full bg-muted rounded-full overflow-hidden relative">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(Math.max(0, ["Pending", "Processing", "Shipped", "Delivered"].indexOf(order.status || "Pending")) / 3) * 100}%` }}
                              className="absolute inset-0 bg-primary"
                            />
                         </div>
                      </div>

                      <div className="flex items-center justify-between lg:justify-end gap-6 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-borderline/30">
                        <div className="text-left lg:text-right">
                          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-0.5">Order Total</p>
                          <p className="text-xl font-black tracking-tighter text-slate-800 dark:text-white">₦{(order.totalAmount || 0).toLocaleString()}</p>
                        </div>

                        <div className="flex items-center gap-3">
                           {(role === "MANUFACTURER" || role === "ADMIN") ? (
                             <div className="flex items-center gap-2">
                                <select 
                                  value={order.status || "Pending"}
                                  onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                  className={`px-4 py-2 rounded-xl border text-xs font-black shadow-sm outline-none cursor-pointer transition-all ${getStatusColor(order.status || "Pending")}`}
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Processing">Processing</option>
                                  <option value="Shipped">Shipped</option>
                                  <option value="Delivered">Delivered</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                                
                                {/* Quick Fulfillment Action */}
                                {order.status === "Pending" && (
                                   <button 
                                     onClick={() => updateOrderStatus(order.id, "Processing")}
                                     className="p-2 bg-primary text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md shadow-primary/20"
                                     title="Start Processing"
                                   >
                                      <Zap size={16} />
                                   </button>
                                )}
                                {order.status === "Processing" && (
                                   <button 
                                     onClick={() => updateOrderStatus(order.id, "Shipped")}
                                     className="p-2 bg-blue-500 text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md shadow-blue-500/20"
                                     title="Mark as Shipped"
                                   >
                                      <Truck size={16} />
                                   </button>
                                )}
                             </div>
                           ) : (
                             <div className={`px-4 py-2 rounded-xl border text-xs font-black flex items-center gap-2 shrink-0 shadow-sm ${getStatusColor(order.status || "Pending")}`}>
                               {getStatusIcon(order.status || "Pending")} {order.status?.toUpperCase() || "PENDING"}
                             </div>
                           )}

                           <Link href={`/dashboard/orders/${order.id}`} className="p-3 glass border-borderline hover:border-primary/50 text-muted-foreground hover:text-primary rounded-xl transition-all shadow-sm">
                             <ChevronRight size={20} />
                           </Link>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              </div>
        ) : (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
               <ShoppingBag size={32} className="text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No orders found</h3>
            <p className="text-muted-foreground">You don&apos;t have any matching orders at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
