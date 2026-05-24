"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";

const Hero = () => {
  return (
    <div className="relative overflow-hidden bg-white min-h-[90vh] flex items-center">
      {/* Background Image with Gradient Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-right bg-no-repeat opacity-40"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2070&auto=format&fit=crop')" }}
      ></div>
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-white via-white/90 to-transparent"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-20 lg:py-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800 mb-8 shadow-sm">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-orange-500" /> Verified B2B sourcing directory
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-[#0f172a] mb-6 leading-[1.1] sm:leading-[1.1]">
            Connect wholesalers with verified manufacturers.
          </h1>
          
          <p className="max-w-2xl text-lg sm:text-xl text-slate-500 mb-10 leading-relaxed font-medium">
            BuySell is a curated directory where wholesalers discover trusted factories, review their work, and message them directly — no orders, no fees, just connections.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link 
              href="/manufacturers" 
              className="inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-[#0f172a] text-white hover:bg-[#0f172a]/90 h-12 px-8 w-full sm:w-auto shadow-sm"
            >
              Find manufacturers
            </Link>
            <Link 
              href="/register" 
              className="inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 h-12 px-8 w-full sm:w-auto shadow-sm"
            >
              List your factory
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
