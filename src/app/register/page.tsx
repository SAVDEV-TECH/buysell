"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Check,
} from "lucide-react";

/* ─── Google SVG icon ─────────────────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.11c-.22-.67-.35-1.39-.35-2.11s.13-1.44.35-2.11V7.05H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.95l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51z" fill="#EA4335" />
  </svg>
);

/* ─── Password strength utilities ─────────────────────────────────────────── */
interface PasswordRequirement {
  label: string;
  met: boolean;
}

const getRequirements = (pw: string): PasswordRequirement[] => [
  { label: "At least 8 characters", met: pw.length >= 8 },
  { label: "One uppercase letter (A–Z)", met: /[A-Z]/.test(pw) },
  { label: "One lowercase letter (a–z)", met: /[a-z]/.test(pw) },
  { label: "One number (0–9)", met: /[0-9]/.test(pw) },
  { label: "One special character (!@#$…)", met: /[^A-Za-z0-9]/.test(pw) },
];

const getStrength = (pw: string) => {
  const met = getRequirements(pw).filter((r) => r.met).length;
  if (!pw) return { score: 0, label: "", color: "" };
  if (met <= 2) return { score: met, label: "Weak", color: "bg-red-500" };
  if (met === 3) return { score: met, label: "Fair", color: "bg-amber-500" };
  if (met === 4) return { score: met, label: "Strong", color: "bg-blue-500" };
  return { score: 5, label: "Very Strong", color: "bg-emerald-500" };
};

