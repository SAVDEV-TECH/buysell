"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { motion } from "framer-motion";

export default function VerifyEmailPage() {
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);
  const [resendSent, setResendSent] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!auth.currentUser) {
      router.push("/login");
      return;
    }

    // Check verification status every 2 seconds
    const interval = setInterval(async () => {
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        setVerified(true);
        setChecking(false);
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      }
    }, 2000);

    setChecking(false);
    return () => clearInterval(interval);
  }, [router]);

  const handleResendEmail = async () => {
    try {
      if (auth.currentUser) {
        const { sendEmailVerification } = await import("firebase/auth");
        await sendEmailVerification(auth.currentUser);
        setResendSent(true);
        setTimeout(() => setResendSent(false), 3000);
      }
    } catch (error) {
      console.error("Error resending email:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="glass rounded-2xl border border-borderline p-8 text-center">
          {/* Header */}
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
                ? "Your email has been verified. Redirecting to dashboard..."
                : "We've sent a verification link to your email. Please click it to continue."}
            </p>
          </div>

          {/* Status Message */}
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

          {/* Verification Status */}
          {!verified && (
            <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-amber-600 text-sm mb-3">
                <Loader size={16} className="animate-spin" />
                <span>Waiting for email verification...</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Check your spam folder if you don't see the email
              </p>
            </div>
          )}

          {/* Success Message */}
          {verified && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-8 p-4 bg-green-500/10 border border-green-500/20 rounded-lg"
            >
              <div className="flex items-center justify-center gap-2 text-green-600 text-sm">
                <CheckCircle size={16} />
                <span>Email verified successfully!</span>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {!verified && (
              <>
                <button
                  onClick={handleResendEmail}
                  disabled={resendSent}
                  className="w-full px-4 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-all disabled:opacity-50 font-medium text-sm"
                >
                  {resendSent ? "Email Sent!" : "Resend Verification Email"}
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
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-muted-foreground"
              >
                Redirecting to dashboard...
              </motion.div>
            )}
          </div>

          {/* Footer Help Text */}
          <div className="mt-6 pt-6 border-t border-borderline/30">
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
