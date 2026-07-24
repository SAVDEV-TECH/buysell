"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Users, 
  ShoppingBag, 
  DollarSign, 
  CheckCircle2, 
  X, 
  Loader2, 
  ShieldAlert, 
  UserCheck,
  TrendingUp,
  AlertTriangle,
  History,
  Building
} from "lucide-react";
import { motion } from "framer-motion";

export default function AdminDashboard() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, products: 0, volume: 0, pendingPayouts: 0 });
  const [pendingWholesalers, setPendingWholesalers] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchAdminData = async () => {
      if (role !== "super_admin") return;
      setLoading(true);
      try {
        const { count: usersCount } = await supabase.from("users").select("*", { count: "exact", head: true });
        const { count: productsCount } = await supabase.from("products").select("*", { count: "exact", head: true });
        
        setStats({
          users: usersCount || 0,
          products: productsCount || 0,
          volume: 0,
          pendingPayouts: 0
        });

        const { data: orgs } = await supabase
          .from("organizations")
          .select("*")
          .eq("verification_level", "pending");

        setPendingWholesalers(orgs || []);
      } catch (error) {
        console.error("Admin fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [role, supabase]);

  const approveOrg = async (orgId: string) => {
    try {
      // 1. Update organization verification status & active status
      const { error: updateErr } = await supabase
        .from("organizations")
        .update({
          verification_level: "verified",
          is_verified: true,
          is_active: true,
        })
        .eq("id", orgId);

      if (updateErr) throw updateErr;

      // 2. Fetch primary user of this organization to send notification
      const { data: orgUsers } = await supabase
        .from("users")
        .select("id")
        .eq("organization_id", orgId);

      if (orgUsers && orgUsers.length > 0) {
        for (const u of orgUsers) {
          await supabase.from("notifications").insert({
            user_id: u.id,
            title: "🎉 Business Verification Approved!",
            message: "Congratulations! Your business profile and KYB credentials have been verified by admin. You can now list products and receive payouts.",
            type: "VERIFICATION",
            link: "/dashboard",
            read: false,
          });
        }
      }

      setPendingWholesalers((prev) => prev.filter((o) => o.id !== orgId));
      alert("Organization approved successfully!");
    } catch (err: any) {
      console.error("Error approving org:", err);
      alert("Failed to approve organization: " + (err.message || err));
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
         <div>
            <h1 className="text-3xl font-black flex items-center gap-3">
               COMMAND <span className="text-primary tracking-tighter">CENTER</span>
            </h1>
            <p className="text-muted-foreground font-medium">Monitoring platform-wide telemetry & protocols in PostgreSQL.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {[
           { label: "Aggregate Volume", val: "$0.00", icon: <DollarSign />, color: "text-emerald-500" },
           { label: "Active Nodes", val: stats.users, icon: <Users />, color: "text-blue-500" },
           { label: "Total Assets", val: stats.products, icon: <ShoppingBag />, color: "text-purple-500" },
           { label: "Pending Orgs", val: pendingWholesalers.length, icon: <AlertTriangle />, color: "text-orange-500" }
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

      <div className="glass p-10 rounded-[3rem] border border-borderline">
        <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
           <UserCheck size={20} className="text-primary" /> Pending Organization Verifications
        </h3>
        {pendingWholesalers.length === 0 ? (
           <div className="py-20 text-center opacity-30 italic">No pending verifications found.</div>
        ) : (
          pendingWholesalers.map(org => (
            <div key={org.id} className="p-6 rounded-3xl bg-white/40 dark:bg-slate-900/40 border border-borderline flex items-center justify-between gap-6 mb-4">
               <div>
                  <p className="font-black">{org.company_name}</p>
                  <p className="text-xs text-muted-foreground">Reg #: {org.legal_registration_number}</p>
               </div>
               <button 
                 onClick={() => approveOrg(org.id)}
                 className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-all"
               >
                  Approve Organization
               </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