/* ──────────────────────────────────────────────────────────────────────────── */

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const strength = getStrength(password);
  const requirements = getRequirements(password);
  const allRequirementsMet = requirements.every((r) => r.met);
  const passwordsMatch = password === confirmPassword && confirmPassword !== "";

  const validate = (): string | null => {
    if (fullName.trim().length < 2) return "Please enter your full name (at least 2 characters).";
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email)) return "Please enter a valid email address.";
    if (!allRequirementsMet) return "Your password does not meet all requirements below.";
    if (password !== confirmPassword) return "Passwords do not match.";
    if (!agreeTerms) return "You must agree to the Terms of Service to continue.";
    return null;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    try {
      // 1. Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName.trim() },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Registration failed. Please try again.");

      const userId = authData.user.id;

      // 2. Insert a minimal public.users profile.
      //    Role defaults to "buyer_admin" — the user can upgrade their role
      //    (manufacturer / supplier / etc.) from the dashboard after sign-in.
      const { error: profileError } = await supabase.from("users").insert({
        id: userId,
        email: email.trim().toLowerCase(),
        password_hash: "SUPABASE_MANAGED",
        full_name: fullName.trim(),
        role: "buyer_admin",
        is_email_verified: authData.user.email_confirmed_at != null,
      });

      if (profileError) {
        // Profile row failed — log but don't block the user.
        // They'll be prompted to complete setup after email verification.
        console.warn("[register] Profile insert warning:", profileError.message);
      }

      router.push("/verify-email");
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message || "";
      if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already exists")) {
        setError("An account with this email already exists. Please sign in instead.");
      } else {
        setError(msg || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Google sign-up failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left: Brand panel ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="hidden lg:flex lg:w-[42%] xl:w-[40%] flex-col justify-between p-12 xl:p-14 relative overflow-hidden"
        style={{
          background: "linear-gradient(150deg, #0a0f1e 0%, #0d1b3e 50%, #111827 100%)",
        }}
      >
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }}
          />
          <div
            className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)" }}
          />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "50px 50px",
            }}
          />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-lg"
            style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
          >
            B
          </div>
          <div>
            <div className="text-white font-black text-xl tracking-tight">BuySell</div>
            <div className="text-blue-400/50 text-[10px] uppercase tracking-widest">B2B Platform</div>
          </div>
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="relative z-10 space-y-8"
        >
          <div>
            <h2 className="text-3xl xl:text-4xl font-black text-white leading-[1.15] mb-4">
              Join thousands of<br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(90deg, #60a5fa, #22d3ee)" }}
              >
                B2B businesses
              </span>
            </h2>
            <p className="text-blue-200/60 text-sm leading-relaxed">
              Create your account in under a minute. Start sourcing, selling, and
              growing your business network today.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-4">
            {[
              { title: "Free to get started", sub: "No credit card required" },
              { title: "Verified supplier network", sub: "Access 5,000+ vetted suppliers" },
              { title: "Upgrade anytime", sub: "Choose your business role in the dashboard" },
            ].map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={11} className="text-blue-400" strokeWidth={3} />
                </div>
                <div>
                  <div className="text-white text-sm font-semibold">{item.title}</div>
                  <div className="text-blue-300/50 text-xs">{item.sub}</div>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Footer note */}
        <div className="relative z-10 flex items-center gap-2 text-blue-400/40 text-xs">
          <ShieldCheck size={13} />
          <span>Your data is encrypted and never shared</span>
        </div>
      </motion.div>

      {/* ── Right: Form panel ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
        {/* Mobile logo */}
        <div className="lg:hidden absolute top-6 left-6 flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-sm"
            style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
          >
            B
          </div>
          <span className="font-black text-base">BuySell</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md py-8 lg:py-0"
        >
          {/* Header */}
          <div className="mb-7">
            <h1 className="text-3xl font-black text-foreground mb-2 tracking-tight">
              Create your account
            </h1>
            <p className="text-muted-foreground text-sm">
              Sign up free — no credit card required. You can set up your business
              profile after signing in.
            </p>
          </div>

          {/* Google Sign-Up */}
          <button
            id="google-register-btn"
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-foreground hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm hover:shadow-md mb-6 disabled:opacity-50"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              or register with email
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Error banner */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-5 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-400 rounded-xl flex items-start gap-3 text-sm"
              >
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleRegister} className="space-y-4" noValidate>
            {/* Full name */}
            <div className="space-y-1.5">
              <label htmlFor="register-name" className="text-sm font-semibold text-foreground">
                Full name
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="Jane Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="register-email" className="text-sm font-semibold text-foreground">
                Email address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="jane@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="register-password" className="text-sm font-semibold text-foreground">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setShowRequirements(true)}
                  className="w-full pl-10 pr-12 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength meter */}
              {password && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-2 pt-1"
                >
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          i <= strength.score ? strength.color : "bg-slate-200 dark:bg-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Password strength:{" "}
                    <span
                      className={`font-bold ${
                        strength.score <= 2
                          ? "text-red-500"
                          : strength.score === 3
                          ? "text-amber-500"
                          : strength.score === 4
                          ? "text-blue-500"
                          : "text-emerald-500"
                      }`}
                    >
                      {strength.label}
                    </span>
                  </p>
                </motion.div>
              )}

              {/* Requirements checklist */}
              <AnimatePresence>
                {showRequirements && password && (
                  <motion.ul
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5 pt-1 overflow-hidden"
                  >
                    {requirements.map((req) => (
                      <li key={req.label} className="flex items-center gap-2 text-xs">
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                            req.met
                              ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                          }`}
                        >
                          <Check size={9} strokeWidth={3} />
                        </div>
                        <span
                          className={`transition-colors ${
                            req.met ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"
                          }`}
                        >
                          {req.label}
                        </span>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label htmlFor="register-confirm-password" className="text-sm font-semibold text-foreground">
                Confirm password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  id="register-confirm-password"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-10 pr-12 py-3 bg-white dark:bg-slate-800 border rounded-xl text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 transition-all ${
                    confirmPassword && !passwordsMatch
                      ? "border-red-400 focus:ring-red-400/30 focus:border-red-400"
                      : passwordsMatch
                      ? "border-emerald-400 focus:ring-emerald-400/30 focus:border-emerald-400"
                      : "border-slate-200 dark:border-slate-700 focus:ring-blue-500/30 focus:border-blue-500"
                  }`}
                />
                {/* Eye toggle */}
                <button
                  type="button"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                {/* Match indicator */}
                {passwordsMatch && (
                  <CheckCircle2
                    size={16}
                    className="absolute right-10 top-1/2 -translate-y-1/2 text-emerald-500"
                  />
                )}
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
              )}
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
              <div
                id="agree-terms-checkbox"
                role="checkbox"
                aria-checked={agreeTerms}
                tabIndex={0}
                onClick={() => setAgreeTerms((v) => !v)}
                onKeyDown={(e) => e.key === "Enter" && setAgreeTerms((v) => !v)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all cursor-pointer ${
                  agreeTerms
                    ? "bg-blue-600 border-blue-600"
                    : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                }`}
              >
                {agreeTerms && (
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-muted-foreground leading-snug">
                I agree to the{" "}
                <Link href="/terms" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                  Privacy Policy
                </Link>
              </span>
            </label>

            {/* Submit */}
            <motion.button
              type="submit"
              id="register-submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.99 }}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                boxShadow: loading ? "none" : "0 4px 24px rgba(37,99,235,0.35)",
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creating account…
                </>
              ) : (
                <>
                  Create Account <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </form>

          {/* Sign-in link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
            >
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}