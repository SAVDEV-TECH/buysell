"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldCheck,
  Smartphone,
  QrCode,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";

export default function MfaSetupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<"choose" | "setup" | "done">("choose");

  // TOTP state
  const [factorId, setFactorId] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [secretCopied, setSecretCopied] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── TOTP Setup ──
  const startTotpSetup = async () => {
    setError("");
    setLoading(true);
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "BuySell Marketplace",
      });

      if (enrollError) throw enrollError;

      setFactorId(data.id);
      setTotpSecret(data.totp.secret);
      setTotpUri(data.totp.uri);
      setStep("setup");
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Failed to start TOTP setup");
    } finally {
      setLoading(false);
    }
  };

  const verifyTotp = async () => {
    setError("");
    if (!totpCode || totpCode.length !== 6) {
      setError("Please enter a 6-digit code");
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
        code: totpCode,
      });

      if (verifyError) throw verifyError;

      setStep("done");
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copySecret = async () => {
    if (totpSecret) {
      await navigator.clipboard.writeText(totpSecret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        <div className="glass rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-white/10">
          <AnimatePresence mode="wait">
            {step === "choose" && (
              <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Shield size={30} className="text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold mb-2">Enable Two-Factor Authentication</h1>
                  <p className="text-muted-foreground text-sm">
                    Add an extra layer of security to your business account.
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-2 text-sm">
                    <AlertCircle size={16} /> {error}
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    id="setup-totp-btn"
                    onClick={startTotpSetup}
                    disabled={loading}
                    className="w-full p-4 glass border-2 border-borderline rounded-2xl text-left hover:border-primary/50 hover:bg-primary/5 transition-all group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-all">
                        <Smartphone size={22} className="text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-sm flex items-center gap-2">
                          Authenticator App
                          <span className="text-[10px] bg-green-500/10 text-green-600 border border-green-500/20 px-1.5 py-0.5 rounded font-bold">RECOMMENDED</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Google Authenticator, Authy, or any TOTP app
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </div>
                  </button>
                </div>

                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full mt-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
                >
                  Skip for now
                </button>
              </motion.div>
            )}

            {step === "setup" && (
              <motion.div key="totp-setup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
                    <QrCode size={20} /> Scan QR Code
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Open your authenticator app and scan the QR code below.
                  </p>
                </div>

                <div className="flex items-center justify-center mb-4">
                  {totpUri ? (
                    <div className="p-4 bg-white rounded-2xl shadow-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(totpUri)}`}
                        alt="Authenticator QR Code"
                        width={180}
                        height={180}
                        className="rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-48 bg-muted rounded-2xl animate-pulse" />
                  )}
                </div>

                <div className="mb-5 p-3 bg-muted/50 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Can't scan? Enter this code manually:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono flex-1 break-all text-foreground">
                      {totpSecret || "Loading..."}
                    </code>
                    <button
                      onClick={copySecret}
                      className="p-1.5 hover:bg-muted rounded-lg transition-all flex-shrink-0"
                      title="Copy secret key"
                    >
                      {secretCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-muted-foreground" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-2 text-sm">
                    <AlertCircle size={16} /> {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium ml-1">Enter 6-digit code from app</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    id="totp-code-input"
                    placeholder="000000"
                    className="w-full px-4 py-3 bg-white/50 dark:bg-slate-900/50 border border-borderline rounded-xl focus:ring-2 focus:ring-primary/50 transition-all outline-none text-center font-mono text-2xl tracking-widest"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                </div>

                <button
                  id="verify-totp-btn"
                  onClick={verifyTotp}
                  disabled={loading || totpCode.length < 6}
                  className="w-full mt-4 py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify & Enable"}
                  <ShieldCheck size={18} />
                </button>

                <button onClick={() => { setStep("choose"); setError(""); }} className="w-full mt-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors text-center">
                  Choose different method
                </button>
              </motion.div>
            )}

            {step === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle size={36} className="text-green-500" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">MFA Enabled!</h2>
                <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                  Two-factor authentication is now active on your account.
                </p>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Go to Dashboard
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
