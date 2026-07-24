"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Check, ShieldCheck } from "lucide-react";

const validatePassword = (password: string): string[] => {
  const errors: string[] = [];
  if (password.length < 12) errors.push("At least 12 characters");
  if (!/[A-Z]/.test(password)) errors.push("One uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("One lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("One number");
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) errors.push("One special character");
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

function ResetPasswordContent() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const pwErrors = validatePassword(password);
    if (pwErrors.length > 0) { setError(`Password requirements: ${pwErrors.join(", ")}`); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      await supabase.auth.signOut();
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const strength = password ? getPasswordStrength(password) : null;

  if (success) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}
          className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={36} className="text-green-500" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-3">Password Reset!</h2>
        <p className="text-muted-foreground text-sm mb-2">Your password has been changed. All existing sessions have been signed out.</p>
        <p className="text-xs text-muted-foreground">Redirecting to login...</p>
      </motion.div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <ShieldCheck size={28} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-1">Set New Password</h1>
        <p className="text-sm text-muted-foreground">Enter a new secure password for your account.</p>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-5 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle size={18} /><span>{error}</span>
        </motion.div>
      )}

      <form onSubmit={handleReset} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium ml-1">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input type={showPassword ? "text" : "password"} required id="new-password" placeholder="Min. 12 characters"
              className="w-full pl-10 pr-12 py-3 bg-white/50 dark:bg-slate-900/50 border border-borderline rounded-xl focus:ring-2 focus:ring-primary/50 transition-all outline-none"
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {strength && (
            <div className="space-y-1.5 mt-2">
              <div className="flex gap-1">{[1,2,3,4,5].map((i) => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : "bg-muted"}`} />)}</div>
              <p className="text-xs text-muted-foreground">Strength: <span className="font-bold">{strength.label}</span></p>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium ml-1">Confirm New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input type={showConfirm ? "text" : "password"} required id="confirm-new-password" placeholder="Re-enter new password"
              className={`w-full pl-10 pr-12 py-3 bg-white/50 dark:bg-slate-900/50 border rounded-xl focus:ring-2 focus:ring-primary/50 transition-all outline-none ${confirmPassword && confirmPassword !== password ? "border-destructive" : "border-borderline"}`}
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {confirmPassword && password === confirmPassword && <div className="absolute right-12 top-1/2 -translate-y-1/2 text-green-500"><Check size={18} /></div>}
          </div>
        </div>

        <button type="submit" id="reset-password-submit" disabled={loading}
          className="w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50">
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative">
        <div className="glass rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-white/10">
          <Suspense fallback={<div className="text-center py-8 text-muted-foreground">Loading...</div>}>
            <AnimatePresence mode="wait"><ResetPasswordContent /></AnimatePresence>
          </Suspense>
        </div>
      </motion.div>
    </div>
  );
}
