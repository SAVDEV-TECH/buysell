"use client";

import { useAuth } from "@/context/AuthContext";
import { 
  Users, 
  UserPlus, 
  Shield, 
  MoreVertical,
  Mail,
  Clock
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function TeamPage() {
  const { role } = useAuth();
  
  if (role !== "MANUFACTURER" && role !== "WHOLESALER" && role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
        <p className="text-muted-foreground mb-6">Team management is reserved for verified business accounts.</p>
        <Link href="/dashboard" className="px-6 py-2 bg-primary text-white rounded-xl font-bold">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">Invite staff members and manage permissions</p>
        </div>
        <button className="px-6 py-3 bg-primary text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
          <UserPlus size={20} /> Invite Member
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Team List */}
        <div className="lg:col-span-2 space-y-6">
           <div className="glass rounded-[2rem] p-6 lg:p-8 border border-borderline">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Users size={20} className="text-primary" /> Active Members
              </h3>
              
              <div className="space-y-4">
                 {[
                   { name: "You (Admin)", email: "admin@store.com", role: "Owner", active: true },
                 ].map((member, i) => (
                   <div key={i} className="group flex items-center justify-between p-4 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold shadow-sm">
                           {member.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <span className="px-3 py-1 bg-primary text-white text-[10px] font-bold uppercase rounded-full tracking-wider">
                          {member.role}
                        </span>
                        <button className="p-2 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical size={16} />
                        </button>
                     </div>
                   </div>
                 ))}

                 {/* Invite Placeholder */}
                 <div className="py-12 text-center border-2 border-dashed border-borderline rounded-2xl mt-4 bg-muted/20">
                    <UserPlus size={32} className="mx-auto text-muted-foreground mb-4 opacity-50" />
                    <h4 className="font-bold text-sm mb-1">Build your team</h4>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">
                      Invite staff members to help manage your catalog, process orders, and handle customer support.
                    </p>
                    <button className="px-4 py-2 border border-borderline rounded-xl font-bold text-xs hover:bg-muted/50 transition-colors">
                      Send Invitation
                    </button>
                 </div>
              </div>
           </div>
        </div>

        {/* Roles & Permissions Info */}
        <div className="lg:col-span-1">
           <div className="glass rounded-[2rem] p-6 lg:p-8 border border-borderline h-full">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                 <Shield size={20} className="text-primary" /> Roles
              </h3>
              
              <div className="space-y-6">
                 <div>
                   <h4 className="font-bold text-sm mb-1">Owner</h4>
                   <p className="text-xs text-muted-foreground leading-relaxed">
                     Full access to all store settings, financial data, team management, and catalog operations.
                   </p>
                 </div>
                 
                 <div className="pt-4 border-t border-borderline/50">
                   <h4 className="font-bold text-sm mb-1 flex justify-between">
                     Manager <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">Pro</span>
                   </h4>
                   <p className="text-xs text-muted-foreground leading-relaxed">
                     Can manage orders, update product records, and chat with customers. Cannot modify bank details.
                   </p>
                 </div>
                 
                 <div className="pt-4 border-t border-borderline/50">
                   <h4 className="font-bold text-sm mb-1 flex justify-between">
                     Staff <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">Pro</span>
                   </h4>
                   <p className="text-xs text-muted-foreground leading-relaxed">
                     Restricted access. Can only fulfill orders and update tracking status. No direct financial access.
                   </p>
                 </div>
              </div>

              <div className="mt-8 p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl border border-primary/20 relative overflow-hidden group hover:scale-[1.02] cursor-pointer transition-transform">
                 <h4 className="font-extrabold text-sm mb-1">Upgrade Tier</h4>
                 <p className="text-xs text-muted-foreground mb-3">
                   Unlock custom roles and add unlimited staff members.
                 </p>
                 <button className="w-full py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-sm">
                   View Plans
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
