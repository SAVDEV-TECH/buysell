"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { Shield, AlertCircle, ShieldCheck } from "lucide-react";

function MfaVerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const method = searchParams.get("method") || "totp";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);

  useEffect(() => {
    async function loadFactors() {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error || !data || data.totp.length === 0) {
        setError("No enrolled MFA factors found. Please log in again.");
        return;
      }
      setFactorId(data.totp[0].id);
    }
    loadFactors();
  }, [supabase]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!factorId) {
      setError("MFA session invalid or expired. Please log in again.");
      return;
    }
    if (!code || code.length < 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) throw verifyError;

      router.push("/dashboard");
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield size={30} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Two-Factor Verification</h1>
        <p className="text-muted-foreground text-sm">
          {method === "totp" ? "Enter the 6-digit code from your authenticator app." : "Enter the 6-digit code sent to your email."}
        </p>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mb-5 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle size={18} /><span>{error}</span>
        </motion.div>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium ml-1">{method === "totp" ? "Authenticator Code" : "Email OTP"}</label>
          <input type="text" inputMode="numeric" maxLength={6} id="mfa-verify-code" placeholder="000000" autoFocus
            className="w-full px-4 py-4 bg-card/50 border border-border rounded-xl focus:ring-2 focus:ring-primary/50 transition-all outline-none text-center font-mono text-3xl tracking-[0.5em]"
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
        </div>
        <button type="submit" id="mfa-verify-submit" disabled={loading || code.length < 6}
          className="w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50">
          {loading ? "Verifying..." : "Verify"}<ShieldCheck size={18} />
        </button>
        <button type="button" onClick={() => router.push("/login")}
          className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors text-center">
          Back to Login
        </button>
      </form>
    </div>
  );
}

export default function MfaVerifyPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm relative">
        <div className="bg-card rounded-3xl p-8 shadow-2xl border border-border/30">
          <Suspense fallback={<div className="text-center py-8 text-muted-foreground">Loading...</div>}>
            <MfaVerifyContent />
          </Suspense>
        </div>
      </motion.div>
    </div>
  );
}
