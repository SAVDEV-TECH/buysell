"use client";

import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Wallet,
  ArrowUpRight,
  TrendingUp,
  History,
  AlertCircle,
  Building,
  Loader2,
  ShieldCheck,
  Clock,
  Zap,
  CheckCircle2,
  DollarSign,
  Plus,
  X,
  CreditCard,
  Building2,
  Lock,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface PayoutSettings {
  id?: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  routing_code?: string;
  swift_code?: string;
  currency: string;
  payout_method: string;
}

interface PayoutRequest {
  id: string;
  amount: number;
  fee: number;
  net_amount: number;
  currency: string;
  payout_method: string;
  bank_details: any;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  processed_at?: string;
}

const CURRENCIES = ["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR"];
const PAYOUT_METHODS = [
  { id: "bank_transfer", label: "Bank Wire Transfer (ACH/SWIFT)" },
  { id: "mobile_money", label: "Mobile Money (MPesa / MTN / Airtel)" },
  { id: "paystack", label: "Direct Local Bank Settlement" },
];

export default function PayoutsPage() {
  const { user, profile, organizationId } = useAuth();
  const { sendNotification } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState({
    available: 0,
    escrowLocked: 0,
    withdrawn: 0,
    gross: 0,
  });

  const [payoutSettings, setPayoutSettings] = useState<PayoutSettings | null>(null);
  const [payoutHistory, setPayoutHistory] = useState<PayoutRequest[]>([]);

  // Modals
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<PayoutSettings>({
    bank_name: "",
    account_name: "",
    account_number: "",
    routing_code: "",
    swift_code: "",
    currency: "USD",
    payout_method: "bank_transfer",
  });

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // ─── Fetch Wallet & Payout Data ─────────────────────────────────────────────
  const fetchWalletData = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch Orders for this seller
      const { data: ordersData } = await supabase
        .from("orders")
        .select("total_amount, status, payment_status")
        .eq("supplier_organization_id", organizationId);

      // 2. Fetch Payout Requests history
      const { data: payoutsData } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      // 3. Fetch Payout Bank Settings
      const { data: settingsData } = await supabase
        .from("payout_settings")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (settingsData) {
        setPayoutSettings(settingsData as PayoutSettings);
        setSettingsForm(settingsData as PayoutSettings);
      }

      const history = (payoutsData as PayoutRequest[]) || [];
      setPayoutHistory(history);

      // Calculate ledger totals
      let totalGross = 0;
      let escrowLocked = 0;
      let totalCompleted = 0;
      let totalWithdrawn = 0;

      (ordersData || []).forEach((o) => {
        const amt = Number(o.total_amount) || 0;
        totalGross += amt;

        if (o.status === "delivered" || o.status === "completed" || o.payment_status === "paid" || o.payment_status === "escrow_released") {
          totalCompleted += amt;
        } else {
          escrowLocked += amt;
        }
      });

      history.forEach((p) => {
        if (p.status === "completed" || p.status === "processing" || p.status === "pending") {
          totalWithdrawn += Number(p.amount) || 0;
        }
      });

      const available = Math.max(0, totalCompleted - totalWithdrawn);

      setBalance({
        available,
        escrowLocked,
        withdrawn: totalWithdrawn,
        gross: totalGross,
      });
    } catch (err) {
      console.error("[Payouts] Wallet fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [organizationId, supabase]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  // ─── Realtime Subscriptions ──────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("payouts-realtime-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "payout_requests" }, fetchWalletData)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchWalletData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchWalletData]);

  // ─── Handle Save Bank Settings ──────────────────────────────────────────────
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    setSavingSettings(true);

    try {
      const payload = {
        organization_id: organizationId,
        bank_name: settingsForm.bank_name.trim(),
        account_name: settingsForm.account_name.trim(),
        account_number: settingsForm.account_number.trim(),
        routing_code: settingsForm.routing_code?.trim() || null,
        swift_code: settingsForm.swift_code?.trim() || null,
        currency: settingsForm.currency,
        payout_method: settingsForm.payout_method,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("payout_settings")
        .upsert(payload, { onConflict: "organization_id" })
        .select()
        .single();

      if (error) throw error;

      setPayoutSettings(data as PayoutSettings);
      setShowSettingsModal(false);
    } catch (err: any) {
      alert("Failed to save payout settings: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // ─── Handle Withdrawal Request ──────────────────────────────────────────────
  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !organizationId) return;
    const amountNum = Number(withdrawAmount);

    if (amountNum <= 0) {
      setWithdrawError("Please enter a valid withdrawal amount.");
      return;
    }

    if (amountNum > balance.available) {
      setWithdrawError(`Insufficient available balance ($${balance.available.toLocaleString()} max).`);
      return;
    }

    if (!payoutSettings) {
      setWithdrawError("Please configure your settlement bank account details first.");
      return;
    }

    setSubmittingWithdraw(true);
    setWithdrawError("");

    try {
      const flatFee = 5.00; // $5 wire fee
      const netAmt = Math.max(0, amountNum - flatFee);

      const payload = {
        organization_id: organizationId,
        user_id: user.id,
        amount: amountNum,
        fee: flatFee,
        net_amount: netAmt,
        currency: payoutSettings.currency || "USD",
        payout_method: payoutSettings.payout_method || "bank_transfer",
        bank_details: {
          bank_name: payoutSettings.bank_name,
          account_name: payoutSettings.account_name,
          account_number: payoutSettings.account_number,
        },
        status: "pending",
      };

      const { error } = await supabase.from("payout_requests").insert(payload);
      if (error) throw error;

      await sendNotification(
        user.id,
        "💸 Withdrawal Requested",
        `Your payout request for $${amountNum.toLocaleString()} was submitted for processing.`,
        "SYSTEM",
        "/dashboard/payouts"
      );

      setShowWithdrawModal(false);
      setWithdrawAmount("");
      fetchWalletData();
    } catch (err: any) {
      console.error("Withdrawal error:", err);
      setWithdrawError(err.message || "Failed to process withdrawal.");
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
            <CheckCircle2 size={11} /> Settled
          </span>
        );
      case "processing":
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-500/20">
            <Clock size={11} /> Processing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-600 dark:text-red-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-red-500/20">
            <AlertCircle size={11} /> Failed
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Merchant Wallet & Settlement</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage trade earnings, escrow releases, and automated bank payouts
          </p>
        </div>

        <button
          onClick={() => { setShowWithdrawModal(true); setWithdrawError(""); }}
          className="flex items-center gap-2 px-6 py-3.5 bg-primary text-white rounded-2xl font-bold text-sm shadow-xl shadow-primary/25 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all"
        >
          <ArrowUpRight size={18} /> Request Withdrawal
        </button>
      </div>

      {/* ── Main Layout: Capital Ledger + Bank Account Config ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Available Balance Card (2 cols) */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-3xl p-8 md:p-10 overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl text-white flex flex-col justify-between min-h-[320px]"
          >
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Merchant Settlement Node</span>
                  <h3 className="text-lg font-bold flex items-center gap-2 text-white mt-0.5">
                    Capital Ledger
                    <ShieldCheck size={16} className="text-emerald-400" />
                  </h3>
                </div>
                <div className="w-11 h-11 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center text-primary">
                  <Zap size={22} />
                </div>
              </div>

              {/* Settlement Available Balance */}
              <div className="mb-6">
                <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Wallet size={14} className="text-emerald-400" /> Available for Settlement
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl text-white/40 font-light">$</span>
                  <h2 className="text-5xl md:text-6xl font-black tracking-tight text-white">
                    {loading ? "…" : balance.available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                  <span className="text-xs font-bold text-white/40">USD</span>
                </div>
              </div>
            </div>

            {/* Sub-ledger metrics */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10 text-xs">
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Escrow Locked</p>
                <p className="text-sm font-black text-amber-400 mt-0.5">${balance.escrowLocked.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Total Withdrawn</p>
                <p className="text-sm font-black text-blue-400 mt-0.5">${balance.withdrawn.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Lifetime Gross</p>
                <p className="text-sm font-black text-white mt-0.5">${balance.gross.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bank / Settlement Destination Card (1 col) */}
        <div className="glass rounded-3xl border border-borderline p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 size={16} className="text-primary" /> Settlement Account
              </h3>
              <button
                onClick={() => setShowSettingsModal(true)}
                className="text-xs font-bold text-primary hover:underline"
              >
                {payoutSettings ? "Edit" : "Configure"}
              </button>
            </div>

            {payoutSettings ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bank Name</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{payoutSettings.bank_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Account Holder</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{payoutSettings.account_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Account #</span>
                  <span className="text-xs font-mono font-bold text-primary">
                    •••• {payoutSettings.account_number.slice(-4)}
                  </span>
                </div>
                {payoutSettings.swift_code && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">SWIFT / BIC</span>
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">{payoutSettings.swift_code}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-borderline space-y-3">
                <CreditCard size={28} className="text-muted-foreground mx-auto" />
                <p className="text-xs text-muted-foreground font-semibold">No settlement bank account configured yet.</p>
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 transition-all"
                >
                  Setup Bank Details
                </button>
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-xs text-muted-foreground space-y-1">
            <p className="font-bold text-primary flex items-center gap-1">
              <ShieldCheck size={14} /> Settlement Security Guarantee
            </p>
            <p className="text-[11px] leading-relaxed">
              Withdrawal requests are processed within 24 business hours to your verified business bank account.
            </p>
          </div>
        </div>
      </div>

      {/* ── Historical Payout Audit Log ── */}
      <div className="glass rounded-3xl border border-borderline overflow-hidden space-y-4">
        <div className="px-6 pt-6 flex justify-between items-center">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <History size={18} className="text-primary" /> Settlement Withdrawal Ledger
            </h3>
            <p className="text-xs text-muted-foreground">Audit trail of all requested and completed payouts</p>
          </div>

          <button
            onClick={fetchWalletData}
            title="Refresh Ledger"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <Loader2 size={32} className="text-primary animate-spin mb-2" />
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Loading ledger history…</p>
          </div>
        ) : payoutHistory.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <History size={24} />
            </div>
            <p className="text-xs text-muted-foreground font-semibold">No withdrawal requests submitted yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-borderline bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Request Ref</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Gross Amount</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Wire Fee</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Net Payout</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Destination Bank</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline">
                {payoutHistory.map((payout) => {
                  const bankName = (payout.bank_details as any)?.bank_name || "Settlement Bank";
                  const acctNum = (payout.bank_details as any)?.account_number || "";
                  return (
                    <tr key={payout.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900 dark:text-white">
                        #PAY-{payout.id.slice(0, 8).toUpperCase()}
                        <p className="text-[10px] text-muted-foreground font-sans font-medium mt-0.5">
                          {new Date(payout.created_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-6 py-4 font-bold text-xs text-slate-900 dark:text-white">
                        ${Number(payout.amount).toLocaleString()} {payout.currency || "USD"}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        ${Number(payout.fee || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-black text-xs text-emerald-600 dark:text-emerald-400">
                        ${Number(payout.net_amount || payout.amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {bankName} {acctNum ? `(•••• ${acctNum.slice(-4)})` : ""}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(payout.status)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Request Withdrawal Modal ── */}
      <AnimatePresence>
        {showWithdrawModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black">Request Capital Withdrawal</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Transfer funds to your business bank account.</p>
                </div>
                <button onClick={() => setShowWithdrawModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl">
                  <X size={18} />
                </button>
              </div>

              {withdrawError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-600 rounded-xl text-xs font-bold">
                  {withdrawError}
                </div>
              )}

              <form onSubmit={handleRequestWithdrawal} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Withdrawal Amount ($ USD) *</label>
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(String(balance.available))}
                      className="text-[10px] font-extrabold text-primary hover:underline"
                    >
                      Max (${balance.available.toLocaleString()})
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {withdrawAmount && Number(withdrawAmount) > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Requested Amount:</span>
                      <span>${Number(withdrawAmount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Wire Processing Fee:</span>
                      <span>-$5.00</span>
                    </div>
                    <div className="flex justify-between font-black text-emerald-600 dark:text-emerald-400 pt-1 border-t">
                      <span>Net Settlement Payout:</span>
                      <span>${Math.max(0, Number(withdrawAmount) - 5).toLocaleString()} USD</span>
                    </div>
                  </div>
                )}

                {payoutSettings && (
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-xs space-y-1">
                    <p className="font-bold text-primary">Destination Bank:</p>
                    <p className="text-slate-700 dark:text-slate-300">
                      {payoutSettings.bank_name} · {payoutSettings.account_name} (•••• {payoutSettings.account_number.slice(-4)})
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(false)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingWithdraw || !withdrawAmount}
                    className="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submittingWithdraw ? <Loader2 size={16} className="animate-spin" /> : "Confirm Payout"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Configure Bank Settings Modal ── */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black">Configure Settlement Account</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Enter business bank details for payouts.</p>
                </div>
                <button onClick={() => setShowSettingsModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Bank Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. JPMorgan Chase / Access Bank"
                    value={settingsForm.bank_name}
                    onChange={(e) => setSettingsForm({ ...settingsForm, bank_name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Account Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Legal Entity Name"
                      value={settingsForm.account_name}
                      onChange={(e) => setSettingsForm({ ...settingsForm, account_name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Account Number / IBAN *</label>
                    <input
                      type="text"
                      required
                      placeholder="Account Number"
                      value={settingsForm.account_number}
                      onChange={(e) => setSettingsForm({ ...settingsForm, account_number: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">SWIFT / BIC Code</label>
                    <input
                      type="text"
                      placeholder="CHASUS33XXX"
                      value={settingsForm.swift_code || ""}
                      onChange={(e) => setSettingsForm({ ...settingsForm, swift_code: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Payout Currency</label>
                    <select
                      value={settingsForm.currency}
                      onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-primary/40 bg-transparent"
                    >
                      {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {savingSettings ? <Loader2 size={16} className="animate-spin" /> : "Save Settlement Account"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
