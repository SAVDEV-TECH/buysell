"use client";

import { useState } from "react";
import { Sparkles, Building2, ShieldCheck, MapPin, Loader2, ArrowRight, CheckCircle2, Zap } from "lucide-react";

interface SupplierMatch {
  supplierId: string;
  supplierName: string;
  matchScore: number;
  matchRationale: string;
  estimatedLeadDays: number;
}

interface AISupplierMatchmakerProps {
  rfqTitle: string;
  description?: string;
  category?: string;
}

export default function AISupplierMatchmaker({
  rfqTitle,
  description,
  category,
}: AISupplierMatchmakerProps) {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<SupplierMatch[]>([]);
  const [error, setError] = useState("");
  const [hasRun, setHasRun] = useState(false);

  const handleMatchmake = async () => {
    if (!rfqTitle) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai/matchmaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfqTitle, description, category }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Matchmaking failed.");
      }

      setMatches(data.data || []);
      setHasRun(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-3xl border border-primary/20 p-6 space-y-4 bg-gradient-to-br from-primary/5 via-purple-500/5 to-transparent">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-primary/20 text-primary">
            <Zap size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight flex items-center gap-2">
              AI Supplier Matchmaker
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase">
                GPT-4 Vision & Trade Graph
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">Automatically pair your RFQ with top verified manufacturers</p>
          </div>
        </div>

        <button
          onClick={handleMatchmake}
          disabled={loading || !rfqTitle}
          className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 hover:scale-105 transition-all flex items-center gap-1.5 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Matching…
            </>
          ) : (
            <>
              <Sparkles size={14} /> Find Matches
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="text-xs font-semibold text-rose-500 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
          {error}
        </p>
      )}

      {/* Results List */}
      {hasRun && (
        <div className="space-y-3 pt-2">
          {matches.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No matching suppliers found for this specific RFQ criteria.
            </p>
          ) : (
            matches.map((m, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-primary/40 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                      <Building2 size={15} className="text-primary" /> {m.supplierName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase flex items-center gap-1">
                      <ShieldCheck size={12} /> {m.matchScore}% Match
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {m.matchRationale}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground pt-0.5">
                    <span>Est. Lead Time: {m.estimatedLeadDays} days</span>
                  </div>
                </div>

                <a
                  href={`/marketplace`}
                  className="px-4 py-2 rounded-xl bg-muted text-xs font-bold text-foreground hover:bg-primary hover:text-white transition-all flex items-center gap-1 self-start sm:self-center"
                >
                  Send Direct Inquiry <ArrowRight size={12} />
                </a>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
