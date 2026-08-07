"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  RefreshCw,
  Check,
  Timer,
} from "lucide-react";

/* ── Password validation ──────────────────────────────────────────────────── */
const validatePassword = (password: string): string[] => {
  const errors: string[] = [];
  if (password.length < 12) errors.push("At least 12 characters");
  if (!/[A-Z]/.test(password)) errors.push("One uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("One lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("One number");
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password))
    errors.push("One special character");
  return errors;
};

const getPasswordStrength = (password: string) => {
  const score = 5 - validatePassword(password).length;
  if (score <= 1) return { score, label: "Very Weak", color: "bg-red-500" };
  if (score === 2) return { score, label: "Weak", color: "bg-orange-500" };
  if (score === 3) return { score, label: "Fair", color: "bg-yellow-500" };
  if (score === 4) return { score, label: "Strong", color: "bg-blue-500" };
  return { score, label: "Very Strong", color: "bg-green-500" };
};

/* ── Step indicator ───────────────────────────────────────────────────────── */
function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`rounded-full transition-all duration-300 ${
            s === step
              ? "w-6 h-2.5 bg-primary"
              : s < step
              ? "w-2.5 h-2.5 bg-primary/40"
              : "w-2.5 h-2.5 bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

/* ── 6-digit OTP input boxes ─────────────────────────────────────────────── */
function OtpInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, "").split("").slice(0, 6);

  const handleChange = (index: number, char: string) => {
    const digit = char.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    const joined = next.join("");
    onChange(joined);
    if (digit && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, 5);
    refs.current[focusIdx]?.focus();
    e.preventDefault();
  };

  return (
    <div className="flex gap-2.5 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          className={`w-11 h-14 sm:w-12 sm:h-14 text-center text-xl font-black rounded-xl border-2 bg-white/50 dark:bg-slate-900/50 outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/30 ${
            d ? "border-primary/60 text-foreground" : "border-borderline text-transparent"
          }`}
        />
      ))}
    </div>
  );
}

/* ── Countdown timer hook ─────────────────────────────────────────────────── */
function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(0);

  const start = useCallback(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  return { seconds, start };
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // 60-second resend cooldown
  const resend = useCountdown(60);
  // 10-minute OTP expiry countdown
  const expiry = useCountdown(600);

  const strength = password ? getPasswordStrength(password) : null;

  /* ── Step 1: Send OTP ──────────────────────────────────────────────────── */
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (otpError) throw otpError;
      resend.start();
      expiry.start();
      setStep(2);
    } catch (err: unknown) {
      // Always show success to prevent email enumeration attacks
      resend.start();
      expiry.start();
      setStep(2);
      console.error("OTP send error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: Verify OTP ────────────────────────────────────────────────── */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp.replace(/\D/g, "").length < 6) {
      setError("Please enter all 6 digits of your OTP.");
      return;
    }
    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp.replace(/\D/g, ""),
        type: "email",
      });
      if (verifyError) throw verifyError;
      setStep(3);
    } catch (err: unknown) {
      setError(
        (err as { message?: string }).message ||
          "Invalid or expired OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ── Resend OTP ────────────────────────────────────────────────────────── */
  const handleResend = async () => {
    if (resend.seconds > 0) return;
    setError("");
    setOtp("");
    setLoading(true);
    try {
      await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
    } catch {
      // silent
    } finally {
      resend.start();
      expiry.start();
      setLoading(false);
    }
  };

  /* ── Step 3: Set new password ──────────────────────────────────────────── */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const pwErrors = validatePassword(password);
    if (pwErrors.length > 0) {
      setError(`Password must include: ${pwErrors.join(", ")}`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await supabase.auth.signOut();
      setDone(true);
      setTimeout(() => (window.location.href = "/login"), 3500);
    } catch (err: unknown) {
      setError(
        (err as { message?: string }).message ||
          "Failed to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ── Success screen ────────────────────────────────────────────────────── */
  if (done) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="glass rounded-3xl p-10 shadow-2xl border border-white/20 dark:border-white/10 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle size={38} className="text-green-500" />
            </motion.div>
            <h2 className="text-2xl font-black mb-2">Password Reset!</h2>
            <p className="text-muted-foreground text-sm mb-2">
              Your password has been changed. All existing sessions have been signed out.
            </p>
            <p className="text-xs text-muted-foreground animate-pulse">Redirecting to login…</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        <div className="glass rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-white/10">
          <StepDots step={step} />

          <AnimatePresence mode="wait">

            {/* ── Step 1: Enter Email ─────────────────────────────────── */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
                >
                  <ArrowLeft size={16} /> Back to login
                </Link>

                <div className="mb-7">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                    <Mail size={28} className="text-primary" />
                  </div>
                  <h1 className="text-2xl font-black mb-1.5">Forgot Password?</h1>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Enter your registered email. We&apos;ll send a 6-digit OTP code to verify it&apos;s you.
                  </p>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-5 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-3 text-sm">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="fp-email" className="text-sm font-semibold ml-0.5">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
                      <input
                        id="fp-email"
                        type="email"
                        required
                        autoFocus
                        placeholder="name@company.com"
                        className="w-full pl-10 pr-4 py-3 bg-white/50 dark:bg-slate-900/50 border border-borderline rounded-xl focus:ring-2 focus:ring-primary/50 transition-all outline-none text-sm"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="send-otp-btn"
                    disabled={loading}
                    className="w-full py-3.5 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 text-sm"
                  >
                    {loading ? "Sending OTP…" : "Send OTP Code"}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Step 2: Enter OTP ───────────────────────────────────── */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <button
                  onClick={() => { setStep(1); setOtp(""); setError(""); }}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
                >
                  <ArrowLeft size={16} /> Change email
                </button>

                <div className="mb-7 text-center">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                    <ShieldCheck size={28} className="text-primary" />
                  </div>
                  <h1 className="text-2xl font-black mb-1.5">Enter OTP Code</h1>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    We sent a 6-digit code to <strong className="text-foreground">{email}</strong>. Check your inbox (and spam folder).
                  </p>
                </div>

                {/* OTP expiry countdown */}
                {expiry.seconds > 0 && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold mb-5">
                    <Timer size={13} />
                    Code expires in {Math.floor(expiry.seconds / 60)}:{String(expiry.seconds % 60).padStart(2, "0")}
                  </div>
                )}

                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-5 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-3 text-sm">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <OtpInput value={otp} onChange={setOtp} />

                  <button
                    type="submit"
                    id="verify-otp-btn"
                    disabled={loading || otp.replace(/\D/g, "").length < 6}
                    className="w-full py-3.5 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 text-sm"
                  >
                    {loading ? "Verifying…" : "Verify OTP"}
                  </button>
                </form>

                {/* Resend with 60-second cooldown */}
                <div className="mt-5 text-center">
                  {resend.seconds > 0 ? (
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                      <RefreshCw size={12} className="animate-spin" />
                      Resend available in <span className="font-bold text-foreground">{resend.seconds}s</span>
                    </p>
                  ) : (
                    <button
                      onClick={handleResend}
                      disabled={loading}
                      className="text-xs font-bold text-primary hover:underline disabled:opacity-50 flex items-center gap-1.5 mx-auto"
                    >
                      <RefreshCw size={12} /> Resend OTP
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Set New Password ────────────────────────────── */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="mb-7">
                  <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center mb-4">
                    <Lock size={28} className="text-green-500" />
                  </div>
                  <h1 className="text-2xl font-black mb-1.5">Set New Password</h1>
                  <p className="text-muted-foreground text-sm">Identity verified ✅ — choose a strong new password for your account.</p>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-5 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-3 text-sm">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-4">
                  {/* New password */}
                  <div className="space-y-1.5">
                    <label htmlFor="new-pw" className="text-sm font-semibold ml-0.5">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
                      <input
                        id="new-pw"
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Min. 12 characters"
                        className="w-full pl-10 pr-12 py-3 bg-white/50 dark:bg-slate-900/50 border border-borderline rounded-xl focus:ring-2 focus:ring-primary/50 transition-all outline-none text-sm"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    {strength && (
                      <div className="space-y-1.5 mt-2">
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map((i) => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : "bg-muted"}`} />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">Strength: <span className="font-bold">{strength.label}</span></p>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-1.5">
                    <label htmlFor="confirm-pw" className="text-sm font-semibold ml-0.5">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
                      <input
                        id="confirm-pw"
                        type={showConfirm ? "text" : "password"}
                        required
                        placeholder="Re-enter new password"
                        className={`w-full pl-10 pr-12 py-3 bg-white/50 dark:bg-slate-900/50 border rounded-xl focus:ring-2 focus:ring-primary/50 transition-all outline-none text-sm ${
                          confirmPassword && confirmPassword !== password ? "border-destructive" : "border-borderline"
                        }`}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                        {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                      {confirmPassword && password === confirmPassword && (
                        <div className="absolute right-10 top-1/2 -translate-y-1/2 text-green-500"><Check size={17} /></div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="reset-password-submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 text-sm"
                  >
                    {loading ? "Resetting…" : "Reset Password"}
                  </button>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
