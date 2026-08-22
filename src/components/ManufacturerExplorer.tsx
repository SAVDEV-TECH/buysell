"use client";

import { Search, Filter, MapPin, Calendar, Users, MessageSquare, ArrowRight, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import BuySellLoader from "@/components/BuySellLoader";

export interface Manufacturer {
  id: string;
  name: string;
  isVerified: boolean;
  location: string;
  yearEstablished: string;
  employees: string;
  industry: string;
  responseRate: string;
  description: string;
}

const INDUSTRIES = ["All Industries", "Electronics", "Fashion", "Agriculture", "Construction", "Chemicals", "Food & Beverage"];

export default function ManufacturerExplorer() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeIndustry, setActiveIndustry] = useState("All Industries");
  const [showFilters, setShowFilters] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchManufacturers = async () => {
      setLoading(true);
      try {
        setError(null);
        const { data, error } = await supabase
          .from("organizations")
          .select("*")
          .eq("organization_type", "supplier");

        if (error) throw error;

        const formatted = (data || []).map((org: any) => ({
          id: org.id,
          name: org.company_name,
          isVerified: org.verification_level === "verified",
          location: org.country_code || "Global",
          yearEstablished: "2020",
          employees: "50-100",
          industry: org.kyb_data?.industry || "Industrial",
          responseRate: "98%",
          description: "Verified global manufacturer operating on BuySell B2B network.",
        }));

        setManufacturers(formatted);
      } catch (err: any) {
        console.error("Error fetching manufacturers:", err);
        setError("Failed to load manufacturers.");
      } finally {
        setLoading(false);
      }
    };

    fetchManufacturers();
  }, [supabase]);

  const displayedManufacturers = manufacturers.filter((mfg) => {
    const matchesSearch = mfg.name.toLowerCase().includes(search.toLowerCase()) || 
                          mfg.description.toLowerCase().includes(search.toLowerCase());
    const matchesIndustry = activeIndustry === "All Industries" || mfg.industry === activeIndustry;
    
    return matchesSearch && matchesIndustry;
  });

  return (
    <div className="min-h-screen bg-background pt-10 pb-24 text-foreground">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="mb-10 text-center max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-3">
            Manufacturer Directory
          </h1>
          <p className="text-base text-muted-foreground">
            Discover, verify, and connect directly with verified suppliers on the BuySell B2B network.
          </p>
        </div>

        {/* ── Sticky Top Search & Filter Bar ── */}
        <div className="sticky top-[64px] z-30 bg-background/95 backdrop-blur-md pt-2 pb-4 mb-8 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-border shadow-sm transition-all">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search for companies, products, or keywords..."
                className="w-full pl-11 pr-10 py-3 bg-card rounded-xl border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm text-foreground shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`h-11 px-5 rounded-xl transition-all border flex items-center justify-center gap-2 font-bold text-xs sm:text-sm shadow-sm whitespace-nowrap ${
                showFilters 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'bg-card border-border hover:bg-muted text-foreground'
              }`}
            >
              <Filter size={15} />
              <span>Filters</span>
              {activeIndustry !== "All Industries" && (
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              )}
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-3"
              >
                <div className="bg-card text-card-foreground p-5 rounded-xl border border-border shadow-sm">
                   <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Industry</h4>
                   <div className="flex flex-wrap gap-2">
                     {INDUSTRIES.map(industry => (
                       <button
                         key={industry}
                         onClick={() => setActiveIndustry(industry)}
                         className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                           activeIndustry === industry 
                             ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                             : 'bg-background border-border hover:bg-muted text-muted-foreground hover:text-foreground'
                         }`}
                       >
                         {industry}
                       </button>
                     ))}
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {loading ? (
          <BuySellLoader message="Searching BuySell verified manufacturers..." fullScreen={false} />
        ) : error ? (
          <div className="py-32 text-center bg-card rounded-lg border border-dashed border-red-200 px-6">
            <h3 className="text-2xl font-bold mb-2 text-red-600">Access Issue</h3>
            <p className="text-muted-foreground">{error}</p>
          </div>
        ) : displayedManufacturers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {displayedManufacturers.map((mfg, i) => (
              <motion.div 
                key={mfg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl border border-border p-6 flex flex-col group hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600/10 to-orange-500/10 dark:from-blue-600/20 dark:to-orange-500/20 border border-border flex items-center justify-center font-black text-lg text-primary flex-shrink-0">
                      {mfg.name ? mfg.name.charAt(0).toUpperCase() : "B"}
                    </div>
                    <div>
                      <Link href={`/manufacturers/${mfg.id}`} className="hover:text-primary transition-colors">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          {mfg.name}
                          {mfg.isVerified && <VerifiedBadge />}
                        </h3>
                      </Link>
                      <div className="flex flex-wrap gap-2 mt-2">
                         <span className="bg-secondary text-secondary-foreground text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded">
                           {mfg.industry}
                         </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                      {mfg.responseRate} Response
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-6 line-clamp-2 leading-relaxed">
                  {mfg.description}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-primary/70" />
                    <span>{mfg.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-primary/70" />
                    <span>Est. {mfg.yearEstablished}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-primary/70" />
                    <span>{mfg.employees} Employees</span>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-border flex gap-3">
                  <button className="flex-1 bg-primary text-primary-foreground h-10 rounded-md font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
                    <MessageSquare size={16} /> Contact Supplier
                  </button>
                  <Link href={`/manufacturers/${mfg.id}`} className="flex-1 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-colors">
                    View Profile <ArrowRight size={16} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-32 text-center bg-card rounded-lg border border-dashed border-border px-6">
            <h3 className="text-2xl font-bold mb-2">No Manufacturers Found</h3>
            <p className="text-muted-foreground font-medium">Try adjusting your industry filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
