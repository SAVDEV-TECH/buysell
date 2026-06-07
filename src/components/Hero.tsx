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
          <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-800 mb-8 shadow-sm uppercase tracking-wider">
            <ShieldCheck className="mr-2 h-4 w-4 text-amber-600" /> Verified B2B Sourcing
          </div>
          
          <h1 className="text-5xl font-black tracking-tight sm:text-6xl md:text-7xl lg:text-7xl text-foreground mb-8 leading-[1.0] sm:leading-[1.1]">
            Connect wholesalers with verified manufacturers.
          </h1>
          
          <p className="max-w-2xl text-lg sm:text-xl text-muted-foreground mb-12 leading-relaxed font-medium">
            BuySell is Africa's premier marketplace where wholesalers discover trusted factories, review their work, and connect directly—secure, transparent, and built for scale.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link 
              href="/manufacturers" 
              className="inline-flex items-center justify-center rounded-xl text-base font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 bg-primary text-white hover:bg-primary/90 hover:shadow-lg hover:scale-105 active:scale-95 px-8 py-4 w-full sm:w-auto shadow-lg min-h-[48px]"
            >
              Explore Factories →
            </Link>
            <Link 
              href="/register" 
              className="inline-flex items-center justify-center rounded-xl text-base font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 border-2 border-primary bg-white hover:bg-primary/5 text-primary px-8 py-3.5 w-full sm:w-auto min-h-[48px]"
            >
              List Your Factory
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
