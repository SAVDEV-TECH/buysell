"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Building2,
  FileText,
  Mail,
  MapPin,
  Calendar,
  ArrowUpRight,
  Loader2,
  Filter,
  RefreshCw,
  Eye,
} from "lucide-react";

interface Organization {
  id: string;
  company_name: string;
  legal_registration_number?: string;
  company_type?: string;
  country?: string;
  city?: string;
  website?: string;
  description?: string;
  verification_level: "pending" | "verified" | "rejected" | "unverified";
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  owner?: { full_name: string; email: string };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    pending: { label: "Pending Review", class: "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse" },
    verified: { label: "Verified", class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    rejected: { label: "Rejected", class: "bg-red-500/10 text-red-400 border-red-500/20" },
    unverified: { label: "Unverified", class: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  };
  const cfg = map[status] || map.unverified;
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${cfg.class}`}>
      {cfg.label}
    </span>
  );
}

export default function AdminVerificationsPage() {
  const { user, role } = useAuth();
  const supabase = createClient();

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "verified" | "rejected" | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Reject modal state
  const [rejectModal, setRejectModal] = useState<{ org: Organization } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchOrgs = useCallback(async () => {
    if (role !== "super_admin") return;
    try {
      // 1. First attempt select with owner join
      let { data, error } = await supabase
        .from("organizations")
        .select(`
          *,
          owner:users(full_name, email)
        `)
        .order("created_at", { ascending: false });

      // 2. If join fails or returns error, fallback to select * and manually associate owner
      if (error || !data) {
        console.warn("[AdminVerifications] Join fetch warning, attempting fallback query:", error?.message);
        const { data: rawOrgs, error: rawErr } = await supabase
          .from("organizations")
          .select("*")
          .order("created_at", { ascending: false });

        if (rawErr) throw rawErr;
        data = rawOrgs || [];

        // Manually fetch owners for these orgs if owner_id exists
        const ownerIds = Array.from(new Set((data as any[]).map((o) => o.owner_id).filter(Boolean)));
        if (ownerIds.length > 0) {
          const { data: owners } = await supabase
            .from("users")
            .select("id, full_name, email")
            .in("id", ownerIds);

          const ownerMap = new Map((owners || []).map((u) => [u.id, u]));
          data = data.map((o) => ({
            ...o,
            owner: ownerMap.get(o.owner_id) || null,
          }));
        }
      }

      setOrgs((data as Organization[]) || []);
    } catch (err) {
      console.error("Error fetching orgs:", err);
    }
  }, [role, supabase]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchOrgs();
      setLoading(false);
    };
    init();

    // Realtime subscription
    const channel = supabase
      .channel("admin-verifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "organizations" }, fetchOrgs)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrgs, supabase]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrgs();
    setRefreshing(false);
  };

  const approveOrg = async (org: Organization) => {
    setProcessingId(org.id);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ verification_level: "verified", is_verified: true, is_active: true })
        .eq("id", org.id);

      if (error) throw error;

      // Get all users in this org and notify them
      const { data: orgUsers } = await supabase
        .from("users")
        .select("id")
        .eq("organization_id", org.id);

      if (orgUsers && orgUsers.length > 0) {
        for (const u of orgUsers) {
          await supabase.from("notifications").insert({
            user_id: u.id,
            title: "🎉 Business Verification Approved!",
            message: `Congratulations! "${org.company_name}" has been verified by the BuySell admin team. You can now list products, receive orders, and access payouts.`,
            type: "VERIFICATION",
            link: "/dashboard",
            read: false,
          });
        }
      }

      // Log admin action
      await supabase.from("approval_actions").insert({
        actor_id: user?.id,
        action: "approved",
        notes: `Organization "${org.company_name}" verified by admin.`,
        order_id: null,
      }).maybeSingle();

      setOrgs((prev) =>
        prev.map((o) =>
          o.id === org.id ? { ...o, verification_level: "verified", is_verified: true, is_active: true } : o
        )
      );
    } catch (err: any) {
      console.error("Approve error:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const rejectOrg = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    const { org } = rejectModal;
    setProcessingId(org.id);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ verification_level: "rejected", is_verified: false, is_active: false })
        .eq("id", org.id);

      if (error) throw error;

      // Notify org users with rejection reason
      const { data: orgUsers } = await supabase
        .from("users")
        .select("id")
        .eq("organization_id", org.id);

      if (orgUsers && orgUsers.length > 0) {
        for (const u of orgUsers) {
          await supabase.from("notifications").insert({
            user_id: u.id,
            title: "⚠️ Verification Application Rejected",
            message: `Your application for "${org.company_name}" was not approved. Reason: ${rejectReason}. You may update your documents and re-apply from your dashboard.`,
            type: "VERIFICATION",
            link: "/dashboard/verification",
            read: false,
          });
        }
      }

      setOrgs((prev) =>
        prev.map((o) =>
          o.id === org.id ? { ...o, verification_level: "rejected", is_verified: false, is_active: false } : o
        )
      );
      setRejectModal(null);
      setRejectReason("");
    } catch (err: any) {
      console.error("Reject error:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const isPending = (o: Organization) => {
    return (
      o.verification_level === "pending" ||
      o.verification_level === "unverified" ||
      (!o.is_verified && o.verification_level !== "verified" && o.verification_level !== "rejected")
    );
  };

  const filtered = orgs.filter((o) => {
    if (activeTab === "pending" && !isPending(o)) return false;
    if (activeTab === "verified" && o.verification_level !== "verified" && !o.is_verified) return false;
    if (activeTab === "rejected" && o.verification_level !== "rejected") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.company_name?.toLowerCase().includes(q) ||
        o.legal_registration_number?.toLowerCase().includes(q) ||
        o.country?.toLowerCase().includes(q) ||
        (o.owner as any)?.email?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    pending: orgs.filter(isPending).length,
    verified: orgs.filter((o) => o.verification_level === "verified" || o.is_verified).length,
    rejected: orgs.filter((o) => o.verification_level === "rejected").length,
    all: orgs.length,
  };

  const tabs = [
    { id: "pending" as const, label: "Pending", count: counts.pending },
    { id: "verified" as const, label: "Verified", count: counts.verified },
    { id: "rejected" as const, label: "Rejected", count: counts.rejected },
    { id: "all" as const, label: "All", count: counts.all },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <ShieldCheck size={24} className="text-primary" />
            KYB Verification Queue
          </h1>
          <p className="text-slate-500 text-sm font-bold mt-1">
            Review and approve manufacturer & wholesaler applications
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

      {/* Tab bar + Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.label}
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, reg #, country…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-28 gap-4">
          <Loader2 size={32} className="text-primary animate-spin" />
          <p className="text-slate-500 text-sm font-bold">Loading verification queue…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 gap-4 bg-slate-900 rounded-2xl border border-slate-800">
          <CheckCircle2 size={40} className="text-emerald-500" />
          <div className="text-center">
            <p className="text-white font-black text-lg">
              {activeTab === "pending" ? "Queue is clear!" : "Nothing here"}
            </p>
            <p className="text-slate-500 text-sm font-bold mt-1">
              {activeTab === "pending"
                ? "No organizations are awaiting verification right now."
                : `No ${activeTab} organizations found.`}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((org, i) => (
              <motion.div
                key={org.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ delay: i * 0.04 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-5">

                  {/* Org Info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                      <Building2 size={22} className="text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1.5">
                        <h3 className="text-sm font-black text-white truncate">{org.company_name}</h3>
                        <StatusBadge status={org.verification_level} />
                        {org.company_type && (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 text-[10px] font-bold uppercase">
                            {org.company_type}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 font-bold">
                        {org.legal_registration_number && (
                          <span className="flex items-center gap-1">
                            <FileText size={10} /> Reg: {org.legal_registration_number}
                          </span>
                        )}
                        {(org.city || org.country) && (
                          <span className="flex items-center gap-1">
                            <MapPin size={10} /> {[org.city, org.country].filter(Boolean).join(", ")}
                          </span>
                        )}
                        {(org.owner as any)?.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={10} /> {(org.owner as any).email}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar size={10} /> Applied {new Date(org.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {org.description && (
                        <p className="text-[11px] text-slate-600 mt-1.5 line-clamp-2">{org.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/admin/verifications/${org.id}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700"
                    >
                      <Eye size={13} /> Deep Dive
                    </Link>

                    {org.verification_level === "pending" && (
                      <>
                        <button
                          onClick={() => approveOrg(org)}
                          disabled={processingId === org.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-60"
                        >
                          {processingId === org.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={13} />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectModal({ org })}
                          disabled={processingId === org.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-black transition-all border border-red-600/20 disabled:opacity-60"
                        >
                          <XCircle size={13} /> Reject
                        </button>
                      </>
                    )}

                    {org.verification_level === "rejected" && (
                      <button
                        onClick={() => approveOrg(org)}
                        disabled={processingId === org.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary text-xs font-black transition-all border border-primary/20 disabled:opacity-60"
                      >
                        <CheckCircle2 size={13} /> Re-Approve
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-7 max-w-lg w-full shadow-2xl space-y-5"
            >
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <XCircle size={20} className="text-red-400" />
                  Reject Application
                </h3>
                <p className="text-sm text-slate-400 font-bold mt-1">
                  <span className="text-white">{rejectModal.org.company_name}</span> will be notified with your reason and may re-apply.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300 uppercase tracking-widest">
                  Rejection Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="e.g. Submitted documents are incomplete. Please re-upload a valid CAC certificate and tax identification number."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500/40 resize-none transition-all"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={rejectOrg}
                  disabled={!rejectReason.trim() || processingId !== null}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {processingId ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                  Confirm Rejection
                </button>
                <button
                  onClick={() => { setRejectModal(null); setRejectReason(""); }}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold text-sm transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
