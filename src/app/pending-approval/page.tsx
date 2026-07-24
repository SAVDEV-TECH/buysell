"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, XCircle, AlertTriangle, Mail, LogOut, CheckCircle } from "lucide-react";
import { Suspense } from "react";

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/20",
    title: "Account Under Review",
    message: "Your business registration is being reviewed by our team. You'll receive an email notification once your account is approved.",
    badgeColor: "bg-amber-500/10 border-amber-500/20 text-amber-600",
    badgeText: "Pending Approval",
  },
  rejected: {
    icon: XCircle,
    iconColor: "text-destructive",
    iconBg: "bg-destructive/20",
    title: "Application Not Approved",
    message: "Unfortunately, your business registration was not approved at this time. Please contact support.",
    badgeColor: "bg-destructive/10 border-destructive/20 text-destructive",
    badgeText: "Not Approved",
  },
  suspended: {
    icon: AlertTriangle,
    iconColor: "text-orange-500",
    iconBg: "bg-orange-500/20",
    title: "Account Suspended",
    message: "Your account has been temporarily suspended.",
    badgeColor: "bg-orange-500/10 border-orange-500/20 text-orange-600",
    badgeText: "Suspended",
  },
};

function PendingApprovalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const statusParam = (searchParams.get("status") || "pending") as keyof typeof STATUS_CONFIG;
  const config = STATUS_CONFIG[statusParam] ?? STATUS_CONFIG.pending;
  const Icon = config.icon;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/login");
    });
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="glass rounded-2xl border border-borderline p-8 text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
        className={`mx-auto w-20 h-20 ${config.iconBg} rounded-full flex items-center justify-center mb-6`}>
        <Icon size={36} className={config.iconColor} />
      </motion.div>

      <div className={`inline-flex items-center gap-2 px-3 py-1 border rounded-full text-xs font-bold uppercase tracking-wider mb-4 ${config.badgeColor}`}>
        <div className="w-1.5 h-1.5 rounded-full bg-current" />
        {config.badgeText}
      </div>

      <h1 className="text-2xl font-bold mb-3">{config.title}</h1>
      <p className="text-muted-foreground text-sm leading-relaxed mb-8">{config.message}</p>

      <div className="space-y-3">
        <Link href="mailto:support@buysell.com"
          className="w-full px-4 py-2.5 bg-muted/50 text-foreground border border-borderline rounded-lg hover:bg-muted transition-all font-medium text-sm flex items-center justify-center gap-2">
          <Mail size={16} /> Contact Support
        </Link>
        <button onClick={handleSignOut}
          className="w-full px-4 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all font-medium text-sm flex items-center justify-center gap-2">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full">
        <Suspense fallback={<div className="text-center py-8 text-muted-foreground">Loading...</div>}>
          <PendingApprovalContent />
        </Suspense>
      </motion.div>
    </div>
  );
}
