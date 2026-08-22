"use client";

import { useEffect, useState } from "react";
import { Sparkles, TrendingUp, ShieldAlert, ShieldCheck, CheckCircle2, Loader2, BarChart3 } from "lucide-react";

interface AIQuotationInsightsCardProps {
  orderId: string;
  totalAmount: number;
  currency: string;
  items?: any[];
  status?: string;
}

interface InsightsData {
  fairnessScore: number;
  dealAssessment: string;
  riskLevel: "low" | "medium" | "high";
  KeyInsights: string[];
}

export default function AIQuotationInsightsCard({
  orderId,
  totalAmount,
  currency,
  items,
  status,
}: AIQuotationInsightsCardProps) {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) return;

    const fetchInsights = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/ai/quotation-insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, totalAmount, currency, items, status }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load insights.");
        }

        setInsights(data.data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [orderId, totalAmount, currency, status]);

  if (loading) {
    return (
      <div className="bg-card rounded-3xl border border-border p-6 flex items-center justify-center gap-3">
        <Loader2 size={18} className="text-primary animate-spin" />
        <span className="text-xs font-bold text-muted-foreground">Calculating AI Deal & Risk Telemetry…</span>
      </div>
    );
  }

  if (error || !insights) {
    return null; // Gracefully hide card if telemetry unavailable
  }

  const riskColors = {
    low: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    medium: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    high: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  };

  return (
    <div className="bg-card rounded-3xl border border-primary/20 p-6 space-y-4 bg-gradient-to-br from-primary/5 via-indigo-500/5 to-transparent">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-primary/20 text-primary">
            <BarChart3 size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight flex items-center gap-2">
              AI Deal & Escrow Telemetry
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase flex items-center gap-1">
                <ShieldCheck size={11} /> {insights.fairnessScore}% Fair Price Score
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">Automated B2B contract risk evaluation</p>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-xl border text-xs font-black uppercase tracking-wider ${
            riskColors[insights.riskLevel] || riskColors.low
          }`}
        >
          {insights.riskLevel} Risk
        </span>
      </div>

      <p className="text-xs text-foreground leading-relaxed font-medium">
        {insights.dealAssessment}
      </p>

      {insights.KeyInsights?.length > 0 && (
        <div className="pt-2 border-t border-border space-y-1.5">
          <h4 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
            Escrow Recommendations
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {insights.KeyInsights.map((rec, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-card border border-border text-[11px] font-medium text-muted-foreground flex items-start gap-1.5"
              >
                <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
