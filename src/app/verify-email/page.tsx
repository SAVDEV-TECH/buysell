"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, CheckCircle, Loader, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

export default function VerifyEmailPage() {
  const [verified, setVerified] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Poll every 3 seconds to check if the user has clicked the verification link
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) {
        setVerified(true);
        clearInterval(interval);
        setTimeout(() => router.push("/dashboard"), 2500);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [router, supabase]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      await supabase.auth.resend({ type: "signup", email: user.email });
      setResendSent(true);
      setResendCooldown(60);
      setTimeout(() => setResendSent(false), 4000);
    } catch (error) {
      console.error("Error resending verification email:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          {/* Header icon */}
          <div className="mb-8">
            {verified ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4"
              >
                <CheckCircle size={32} className="text-green-500" />
              </motion.div>
            ) : (
              <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <Mail size={32} className="text-primary" />
              </div>
            )}

            <h1 className="text-2xl font-bold mb-2">
              {verified ? "Email Verified!" : "Verify Your Email"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {verified
                ? "Your email has been verified. Taking you to your dashboard…"
                : "We've sent a verification link to your email. Please click it to continue."}
            </p>
          </div>

          {/* Resend success */}
          {resendSent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-500 text-sm"
            >
              <CheckCircle size={16} />
              <span>Verification email sent!</span>
            </motion.div>
          )}

          {/* Waiting state */}
          {!verified && (
            <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-amber-600 text-sm mb-3">
                <Loader size={16} className="animate-spin" />
                <span>Waiting for email verification…</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Check your spam folder if you don&apos;t see the email.
              </p>
            </div>
          )}

          {/* Verified state */}
          {verified && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-8 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 text-sm"
            >
              <CheckCircle size={16} className="inline mr-2" />
              Email verified successfully!
            </motion.div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            {!verified && (
              <>
                <button
                  onClick={handleResendEmail}
                  disabled={resendSent || resendCooldown > 0}
                  className="w-full px-4 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-all disabled:opacity-50 font-medium text-sm flex items-center justify-center gap-2"
                >
                  {resendCooldown > 0 ? (
                    <><RefreshCw size={14} className="animate-spin" /> Resend in {resendCooldown}s</>
                  ) : (
                    "Resend Verification Email"
                  )}
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all font-medium text-sm"
                >
                  Sign Out
                </button>
              </>
            )}

            {verified && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground animate-pulse">
                Redirecting to Dashboard…
              </motion.div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-border/30">
            <p className="text-xs text-muted-foreground">
              Need help?{" "}
              <Link href="/help" className="text-primary hover:underline">
                Contact support
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}