import ProductExplorer from "@/components/ProductExplorer";
import { Package, ShieldCheck, Zap, Globe, Search, ArrowRight } from "lucide-react";

export default function Home() {
  const features = [
    {
      title: "Efficient Sourcing",
      description: "Stop wasting time searching. Find exactly what you need from verified wholesalers in seconds.",
      icon: <Zap className="text-primary" size={24} />,
    },
    {
      title: "Digital Visibility",
      description: "Manufacturers get a dedicated digital storefront to reach wholesalers globally.",
      icon: <Globe className="text-primary" size={24} />,
    },
    {
      title: "Secure Transactions",
      description: "Integrated Paystack payments and order tracking ensure every deal is safe and transparent.",
      icon: <ShieldCheck className="text-primary" size={24} />,
    },
    {
      title: "Bulk Order Management",
      description: "Automated bulk pricing and minimum order quantity management for smarter selling.",
      icon: <Package className="text-primary" size={24} />,
    },
  ];

  return (
    <div className="flex flex-col gap-4 sm:gap-8 pb-20 overflow-x-hidden w-full">
      {/* Hero Section - Search Centric */}
      <section className="relative pt-16 sm:pt-24 pb-8 sm:pb-12 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-10">
           <div className="absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-primary rounded-full blur-[80px] sm:blur-[120px] animate-blob" />
           <div className="absolute top-1/3 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-secondary rounded-full blur-[80px] sm:blur-[120px] animate-blob animation-delay-2000" />
        </div>

        <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest mb-6 border border-primary/20">
            <Zap size={14} className="fill-primary" /> The B2B Commerce Standard
          </div>
           <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-6 tracking-tight leading-[1.0] sm:leading-[1.1]">
            Source Smarter. <br className="hidden sm:block" />
            <span className="gradient-text">Trade Better.</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
            Africa's premier marketplace connecting verified manufacturers with wholesalers in one unified hub.
          </p>
        </div>
      </section>

      {/* Main Product Feed */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 mb-12 sm:mb-20">
        <ProductExplorer limit={6} />
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-16 sm:py-24 lg:py-32 border-t border-border">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4 tracking-tight">Why BuySell?</h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto font-medium">
            We're building the infrastructure that powers the next generation of commerce across the continent.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {features.map((feature, index) => (
            <div key={index} className="solid-card p-6 sm:p-8 rounded-2xl sm:rounded-3xl hover:shadow-lg hover:border-primary/20 transition-all group">
              <div className="mb-6 sm:mb-8 p-4 sm:p-5 bg-gradient-to-br from-primary/10 to-primary/5 dark:bg-slate-900 rounded-2xl w-fit shadow-lg shadow-primary/10 group-hover:shadow-xl group-hover:shadow-primary/20 group-hover:scale-110 transition-all duration-300">
                {feature.icon}
              </div>
              <h3 className="text-lg sm:text-xl font-black mb-3 sm:mb-4 tracking-tight">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed font-medium">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Solution Section */}
      <section className="bg-primary/5 py-16 sm:py-24 border-y border-primary/10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
           <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/></pattern></defs>
              <rect width="100" height="100" fill="url(#grid)" />
           </svg>
        </div>

        <div className="max-w-7xl mx-auto px-6 sm:px-8 flex flex-col lg:flex-row items-center gap-12 sm:gap-16 relative z-10">
          <div className="flex-1 order-2 lg:order-1 text-center lg:text-left">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-6 sm:mb-8 tracking-tighter leading-tight">Simplifying Commerce, <br /><span className="text-primary italic">Connecting</span> Opportunities</h2>
            <div className="space-y-4 sm:space-y-6 text-muted-foreground text-base sm:text-lg font-medium leading-relaxed">
              <p>
                Our platform acts as a central hub where manufacturers upload products in bulk, and wholesalers can easily access inventory at competitive prices.
              </p>
              <p>
                For bulk purchasers, we offer a transparent and fast procurement experience with secure payment integration and real-time order tracking.
              </p>
            </div>
            <div className="mt-10 sm:mt-12 flex justify-center lg:justify-start gap-8">
              <div className="flex flex-col items-center lg:items-start">
                <span className="text-3xl sm:text-4xl font-black text-primary tracking-tighter">24/7</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Global Visibility</span>
              </div>
              <div className="w-px h-12 sm:h-16 bg-primary/20 mx-2" />
              <div className="flex flex-col items-center lg:items-start">
                <span className="text-3xl sm:text-4xl font-black text-primary tracking-tighter">100%</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Secure Escrow</span>
              </div>
            </div>
          </div>
          <div className="flex-1 order-1 lg:order-2 w-full max-w-md lg:max-w-none">
            <div className="relative aspect-video lg:aspect-square xl:aspect-video rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-[0_0_50px_-12px_rgba(79,70,229,0.3)] border-4 sm:border-8 border-white dark:border-slate-800 lg:rotate-2 hover:rotate-0 transition-transform duration-700">
               <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary opacity-30" />
               <div className="absolute inset-0 flex items-center justify-center">
                 <Package size={100} className="text-primary/40 animate-pulse sm:hidden" />
                 <Package size={140} className="text-primary/40 animate-pulse hidden sm:block" />
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] p-8 sm:p-12 md:p-16 lg:p-20 text-center text-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-80 sm:w-96 lg:w-[500px] h-80 sm:h-96 lg:h-[500px] bg-primary/20 rounded-full blur-[100px] sm:blur-[120px] -mr-20 sm:-mr-40 -mt-20 sm:-mt-40 group-hover:bg-primary/30 transition-colors duration-500" />
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-6 sm:mb-8 relative z-10 tracking-tight">Ready to scale?</h2>
          <p className="text-slate-300 max-w-2xl mx-auto mb-10 sm:mb-12 text-base sm:text-lg font-medium relative z-10 leading-relaxed">
            Join the ecosystem of elite manufacturers and fast-growing wholesalers today. Start for free—no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 relative z-10">
            <button className="group/btn px-8 sm:px-12 py-4 sm:py-6 bg-white text-slate-900 rounded-xl sm:rounded-2xl md:rounded-[1.5rem] font-black text-base sm:text-lg hover:scale-105 hover:shadow-2xl transition-all shadow-xl flex items-center justify-center gap-3 w-full sm:w-auto min-h-[48px]">
              Open Account <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
            </button>
            <button className="px-8 sm:px-12 py-4 sm:py-6 border-2 border-white/20 hover:border-white/40 hover:bg-white/10 rounded-xl sm:rounded-2xl md:rounded-[1.5rem] font-black text-base sm:text-lg transition-all backdrop-blur-sm w-full sm:w-auto min-h-[48px]">
              Schedule Demo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
