"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
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
import BuySellLoader from "@/components/BuySellLoader";

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
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    processed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    rejected: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800",
  };

  if (loading) {
    return <BuySellLoader message="Loading payout requests..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wallet size={20} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">Supplier Payouts</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            ${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2 })} pending in merchant disbursement queue
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pending Review", value: payouts.filter(p => p.status === "pending").length, color: "text-amber-600 dark:text-amber-400" },
          { label: "Processed", value: payouts.filter(p => p.status === "processed").length, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Rejected", value: payouts.filter(p => p.status === "rejected").length, color: "text-red-600 dark:text-red-400" },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-xl bg-card border border-border shadow-sm">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
          {(["all", "pending", "processed", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${
                statusFilter === f
                  ? "bg-card text-foreground shadow-sm font-bold border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by company or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-center p-6">
            <CheckCircle2 size={32} className="text-emerald-500" />
            <p className="text-sm font-semibold text-foreground">No {statusFilter !== "all" ? statusFilter : ""} payout requests</p>
            <p className="text-xs text-muted-foreground">All merchant requests are up to date.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Bank Details</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-foreground flex items-center gap-1.5">
                        <Building2 size={13} className="text-muted-foreground" />
                        {(p.org as any)?.company_name || "Merchant"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{(p.requester as any)?.email}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">
                      ${Number(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      <span className="text-[10px] text-muted-foreground font-normal ml-1">{p.currency || "USD"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{p.bank_name || "Standard Settlement"}</p>
                      {p.account_number && (
                        <p className="text-[11px] text-muted-foreground font-mono">
                          ****{p.account_number.slice(-4)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${statusColors[p.status] || statusColors.pending}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(p.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status === "pending" && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => markProcessed(p.id)}
                            disabled={processingId === p.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            {processingId === p.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                            Process
                          </button>
                          <button
                            onClick={() => rejectPayout(p.id)}
                            disabled={processingId === p.id}
                            className="px-2.5 py-1 rounded border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
