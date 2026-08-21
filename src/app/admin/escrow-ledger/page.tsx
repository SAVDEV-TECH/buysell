"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Lock,
  CheckCircle2,
  FileText,
} from "lucide-react";
import BuySellLoader from "@/components/BuySellLoader";
import ErrorBoundary from "@/components/ErrorBoundary";

interface LedgerRecord {
  id: string;
  order_id?: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  processed_at?: string;
  order?: {
    id: string;
    total_amount: number;
    currency: string;
    status: string;
  };
}

const typeBadgeMap: Record<string, string> = {
  deposit: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  hold: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  release: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  partial_release: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  refund: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  fee: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  dispute_hold: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-800",
};

export default function EscrowLedgerPage() {
  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchLedger = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/escrow-ledger");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRecords(json.data);
      }
    } catch (err) {
      console.error("Escrow ledger fetch error:", err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchLedger();
      setLoading(false);
    };
    init();
  }, [fetchLedger]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLedger();
    setRefreshing(false);
  };

  const totalVolume = records.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const releasedVolume = records
    .filter((r) => r.type === "release" || r.type === "partial_release")
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const types = ["all", "deposit", "hold", "release", "partial_release", "refund", "fee"];

  const filtered = records.filter((r) => {
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        (r.order_id || "").toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <ErrorBoundary>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Lock size={20} className="text-emerald-500" />
              <h1 className="text-xl font-bold text-foreground">Escrow Financial Ledger</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Financial transaction audit log recording every deposit, hold, release, and refund
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors self-start sm:self-auto"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Refresh Ledger
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Ledger Entries", value: records.length.toLocaleString(), icon: <FileText size={16} className="text-primary" /> },
            { label: "Monitored Volume", value: `$${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: <TrendingUp size={16} className="text-emerald-500" /> },
            { label: "Released Payouts", value: `$${releasedVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: <DollarSign size={16} className="text-primary" /> },
            { label: "Audit Status", value: "Verified & Protected", icon: <ShieldCheck size={16} className="text-emerald-500" /> },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-muted">{kpi.icon}</div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Ledger</span>
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border overflow-x-auto">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                  typeFilter === t
                    ? "bg-card text-foreground shadow-sm font-bold border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.replace("_", " ")}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search Ledger ID, Order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          {loading ? (
            <BuySellLoader message="Loading financial ledger..." fullScreen={false} />
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground text-xs font-medium">
              No financial ledger records match your filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-3">Transaction ID</th>
                    <th className="px-4 py-3">Order Ref</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        #{r.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {r.order_id ? `#${r.order_id.slice(0, 8).toUpperCase()}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${typeBadgeMap[r.type] || typeBadgeMap.hold}`}>
                          {r.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground">
                        ${Number(r.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} {r.currency || "USD"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                          <CheckCircle2 size={12} /> {r.status || "completed"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
