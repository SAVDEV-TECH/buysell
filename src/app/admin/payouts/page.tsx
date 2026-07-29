"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import {
  Wallet,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  DollarSign,
  Building2,
} from "lucide-react";

interface PayoutRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  bank_name?: string;
  account_number?: string;
  created_at: string;
  org?: { company_name: string };
  requester?: { full_name: string; email: string };
}

export default function AdminPayoutsPage() {
  const supabase = createClient();
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "processed" | "rejected">("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPayouts = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("payouts")
        .select(`
          *,
          org:organizations(company_name),
          requester:users!payouts_user_id_fkey(full_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(200);
      setPayouts((data as any[]) || []);
    } catch (err) {
      console.error("Payouts fetch error:", err);
    }
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchPayouts();
      setLoading(false);
    };
    init();
  }, [fetchPayouts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPayouts();
    setRefreshing(false);
  };

  const markProcessed = async (id: string) => {
    setProcessingId(id);
    try {
      await supabase.from("payouts").update({ status: "processed" }).eq("id", id);
      setPayouts((prev) => prev.map((p) => (p.id === id ? { ...p, status: "processed" } : p)));
    } catch (err) {
      console.error("Mark processed error:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const rejectPayout = async (id: string) => {
    if (!window.confirm("Reject this payout request?")) return;
    setProcessingId(id);
    try {
      await supabase.from("payouts").update({ status: "rejected" }).eq("id", id);
      setPayouts((prev) => prev.map((p) => (p.id === id ? { ...p, status: "rejected" } : p)));
    } catch (err) {
      console.error("Reject payout error:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const totalPending = payouts
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const filtered = payouts.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (p.org as any)?.company_name?.toLowerCase().includes(q) ||
        (p.requester as any)?.email?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    processed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Wallet size={22} className="text-primary" /> Payouts Management
          </h1>
          <p className="text-slate-500 text-sm font-bold mt-1">
            ${totalPending.toLocaleString()} pending in payout queue
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending", value: payouts.filter(p => p.status === "pending").length, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Processed", value: payouts.filter(p => p.status === "processed").length, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Rejected", value: payouts.filter(p => p.status === "rejected").length, color: "text-red-400", bg: "bg-red-500/10" },
        ].map((s) => (
          <div key={s.label} className={`p-5 rounded-2xl ${s.bg} border border-slate-800`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          {(["all", "pending", "processed", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-4 py-2 text-[11px] font-black rounded-xl capitalize transition-all ${
                statusFilter === f ? "bg-primary text-white" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by company or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3">
            <Loader2 size={28} className="text-primary animate-spin" />
            <p className="text-slate-500 text-sm font-bold">Loading payouts…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <CheckCircle2 size={36} className="text-emerald-500" />
            <p className="text-slate-500 font-bold">No {statusFilter !== "all" ? statusFilter : ""} payout requests</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  {["Supplier", "Amount", "Bank Details", "Status", "Requested", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <p className="text-xs font-black text-white flex items-center gap-1">
                        <Building2 size={11} className="text-slate-500" />
                        {(p.org as any)?.company_name || "Unknown"}
                      </p>
                      <p className="text-[11px] text-slate-500">{(p.requester as any)?.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-black text-white flex items-center gap-0.5">
                        <DollarSign size={12} />{p.amount?.toLocaleString()}
                        <span className="text-[10px] text-slate-500 ml-0.5">{p.currency || "USD"}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs text-slate-400 font-bold">{p.bank_name || "—"}</p>
                      {p.account_number && (
                        <p className="text-[11px] text-slate-600 font-mono">
                          ****{p.account_number.slice(-4)}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${statusColors[p.status] || statusColors.pending}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(p.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {p.status === "pending" && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => markProcessed(p.id)}
                            disabled={processingId === p.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-[11px] font-black transition-all border border-emerald-600/20"
                          >
                            {processingId === p.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                            Process
                          </button>
                          <button
                            onClick={() => rejectPayout(p.id)}
                            disabled={processingId === p.id}
                            className="px-3 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 text-[11px] font-black transition-all border border-red-600/15"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
