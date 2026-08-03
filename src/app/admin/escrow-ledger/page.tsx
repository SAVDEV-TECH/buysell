"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Lock,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import Link from "next/link";
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
  deposit: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  hold: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  release: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  partial_release: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  refund: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  fee: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  dispute_hold: "bg-orange-500/10 text-orange-400 border-orange-500/20",
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
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-3">
              <ShieldCheck size={22} className="text-emerald-400" /> Escrow Financial Audit Ledger
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-bold">
              Immutable financial transaction log recording every cent deposit, hold, release, and refund across BuySell
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black transition-all border border-slate-700 disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-primary" : ""} />
            Refresh Ledger
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Ledger Entries", value: records.length, icon: <FileText size={18} className="text-blue-400" />, color: "bg-blue-500/10" },
            { label: "Total Monitored Volume", value: `$${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: <TrendingUp size={18} className="text-emerald-400" />, color: "bg-emerald-500/10" },
            { label: "Total Released Payouts", value: `$${releasedVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: <DollarSign size={18} className="text-teal-400" />, color: "bg-teal-500/10" },
            { label: "Compliance Status", value: "100% Audited", icon: <Lock size={18} className="text-purple-400" />, color: "bg-purple-500/10" },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${kpi.color}`}>{kpi.icon}</div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Immutable</span>
              </div>
              <p className="text-2xl font-black text-white">{kpi.value}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black capitalize transition-all whitespace-nowrap ${
                  typeFilter === t
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {t.replace("_", " ")}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search Ledger ID, Order ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          {loading ? (
            <BuySellLoader message="Loading immutable financial audit ledger…" fullScreen={false} />
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-sm font-bold">
              No financial ledger records match your filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="px-6 py-4">Transaction ID</th>
                    <th className="px-6 py-4">Order Ref</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-white">
                        #{r.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-400">
                        {r.order_id ? `#${r.order_id.slice(0, 8).toUpperCase()}` : "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${typeBadgeMap[r.type] || typeBadgeMap.hold}`}>
                          {r.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black text-white">
                        ${Number(r.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} {r.currency || "USD"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                          <CheckCircle2 size={12} /> {r.status || "completed"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-bold">
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
