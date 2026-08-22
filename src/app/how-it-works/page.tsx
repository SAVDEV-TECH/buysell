"use client";

import { motion } from "framer-motion";
import { 
  ShoppingBag, 
  Truck, 
  ShieldCheck, 
  Building2, 
  Plus, 
  ArrowRight,
  LayoutDashboard,
  CheckCircle2,
  Users,
  TrendingUp,
  Zap
} from "lucide-react";
import Link from "next/link";

const Steps = [
  {
    icon: <Users size={32} className="text-primary" />,
    title: "1. Join the Platform",
    desc: "Register as a Manufacturer or Wholesaler. We verify every business account to ensure a safe and secure B2B environment.",
    color: "bg-primary/10"
  },
  {
    icon: <Building2 size={32} className="text-secondary" />,
    title: "2. List or Discover",
    desc: "Manufacturers list products at bulk prices. Wholesalers discover verified sources and premium goods at best-in-market rates.",
    color: "bg-primary/5"
  },
  {
    icon: <ShoppingBag size={32} className="text-accent" />,
    title: "3. Order & Direct Pay",
    desc: "Add multiple items to your cart or buy directly using our secure Paystack integration. All payments are encrypted and protected.",
    color: "bg-accent/10"
  },
  {
    icon: <Truck size={32} className="text-orange-500" />,
    title: "4. Fast Fulfillment",
    desc: "Once an order is placed, our logistics system coordinates with sellers for immediate dispatch and tracked delivery to your doorstep.",
    color: "bg-orange-500/10"
  }
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen pt-24 pb-20 bg-background overflow-hidden">
      
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mb-24 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-lg bg-primary/20 rounded-full blur-[120px] pointer-events-none -z-10" />
        
        <div className="text-center max-w-3xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-card/50 backdrop-blur-md rounded-full text-primary font-bold text-xs uppercase tracking-widest border border-primary/20 mb-6"
          >
            <Zap size={16} /> Our Process Explained
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black mb-8 leading-tight tracking-tight"
          >
            How BuySell <span className="gradient-text">Empowers</span> Your Business
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground leading-relaxed font-medium"
          >
            We've streamlined the entire B2B and retail experience. From manual seller verification to multi-vendor logistics, every step is built for your growth.
          </motion.p>
        </div>
      </div>

      {/* Steps Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {Steps.map((step, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card p-8 rounded-[2.5rem] border border-border/50 hover:border-primary/50 transition-all hover:-translate-y-2 group relative"
            >
              <div className={`w-16 h-16 ${step.color} rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:rotate-6`}>
                 {step.icon}
              </div>
              <h3 className="text-xl font-bold mb-4">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.desc}
              </p>
              
              {i < Steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 -translate-y-1/2 z-10 opacity-30">
                  <ArrowRight size={24} className="text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Role Comparison */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mb-32">
        <div className="bg-card rounded-[3.5rem] p-8 md:p-16 border border-primary/10 overflow-hidden relative">
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-muted/30 rounded-full blur-[100px] translate-y-1/2 translate-x-1/3 pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-black mb-6">A Platform for <span className="text-primary">Everyone</span></h2>
              <p className="text-muted-foreground mb-10 leading-relaxed font-medium">
                Whether you are a global manufacturer looking to distribute in bulk, or a wholesaler sourcing the latest trends, BuySell provides the tools you need.
              </p>
              
              <div className="space-y-6">
                 {[
                   { title: "For Manufacturers", desc: "Manage bulk listings, tiered pricing, and freight logistics.", icon: <CheckCircle2 className="text-emerald-500" /> },
                   { title: "For Wholesalers", desc: "Source verified products, manage inventory, and grow margins.", icon: <CheckCircle2 className="text-blue-500" /> }
                 ].map((item, i) => (
                   <div key={i} className="flex gap-4">
                      <div className="mt-1">{item.icon}</div>
                      <div>
                        <h4 className="font-bold">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                   </div>
                 ))}
              </div>
            </div>

            <div className="relative">
               <div className="bg-card aspect-square rounded-[3rem] border border-border flex items-center justify-center p-12 overflow-hidden shadow-2xl relative">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent p-12"
                  />
                  <div className="relative z-10 text-center">
                     <LayoutDashboard size={80} className="mx-auto mb-6 text-primary opacity-50" />
                     <h3 className="text-2xl font-black mb-4">Unified Dashboard</h3>
                     <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Control center for all roles</p>
                  </div>
               </div>
               
               {/* Decorative floating elements */}
               <motion.div 
                 animate={{ y: [0, 20, 0] }}
                 transition={{ duration: 4, repeat: Infinity }}
                 className="absolute -top-8 -right-8 bg-card p-6 rounded-2xl border border-primary/20 shadow-xl hidden sm:block"
               >
                  <TrendingUp className="text-emerald-500 mb-2" size={32} />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Growth Analytics</p>
               </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-4xl font-black mb-8 leading-tight">Ready to Scale Your <span className="gradient-text">Business?</span></h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
           <Link href="/register" className="w-full sm:w-auto px-10 py-5 bg-primary text-white rounded-2xl font-black text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20">
             Start Today - Free
           </Link>
           <Link href="/marketplace" className="w-full sm:w-auto px-10 py-5 bg-card border-border font-black text-lg hover:bg-muted transition-all">
             Browse Catalog
           </Link>
        </div>
      </div>

    </div>
  );
}
