"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  Sliders,
  DollarSign,
  AlertCircle,
  FileText,
  User,
  Plus,
  Loader2,
  ArrowUpRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface ApprovalRule {
  id: string;
  rule_name: string;
  min_amount: number;
  approver_role: string;
}

interface OrderApproval {
  id: string;
  order_id: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  rejection_reason?: string;
  created_at: string;
  requested_by_user?: { full_name: string; email: string };
  order?: {
    id: string;
    total_amount: number;
    currency: string;
    created_at: string;
    items?: Array<{ id: string; quantity: number; unit_price: number }>;
  };
}

export default function ApprovalsPage() {
  const { user, profile, role } = useAuth();
  const supabase = createClient();

  const [approvals, setApprovals] = useState<OrderApproval[]>([]);
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [searchTerm, setSearchTerm] = useState("");

  // Action Modals
  const [selectedApproval, setSelectedApproval] = useState<OrderApproval | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Rule Modal
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState("High-Value Order Threshold");
  const [newMinAmount, setNewMinAmount] = useState(5000);
  const [savingRule, setSavingRule] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      setLoading(true);

      try {
        // Load Approval Rules
        const { data: rulesData } = await supabase
          .from("approval_rules")
          .select("*")
          .order("min_amount", { ascending: true });

        setRules((rulesData as ApprovalRule[]) || []);

        // Load Order Approvals with joined order details
        const { data: approvalsData } = await supabase
          .from("order_approvals")
          .select(`
            *,
            requested_by_user:users!order_approvals_requested_by_fkey(full_name, email),
            order:orders(id, total_amount, currency, created_at)
          `)
          .order("created_at", { ascending: false });

        setApprovals((approvalsData as OrderApproval[]) || []);
      } catch (err) {
        console.error("Error loading approvals:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    // Subscribe to realtime approval changes
    const channel = supabase
      .channel("order_approvals_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_approvals" }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  // Handle Approve / Reject Actions
  const handleDecision = async (status: "approved" | "rejected") => {
    if (!selectedApproval || !user) return;
    setProcessingId(selectedApproval.id);

    try {
      // 1. Update order_approvals table
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (status === "approved") {
        updateData.approved_by = user.id;
        updateData.approved_at = new Date().toISOString();
      } else {
        updateData.rejected_by = user.id;
        updateData.rejected_at = new Date().toISOString();
        updateData.rejection_reason = rejectionReason;
      }

      const { error: approvalErr } = await supabase
        .from("order_approvals")
        .update(updateData)
        .eq("id", selectedApproval.id);

      if (approvalErr) throw approvalErr;

      // 2. Insert into append-only approval_actions audit trail
      await supabase.from("approval_actions").insert({
        order_id: selectedApproval.order_id,
        approval_id: selectedApproval.id,
        actor_id: user.id,
        action: status,
        notes: status === "rejected" ? rejectionReason : "Approved by procurement manager",
      });

      // 3. Update orders table status
      if (selectedApproval.order_id) {
        await supabase
          .from("orders")
          .update({
            status: status === "approved" ? "confirmed" : "cancelled",
          })
          .eq("id", selectedApproval.order_id);
      }

      // Refresh state
      setApprovals((prev) =>
        prev.map((item) =>
          item.id === selectedApproval.id ? { ...item, status, rejection_reason: rejectionReason } : item
        )
      );
      setSelectedApproval(null);
      setRejectionReason("");
    } catch (err) {
      console.error("Error updating approval decision:", err);
    } finally {
      setProcessingId(null);
    }
  };

  // Create New Approval Rule
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) return;
    setSavingRule(true);

    try {
      const generatedKey = newRuleName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_") + "_" + Date.now().toString().slice(-4);
      const { data, error } = await supabase.from("approval_rules").insert({
        organization_id: profile.organization_id,
        rule_name: newRuleName,
        rule_key: generatedKey,
        min_amount: newMinAmount,
        approver_role: "procurement_manager",
        sequence_order: 1,
        required_count: 1,
      }).select().single();

      if (error) throw error;
      if (data) setRules((prev) => [...prev, data as ApprovalRule]);
      setShowRuleModal(false);
    } catch (err) {
      console.error("Error creating approval rule:", err);
    } finally {
      setSavingRule(false);
    }
  };

  const filteredApprovals = approvals.filter((item) => {
    if (activeTab !== "all" && item.status !== activeTab) return false;
    if (searchTerm) {
      const matchId = item.order_id?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchUser = item.requested_by_user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchId || matchUser;
    }
    return true;
  });

  const pendingCount = approvals.filter((a) => a.status === "pending").length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">Procurement Approvals</h1>
            {pendingCount > 0 && (
              <span className="px-3 py-1 bg-amber-500 text-white text-xs font-black rounded-full shadow-md animate-pulse">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Enterprise procurement rule engine & order authorization pipeline
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRuleModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-md"
          >
            <Sliders size={15} /> Configure Approval Rules
          </button>
        </div>
      </div>

      {/* ── Active Spending Rules Banner ── */}
      <div className="glass rounded-3xl border border-borderline p-6 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <ShieldCheck size={16} className="text-primary" /> Active Organization Spending Rules
        </h3>

        {rules.length === 0 ? (
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 text-xs font-bold text-muted-foreground flex items-center justify-between">
            <span>No custom rules defined. Default threshold: Orders exceeding <strong>$5,000.00 USD</strong> require manager approval.</span>
            <button onClick={() => setShowRuleModal(true)} className="text-primary underline">Add Rule</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rules.map((rule) => (
              <div key={rule.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-borderline shadow-sm space-y-1">
                <div className="text-xs font-black text-slate-900 dark:text-white">{rule.rule_name}</div>
                <div className="text-lg font-black text-primary">${rule.min_amount.toLocaleString()} USD+</div>
                <div className="text-[10px] text-muted-foreground uppercase font-bold">Role: {rule.approver_role}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Filter Tabs & Search Bar ── */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-borderline">
          {(["pending", "approved", "rejected", "all"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold rounded-xl capitalize transition-all ${
                activeTab === tab
                  ? "bg-white dark:bg-slate-800 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by Order ID or Buyer Name…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-borderline rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* ── Approvals List Table ── */}
      <div className="glass rounded-3xl border border-borderline overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <Loader2 size={28} className="animate-spin text-primary mx-auto" />
            <p className="text-xs font-bold">Loading procurement approvals…</p>
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2">
            <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-slate-900 dark:text-white">No {activeTab !== "all" ? activeTab : ""} approvals found</p>
            <p className="text-xs">All high-value orders meet authorization requirements.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-borderline bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Order ID</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Requested By</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Requested Date</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline">
                {filteredApprovals.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="px-6 py-4 text-xs font-mono font-bold text-primary">
                      <Link href={`/dashboard/orders/${item.order_id}`} className="hover:underline flex items-center gap-1">
                        #{item.order_id?.slice(0, 8)} <ArrowUpRight size={12} />
                      </Link>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.requested_by_user?.full_name || "Procurement Staff"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{item.requested_by_user?.email}</div>
                    </td>

                    <td className="px-6 py-4 text-sm font-black text-slate-900 dark:text-white">
                      ${item.order?.total_amount?.toLocaleString() || "0.00"} {item.order?.currency || "USD"}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${
                        item.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20"
                          : item.status === "rejected"
                          ? "bg-red-500/10 text-red-500 ring-1 ring-red-500/20"
                          : "bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20 animate-pulse"
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs text-muted-foreground font-bold">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {item.status === "pending" ? (
                        <button
                          onClick={() => setSelectedApproval(item)}
                          className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-md hover:bg-primary/90 transition-all"
                        >
                          Review & Authorize
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">Decided</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Decision Modal ── */}
      <AnimatePresence>
        {selectedApproval && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-borderline p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Authorize Order Request</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Order #{selectedApproval.order_id?.slice(0, 8)} · Total: <strong>${selectedApproval.order?.total_amount?.toLocaleString()} USD</strong>
                </p>
              </div>

              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-borderline text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Requested By:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedApproval.requested_by_user?.full_name || "Staff Member"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Order Value:</span>
                  <span className="font-black text-primary">${selectedApproval.order?.total_amount?.toLocaleString()} USD</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900 dark:text-white">Rejection Notes (Optional for approval, required for rejection)</label>
                <textarea
                  rows={3}
                  placeholder="Enter reason if rejecting this purchase request…"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-borderline rounded-2xl text-xs font-bold outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleDecision("approved")}
                  disabled={!!processingId}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={16} /> Approve & Release Order
                </button>

                <button
                  onClick={() => handleDecision("rejected")}
                  disabled={!!processingId || !rejectionReason.trim()}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <XCircle size={16} /> Reject Request
                </button>
              </div>

              <button
                onClick={() => setSelectedApproval(null)}
                className="w-full text-center text-xs font-bold text-muted-foreground hover:underline"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Add Rule Modal ── */}
      <AnimatePresence>
        {showRuleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-borderline p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Create Approval Rule</h3>

              <form onSubmit={handleSaveRule} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold">Rule Name</label>
                  <input
                    type="text"
                    required
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-borderline rounded-xl text-xs font-bold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold">Minimum Order Amount ($ USD)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newMinAmount}
                    onChange={(e) => setNewMinAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-borderline rounded-xl text-xs font-bold outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={savingRule}
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-xs shadow-md hover:bg-primary/90 transition-all"
                  >
                    {savingRule ? "Saving…" : "Save Rule"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRuleModal(false)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
