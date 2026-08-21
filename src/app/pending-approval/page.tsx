"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Clock, XCircle, AlertTriangle, Mail, LogOut,
  CheckCircle2, Building2, FileText, ShieldCheck,
  ChevronRight, Phone, RefreshCw, Loader2, Package,
  ArrowRight, Info
} from "lucide-react";
import { Suspense } from "react";
import BuySellLoader from "@/components/BuySellLoader";

// ─── Onboarding checklist steps ──────────────────────────────────────────────
const ONBOARDING_STEPS = [
  {
    id: "business_profile",
    label: "Business Profile",
    description: "Complete your company name, address, and industry",
    icon: Building2,
    href: "/onboarding/business",
    actionLabel: "Complete Profile →",
  },
  {
    id: "verification_docs",
    label: "Verification Documents",
    description: "Upload CAC certificate, tax ID, or business license",
    icon: FileText,
    href: "/dashboard/verification",
    actionLabel: "Upload Docs →",
  },
  {
    id: "admin_review",
    label: "Admin Review",
    description: "Our team reviews your submission (1–2 business days)",
    icon: ShieldCheck,
    href: null,
    actionLabel: null,
  },
  {
    id: "go_live",
    label: "Go Live on BuySell",
    description: "Start listing products and receiving B2B orders",
    icon: Package,
    href: "/dashboard",
    actionLabel: "Open Dashboard →",
  },
];

function PendingApprovalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const statusParam = (searchParams.get("status") || "pending") as "pending" | "rejected" | "suspended";
  const [profile, setProfile] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }

      // Fetch profile + org
      const [{ data: p }, { data: o }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("organizations").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setProfile(p);
      setOrg(o);
      setLoadingProfile(false);
    });
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setRefreshing(false); return; }
    const { data: o } = await supabase.from("organizations").select("*").eq("user_id", user.id).maybeSingle();
    setOrg(o);
    setRefreshing(false);
    // If now verified, redirect to dashboard
    if (o?.verification_level === "verified") {
      router.push("/dashboard");
    }
  };

  if (loadingProfile) return <BuySellLoader message="Loading your account…" fullScreen={false} />;

  // Determine step completion
  const hasOrg = !!org;
  const hasDocs = org?.verification_level !== undefined;
  const isRejected = statusParam === "rejected" || org?.verification_level === "rejected";
  const isSuspended = statusParam === "suspended";
  const isPending = !isRejected && !isSuspended;

  const stepStatus = [
    "done",                                          // business_profile — always done to reach this page
    hasOrg && org?.business_name ? "done" : "current", // verification_docs
    isPending && hasDocs ? "active" : "waiting",    // admin_review
    "waiting",                                       // go_live
  ];

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-3xl border p-6 text-center ${
          isRejected
            ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
            : isSuspended
            ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
            : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
        }`}
      >
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
          isRejected ? "bg-red-100 dark:bg-red-900/40" :
          isSuspended ? "bg-orange-100 dark:bg-orange-900/40" :
          "bg-amber-100 dark:bg-amber-900/40"
        }`}>
          {isRejected ? (
            <XCircle size={32} className="text-red-500" />
          ) : isSuspended ? (
            <AlertTriangle size={32} className="text-orange-500" />
          ) : (
            <Clock size={32} className="text-amber-500" />
          )}
        </div>

        <h1 className="text-xl font-black mb-1.5 text-slate-900 dark:text-white">
          {isRejected ? "Application Not Approved" :
           isSuspended ? "Account Suspended" :
           "Verification In Progress"}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-sm mx-auto">
          {isRejected
            ? "Your application didn't pass review this time. You can update your documents and re-apply below."
            : isSuspended
            ? "Your account has been temporarily suspended. Contact support for details."
            : `Hi ${profile?.full_name?.split(" ")[0] || "there"} 👋 Your business verification is under review. Typical review time is 1–2 business days.`}
        </p>

        {isPending && (
          <button
            onClick={handleRefreshStatus}
            disabled={refreshing}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-full text-xs font-black text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all"
          >
            {refreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Refresh Status
          </button>
        )}
      </motion.div>

      {/* Onboarding Progress Checklist */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass rounded-3xl border border-borderline p-5"
      >
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
          <ShieldCheck size={12} /> Verification Checklist
        </h2>

        <div className="space-y-1">
          {ONBOARDING_STEPS.map((step, i) => {
            const status = stepStatus[i];
            const Icon = step.icon;
            const isDone = status === "done";
            const isCurrent = status === "current" || status === "active";
            const isWaiting = status === "waiting";

            return (
              <div key={step.id} className="flex items-start gap-3">
                {/* Connector line + circle */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isDone
                      ? "bg-emerald-500"
                      : isCurrent
                      ? "bg-primary"
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}>
                    {isDone ? (
                      <CheckCircle2 size={16} className="text-white" />
                    ) : (
                      <Icon size={14} className={isCurrent ? "text-white" : "text-slate-400"} />
                    )}
                  </div>
                  {i < ONBOARDING_STEPS.length - 1 && (
                    <div className={`w-px h-8 mt-0.5 ${isDone ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700"}`} />
                  )}
                </div>

                {/* Content */}
                <div className={`pb-6 flex-1 ${i === ONBOARDING_STEPS.length - 1 ? "pb-0" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className={`text-sm font-black ${
                        isDone ? "text-emerald-600 dark:text-emerald-400" :
                        isCurrent ? "text-slate-900 dark:text-white" :
                        "text-slate-400 dark:text-slate-500"
                      }`}>
                        {step.label}
                        {isDone && <span className="ml-2 text-[10px] font-black uppercase tracking-wider text-emerald-500">✓ Done</span>}
                        {isCurrent && <span className="ml-2 text-[10px] font-black uppercase tracking-wider text-primary animate-pulse">● Action needed</span>}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {step.description}
                      </p>
                    </div>

                    {isCurrent && step.href && (
                      <Link
                        href={step.href}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-[11px] font-black hover:bg-primary/90 transition-all whitespace-nowrap"
                      >
                        {step.actionLabel}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Re-apply section (shown when rejected) */}
      {isRejected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-3xl p-5"
        >
          <div className="flex items-start gap-3">
            <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-black text-blue-900 dark:text-blue-300 mb-1">How to Re-Apply</p>
              <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed mb-3">
                Update your documents in the verification section, then submit again. Our team reviews re-applications within 24 hours.
              </p>
              <Link
                href="/dashboard/verification"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all"
              >
                <FileText size={12} /> Update & Re-submit Documents <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expected timeline card */}
      {isPending && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: "Submission", value: "Received ✓", color: "text-emerald-600" },
            { label: "Review Time", value: "1–2 Days", color: "text-amber-600" },
            { label: "Notification", value: "Via Email", color: "text-blue-600" },
          ].map((item) => (
            <div key={item.label} className="glass rounded-2xl border border-borderline p-3 text-center">
              <p className={`text-sm font-black ${item.color}`}>{item.value}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{item.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="space-y-2"
      >
        <Link
          href="mailto:savde388@gmail.com"
          className="w-full px-4 py-3 glass border border-borderline rounded-2xl hover:bg-muted transition-all font-bold text-sm flex items-center justify-center gap-2"
        >
          <Mail size={16} /> Contact Support
        </Link>
        <Link
          href="tel:+2348000000000"
          className="w-full px-4 py-3 glass border border-borderline rounded-2xl hover:bg-muted transition-all font-bold text-sm flex items-center justify-center gap-2"
        >
          <Phone size={16} /> Call Support Line
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl hover:bg-red-500/20 transition-all font-bold text-sm flex items-center justify-center gap-2"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </motion.div>
    </div>
  );
}

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full"
      >
        {/* BuySell wordmark at top */}
        <div className="text-center mb-6">
          <p className="text-2xl font-black">
            <span className="text-white">buy</span>
            <span className="text-orange-400">sell</span>
          </p>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">
            Supplier Verification Portal
          </p>
        </div>

        <Suspense fallback={<BuySellLoader message="Loading account…" fullScreen={false} />}>
          <PendingApprovalContent />
        </Suspense>
      </motion.div>
    </div>
  );
}
