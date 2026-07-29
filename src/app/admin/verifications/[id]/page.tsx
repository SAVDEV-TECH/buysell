"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Mail,
  MapPin,
  Globe,
  FileText,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  User,
  Calendar,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";

interface OrgDetail {
  id: string;
  company_name: string;
  legal_registration_number?: string;
  company_type?: string;
  country?: string;
  city?: string;
  address?: string;
  website?: string;
  description?: string;
  verification_level: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  owner?: { full_name: string; email: string; created_at: string };
}

interface AuditEntry {
  id: string;
  action: string;
  notes?: string;
  created_at: string;
  actor?: { full_name: string; email: string };
}

export default function VerificationDetailPage() {
  const { id } = useParams();
  const { user, role } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState<"approve" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    if (role !== "super_admin" || !id) return;

    const fetchOrgDetail = async () => {
      setLoading(true);
      try {
        let { data: orgData, error: orgErr } = await supabase
          .from("organizations")
          .select(`*, owner:users(full_name, email, created_at)`)
          .eq("id", id as string)
          .maybeSingle();

        if (orgErr || !orgData) {
          const { data: rawOrg } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", id as string)
            .maybeSingle();

          if (rawOrg) {
            orgData = rawOrg;
            if (rawOrg.owner_id) {
              const { data: ownerUser } = await supabase
                .from("users")
                .select("full_name, email, created_at")
                .eq("id", rawOrg.owner_id)
                .maybeSingle();
              if (ownerUser) {
                orgData = { ...rawOrg, owner: ownerUser };
              }
            }
          }
        }

        setOrg(orgData as OrgDetail);

        // Fetch audit trail entries
        if (orgData) {
          let { data: actions } = await supabase
            .from("approval_actions")
            .select(`*, actor:users(full_name, email)`)
            .order("created_at", { ascending: false })
            .limit(20);

          if (!actions) {
            const { data: rawActions } = await supabase
              .from("approval_actions")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(20);
            actions = rawActions;
          }
          setAuditLog((actions as AuditEntry[]) || []);
        }
      } catch (err) {
        console.error("Detail fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrgDetail();
  }, [id, role, supabase]);

  const handleApprove = async () => {
    if (!org) return;
    setProcessingAction("approve");
    try {
      await supabase
        .from("organizations")
        .update({ verification_level: "verified", is_verified: true, is_active: true })
        .eq("id", org.id);

      const { data: orgUsers } = await supabase.from("users").select("id").eq("organization_id", org.id);
      for (const u of (orgUsers || [])) {
        await supabase.from("notifications").insert({
          user_id: u.id,
          title: "🎉 Business Verification Approved!",
          message: `"${org.company_name}" has been verified. You can now list products, receive orders, and access payouts.`,
          type: "VERIFICATION",
          link: "/dashboard",
          read: false,
        });
      }
      setOrg((prev) => prev ? { ...prev, verification_level: "verified", is_verified: true, is_active: true } : null);
      router.push("/admin/verifications");
    } catch (err) {
      console.error("Approve error:", err);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleReject = async () => {
    if (!org || !rejectReason.trim()) return;
    setProcessingAction("reject");
    try {
      await supabase
        .from("organizations")
        .update({ verification_level: "rejected", is_verified: false, is_active: false })
        .eq("id", org.id);

      const { data: orgUsers } = await supabase.from("users").select("id").eq("organization_id", org.id);
      for (const u of (orgUsers || [])) {
        await supabase.from("notifications").insert({
          user_id: u.id,
          title: "⚠️ Verification Application Rejected",
          message: `Your application for "${org.company_name}" was not approved. Reason: ${rejectReason}. You may update your documents and re-apply.`,
          type: "VERIFICATION",
          link: "/dashboard/verification",
          read: false,
        });
      }
      setOrg((prev) => prev ? { ...prev, verification_level: "rejected", is_verified: false, is_active: false } : null);
      router.push("/admin/verifications");
    } catch (err) {
      console.error("Reject error:", err);
    } finally {
      setProcessingAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={32} className="text-primary animate-spin" />
        <p className="text-slate-500 text-sm font-bold">Loading organization profile…</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle size={40} className="text-amber-400" />
        <p className="text-white font-black text-lg">Organization not found</p>
        <Link href="/admin/verifications" className="text-primary text-sm font-bold hover:underline">
          ← Back to queue
        </Link>
      </div>
    );
  }

  const statusColor =
    org.verification_level === "verified"
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : org.verification_level === "rejected"
      ? "text-red-400 bg-red-500/10 border-red-500/20"
      : "text-amber-400 bg-amber-500/10 border-amber-500/20 animate-pulse";

  const kybChecklist = [
    { label: "Company Name Provided", done: !!org.company_name },
    { label: "Registration Number on File", done: !!org.legal_registration_number },
    { label: "Country / Location Set", done: !!org.country },
    { label: "Owner Account Linked", done: !!(org.owner as any)?.email },
    { label: "Business Description Provided", done: !!org.description },
    { label: "Website / Contact Listed", done: !!org.website },
  ];

  const kybScore = kybChecklist.filter((c) => c.done).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Back + header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/verifications"
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-black text-white">{org.company_name}</h1>
          <p className="text-slate-500 text-xs font-bold">Organization Verification Profile</p>
        </div>
        <span className={`ml-auto px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider ${statusColor}`}>
          {org.verification_level}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Org Details */}
        <div className="lg:col-span-2 space-y-5">

          {/* Business Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
          >
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Building2 size={14} className="text-primary" />
              Business Details
            </h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: "Company Name", value: org.company_name, icon: <Building2 size={14} /> },
                { label: "Company Type", value: org.company_type || "—", icon: <FileText size={14} /> },
                { label: "Reg. Number", value: org.legal_registration_number || "Not provided", icon: <FileText size={14} /> },
                { label: "Location", value: [org.city, org.country].filter(Boolean).join(", ") || "—", icon: <MapPin size={14} /> },
                { label: "Website", value: org.website || "—", icon: <Globe size={14} /> },
                { label: "Applied On", value: new Date(org.created_at).toLocaleDateString(), icon: <Calendar size={14} /> },
              ].map((field) => (
                <div key={field.label} className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600">
                    {field.icon} {field.label}
                  </div>
                  <p className="font-bold text-slate-200 text-xs">
                    {field.label === "Website" && org.website ? (
                      <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                        {org.website} <ExternalLink size={10} />
                      </a>
                    ) : (
                      field.value
                    )}
                  </p>
                </div>
              ))}
            </div>

            {org.description && (
              <div className="pt-3 border-t border-slate-800">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1.5">Business Description</p>
                <p className="text-xs text-slate-400 leading-relaxed">{org.description}</p>
              </div>
            )}
          </motion.div>

          {/* Owner Info */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
          >
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <User size={14} className="text-primary" />
              Account Owner
            </h3>
            {(org.owner as any)?.email ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                  {(org.owner as any).full_name?.[0] || "?"}
                </div>
                <div>
                  <p className="font-black text-white text-sm">{(org.owner as any).full_name || "Unknown"}</p>
                  <p className="text-xs text-slate-400 font-bold flex items-center gap-1">
                    <Mail size={11} /> {(org.owner as any).email}
                  </p>
                  {(org.owner as any).created_at && (
                    <p className="text-[11px] text-slate-600 font-bold mt-0.5">
                      Joined {new Date((org.owner as any).created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-slate-600 text-sm font-bold">No owner linked to this organization.</p>
            )}
          </motion.div>

          {/* Decision Panel (only for pending) */}
          {org.verification_level === "pending" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-900 border border-amber-500/20 rounded-2xl p-6 space-y-4"
            >
              <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                <AlertTriangle size={14} /> Admin Decision Required
              </h3>

              {!showRejectForm ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={processingAction !== null}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-60"
                  >
                    {processingAction === "approve" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Approve & Verify
                  </button>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={processingAction !== null}
                    className="flex-1 py-3 bg-red-600/15 hover:bg-red-600/25 text-red-400 border border-red-600/20 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                  >
                    <XCircle size={16} />
                    Reject Application
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-300 uppercase tracking-widest">
                    Rejection Reason <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Explain why this application is being rejected. The applicant will receive this message."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full p-3.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-red-500/40 resize-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleReject}
                      disabled={!rejectReason.trim() || processingAction !== null}
                      className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {processingAction === "reject" ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                      Confirm Rejection
                    </button>
                    <button
                      onClick={() => { setShowRejectForm(false); setRejectReason(""); }}
                      className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold text-sm transition-all"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Right column: KYB Checklist + Audit */}
        <div className="space-y-5">

          {/* KYB Checklist */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <ShieldCheck size={14} className="text-primary" /> KYB Checklist
              </h3>
              <span className={`text-xs font-black ${kybScore >= 5 ? "text-emerald-400" : kybScore >= 3 ? "text-amber-400" : "text-red-400"}`}>
                {kybScore}/{kybChecklist.length}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${kybScore >= 5 ? "bg-emerald-400" : kybScore >= 3 ? "bg-amber-400" : "bg-red-400"}`}
                style={{ width: `${(kybScore / kybChecklist.length) * 100}%` }}
              />
            </div>

            <div className="space-y-2.5">
              {kybChecklist.map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  {item.done ? (
                    <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                  ) : (
                    <XCircle size={14} className="text-red-500/60 flex-shrink-0" />
                  )}
                  <span className={`text-xs font-bold ${item.done ? "text-slate-300" : "text-slate-600"}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Mini Audit Log */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4"
          >
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Clock size={14} className="text-primary" /> Recent Actions
            </h3>

            {auditLog.length === 0 ? (
              <p className="text-[11px] text-slate-600 font-bold">No admin actions recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {auditLog.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex flex-col gap-0.5">
                    <p className="text-[11px] font-black text-slate-300 capitalize">{entry.action}</p>
                    {entry.notes && (
                      <p className="text-[10px] text-slate-600 line-clamp-2">{entry.notes}</p>
                    )}
                    <p className="text-[10px] text-slate-700 font-bold">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <Link
              href="/admin/activity"
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
            >
              Full audit log <ExternalLink size={10} />
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
