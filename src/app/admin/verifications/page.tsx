"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Search,
  Building2,
  FileText,
  Mail,
  MapPin,
  Calendar,
  Loader2,
  RefreshCw,
  Eye,
} from "lucide-react";
import BuySellLoader from "@/components/BuySellLoader";

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
  owner?: { full_name: string; email: string };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    pending: { label: "Pending", class: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
    verified: { label: "Verified", class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
    rejected: { label: "Rejected", class: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800" },
    unverified: { label: "Unverified", class: "bg-muted text-muted-foreground border-border" },
  };
  const cfg = map[status] || map.unverified;
  return (
    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cfg.class}`}>
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
      let { data, error } = await supabase
        .from("organizations")
        .select(`
          *,
          owner:users(full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error || !data) {
        const { data: rawOrgs, error: rawErr } = await supabase
          .from("organizations")
          .select("*")
          .order("created_at", { ascending: false });

        if (rawErr) throw rawErr;
        data = rawOrgs || [];

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

  if (loading) {
    return <BuySellLoader message="Loading verification queue..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">Business Verifications</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review and approve supplier & buyer organization credentials
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

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-card text-foreground shadow-sm font-bold border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] ${
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary font-bold"
                    : "bg-card text-muted-foreground"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search business, reg #, country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-xl border border-border text-center p-6">
          <CheckCircle2 size={36} className="text-emerald-500 mb-2" />
          <p className="text-sm font-semibold text-foreground">
            {activeTab === "pending" ? "Queue is all clear!" : "No records found"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {activeTab === "pending"
              ? "No business applications currently awaiting review."
              : `There are no ${activeTab} business accounts matching your criteria.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((org) => (
              <motion.div
                key={org.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-card border border-border rounded-xl p-4 sm:p-5 hover:border-primary/30 transition-all shadow-sm"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                      <Building2 size={18} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-bold text-foreground truncate">{org.company_name}</h3>
                        <StatusBadge status={org.verification_level} />
                        {org.company_type && (
                          <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-medium uppercase">
                            {org.company_type}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {org.legal_registration_number && (
                          <span className="flex items-center gap-1">
                            <FileText size={12} /> Reg: {org.legal_registration_number}
                          </span>
                        )}
                        {(org.city || org.country) && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} /> {[org.city, org.country].filter(Boolean).join(", ")}
                          </span>
                        )}
                        {(org.owner as any)?.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={12} /> {(org.owner as any).email}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> Applied {new Date(org.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {org.description && (
                        <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2">{org.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border">
                    <Link
                      href={`/admin/verifications/${org.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold transition-colors"
                    >
                      <Eye size={13} /> View Docs
                    </Link>

                    {org.verification_level === "pending" && (
                      <>
                        <button
                          onClick={() => approveOrg(org)}
                          disabled={processingId === org.id}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-60"
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
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 border border-red-200 dark:border-red-900 text-xs font-semibold transition-colors disabled:opacity-60"
                        >
                          <XCircle size={13} /> Reject
                        </button>
                      </>
                    )}

                    {org.verification_level === "rejected" && (
                      <button
                        onClick={() => approveOrg(org)}
                        disabled={processingId === org.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-semibold transition-colors disabled:opacity-60"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-xl space-y-4"
            >
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <XCircle size={18} className="text-red-500" />
                  Reject Application
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-semibold text-foreground">{rejectModal.org.company_name}</span> will be notified with your feedback.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Reason for rejection <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. CAC certificate is illegible. Please re-upload a clear copy."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full p-3 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 resize-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={rejectOrg}
                  disabled={!rejectReason.trim() || processingId !== null}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {processingId ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  Confirm Rejection
                </button>
                <button
                  onClick={() => { setRejectModal(null); setRejectReason(""); }}
                  className="px-4 py-2 border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg font-semibold text-xs transition-colors"
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
