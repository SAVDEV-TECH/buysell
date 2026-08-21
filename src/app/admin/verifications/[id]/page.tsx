"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { safeHref } from "@/lib/security";
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
import BuySellLoader from "@/components/BuySellLoader";

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
  const { role } = useAuth();
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
    return <BuySellLoader message="Loading business profile..." fullScreen={false} />;
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 bg-card border border-border rounded-xl p-8 max-w-xl mx-auto text-center">
        <AlertTriangle size={36} className="text-amber-500" />
        <p className="text-base font-bold text-foreground">Organization not found</p>
        <p className="text-xs text-muted-foreground">The requested organization profile does not exist or has been removed.</p>
        <Link href="/admin/verifications" className="mt-2 text-xs font-semibold text-primary hover:underline">
          ← Back to Verification Queue
        </Link>
      </div>
    );
  }

  const statusColor =
    org.verification_level === "verified"
      ? "text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
      : org.verification_level === "rejected"
      ? "text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/40 border-red-200 dark:border-red-800"
      : "text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800";

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
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/verifications"
          className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">{org.company_name}</h1>
          <p className="text-xs text-muted-foreground">KYB Verification Profile</p>
        </div>
        <span className={`ml-auto px-2.5 py-0.5 rounded-full border text-xs font-semibold uppercase tracking-wider ${statusColor}`}>
          {org.verification_level}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Org Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Business Info Card */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Building2 size={14} className="text-primary" />
              Business Information
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              {[
                { label: "Company Name", value: org.company_name, icon: <Building2 size={13} /> },
                { label: "Company Type", value: org.company_type || "—", icon: <FileText size={13} /> },
                { label: "Reg. Number", value: org.legal_registration_number || "Not provided", icon: <FileText size={13} /> },
                { label: "Location", value: [org.city, org.country].filter(Boolean).join(", ") || "—", icon: <MapPin size={13} /> },
                { label: "Website", value: org.website || "—", icon: <Globe size={13} /> },
                { label: "Applied On", value: new Date(org.created_at).toLocaleDateString(), icon: <Calendar size={13} /> },
              ].map((field) => (
                <div key={field.label} className="space-y-0.5">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase">
                    {field.icon} {field.label}
                  </div>
                  <p className="font-semibold text-foreground text-xs">
                    {field.label === "Website" && org.website ? (
                      <a href={safeHref(org.website)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
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
              <div className="pt-3 border-t border-border">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Description</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{org.description}</p>
              </div>
            )}
          </div>

          {/* Owner Info */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User size={14} className="text-primary" />
              Account Owner
            </h3>
            {(org.owner as any)?.email ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {(org.owner as any).full_name?.[0] || "?"}
                </div>
                <div>
                  <p className="font-bold text-foreground text-xs">{(org.owner as any).full_name || "Account Admin"}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail size={11} /> {(org.owner as any).email}
                  </p>
                  {(org.owner as any).created_at && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Registered on {new Date((org.owner as any).created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">No owner profile attached.</p>
            )}
          </div>

          {/* Action Decision Panel */}
          {org.verification_level === "pending" && (
            <div className="bg-card border border-amber-200 dark:border-amber-800 rounded-xl p-5 space-y-3 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle size={14} /> Review Decision Required
              </h3>

              {!showRejectForm ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={processingAction !== null}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {processingAction === "approve" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Approve Business
                  </button>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={processingAction !== null}
                    className="flex-1 py-2 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <XCircle size={14} />
                    Reject Application
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    rows={3}
                    placeholder="Provide reason for rejection. This feedback will be sent directly to the applicant."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleReject}
                      disabled={!rejectReason.trim() || processingAction !== null}
                      className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {processingAction === "reject" ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                      Confirm Rejection
                    </button>
                    <button
                      onClick={() => { setShowRejectForm(false); setRejectReason(""); }}
                      className="px-4 py-2 border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg font-semibold text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: KYB Checklist + Audit */}
        <div className="space-y-4">
          {/* KYB Checklist */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-primary" /> KYB Checklist
              </h3>
              <span className={`text-xs font-bold ${kybScore >= 5 ? "text-emerald-600 dark:text-emerald-400" : kybScore >= 3 ? "text-amber-600 dark:text-amber-400" : "text-red-500"}`}>
                {kybScore}/{kybChecklist.length}
              </span>
            </div>

            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${kybScore >= 5 ? "bg-emerald-500" : kybScore >= 3 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${(kybScore / kybChecklist.length) * 100}%` }}
              />
            </div>

            <div className="space-y-2 pt-1">
              {kybChecklist.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-xs">
                  {item.done ? (
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle size={13} className="text-muted-foreground/50 shrink-0" />
                  )}
                  <span className={item.done ? "text-foreground font-medium" : "text-muted-foreground"}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mini Audit Log */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock size={14} className="text-primary" /> History Log
            </h3>

            {auditLog.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No recent administrative actions recorded.</p>
            ) : (
              <div className="space-y-2.5">
                {auditLog.slice(0, 4).map((entry) => (
                  <div key={entry.id} className="text-xs border-b border-border pb-2 last:border-b-0 last:pb-0">
                    <p className="font-semibold text-foreground capitalize">{entry.action}</p>
                    {entry.notes && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{entry.notes}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <Link
              href="/admin/activity"
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 pt-1"
            >
              Full audit log <ExternalLink size={10} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
