"use client";

import { useState } from "react";
import { 
  Ticket, 
  Plus, 
  Zap, 
  CheckCircle2, 
  MousePointer2,
  ChevronRight
} from "lucide-react";

export default function PromotionsPage() {
  const [coupons] = useState<any[]>([]);

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
         <div>
            <h1 className="text-3xl font-black flex items-center gap-3 uppercase">
               Promotions <span className="text-primary">& Coupons</span>
            </h1>
            <p className="text-muted-foreground font-medium">Engineer specialized discount nodes for your clients in PostgreSQL.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         <div className="lg:col-span-2 space-y-6">
            <div className="glass p-10 rounded-[3.5rem] border border-borderline min-h-[500px] relative overflow-hidden">
               <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-10 flex items-center gap-2">
                     <Zap size={20} className="text-primary fill-primary" /> Active Discount Matrix
                  </h3>
                  <div className="py-20 text-center text-muted-foreground italic font-medium opacity-50">No promotional nodes active on this seller ID.</div>
               </div>
            </div>
         </div>

         <div className="lg:col-span-1 space-y-6">
            <div className="glass p-8 rounded-[3rem] border border-borderline h-full flex flex-col justify-between">
               <div>
                  <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                     <MousePointer2 className="text-primary" size={20} /> Promo Intelligence
                  </h3>
               </div>
               <div className="mt-10 p-6 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                     <CheckCircle2 size={16} /> Systems Nominal
                  </p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
