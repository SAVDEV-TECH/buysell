"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { safeRedirectPath } from "@/lib/security";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Globe,
  Users,
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

/* ─── Trust badge ─────────────────────────────────────────────────────────── */
const TrustBadge = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="flex items-center gap-2 text-blue-200/70 text-xs">
    <Icon size={13} className="text-blue-400/80" />
    <span>{text}</span>
  </div>
);

/* ─── Brand panel stats ───────────────────────────────────────────────────── */
const Stat = ({ value, label }: { value: string; label: string }) => (
  <div className="text-center">
    <div className="text-2xl font-black text-white">{value}</div>
    <div className="text-xs text-blue-300/70 mt-0.5">{label}</div>
  </div>
);

/* ──────────────────────────────────────────────────────────────────────────── */

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();

  const supabase = createClient();

  // ── Auto-redirect already authenticated users ──────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const params = new URLSearchParams(window.location.search);
        router.replace(safeRedirectPath(params.get("redirect"), "/marketplace"));
      } else {
        setCheckingSession(false);
      }
    });
  }, [router, supabase]);

  const getRedirectPath = () => {
    if (typeof window === "undefined") return "/marketplace";
    const params = new URLSearchParams(window.location.search);
    return safeRedirectPath(params.get("redirect"), "/marketplace");
  };

  /** Routes the user based on account status and role. */
  const routeAfterAuth = async (userId: string) => {
    try {
      const { data, error: profileError } = await supabase
        .from("users")
        .select("*, organization:organizations(verification_level, is_active)")
        .eq("id", userId)
        .single();

      if (profileError || !data) {
        router.push("/onboarding/business");
        return;
      }

      if (!data.is_email_verified) {
        router.push("/verify-email");
        return;
      }

      const verificationStatus = data.organization?.verification_level;
      if (verificationStatus === "pending") {
        router.push("/pending-approval");
        return;
      }
      if (verificationStatus === "rejected") {
        router.push("/pending-approval?status=rejected");
        return;
      }
      if (data.organization && !data.organization.is_active) {
        router.push("/pending-approval?status=suspended");
        return;
      }

      if (!data.role) {
        router.push("/onboarding/business");
        return;
      }

      router.push(getRedirectPath());
    } catch {
      router.push(getRedirectPath());
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.toLowerCase().includes("invalid")) {
          setError("The email or password you entered is incorrect.");
        } else {
          setError(signInError.message);
        }
        return;
      }

      // MFA check — if next level is aal2, redirect to TOTP verification
      const { data: mfaData, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!mfaError && mfaData.nextLevel === "aal2" && mfaData.nextLevel !== mfaData.currentLevel) {
        router.push("/mfa-verify?method=totp");
        return;
      }

      if (data.user) await routeAfterAuth(data.user.id);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
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
      setError((err as { message?: string }).message || "Google sign-in failed.");
      setLoading(false);
    }
  };

  // ── While checking for an existing session, show a silent loading state ──
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <svg className="animate-spin text-blue-600" width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left: Brand Panel ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col justify-between p-12 xl:p-16 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 40%, #0f2460 70%, #1a3a8f 100%)",
        }}
      >
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)",
              animation: "pulse 8s ease-in-out infinite",
            }}
          />
          <div
            className="absolute -bottom-40 -right-20 w-[400px] h-[400px] rounded-full opacity-15"
            style={{
              background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)",
              animation: "pulse 10s ease-in-out infinite reverse",
            }}
          />
          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        {/* Logo / Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-lg"
              style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
            >
              B
            </div>
            <span className="text-white font-black text-xl tracking-tight">BuySell</span>
          </div>
          <div className="text-blue-400/60 text-xs font-medium uppercase tracking-widest">
            B2B Commerce Platform
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
          >
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] mb-5">
              The smarter way<br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(90deg, #60a5fa, #22d3ee)" }}
              >
                to trade B2B.
              </span>
            </h1>
            <p className="text-blue-200/70 text-base leading-relaxed max-w-sm">
              Connect with verified manufacturers, buyers, and suppliers worldwide.
              Streamline procurement, RFQs, and invoicing in one platform.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="flex items-center gap-8 py-6 border-y border-white/10"
          >
            <Stat value="12K+" label="Active Businesses" />
            <div className="w-px h-10 bg-white/10" />
            <Stat value="$2.4B" label="Trade Volume" />
            <div className="w-px h-10 bg-white/10" />
            <Stat value="98%" label="Satisfaction Rate" />
          </motion.div>

          {/* Testimonial */}
          <motion.blockquote
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="border-l-2 border-blue-500/60 pl-4"
          >
            <p className="text-blue-100/80 text-sm italic leading-relaxed">
              &ldquo;BuySell reduced our procurement cycle from 3 weeks to 4 days.
              The platform is exceptional.&rdquo;
            </p>
            <footer className="mt-2 text-blue-400/60 text-xs font-medium">
              — Sarah Chen, VP Procurement · TechManufacturing Inc.
            </footer>
          </motion.blockquote>
        </div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="relative z-10 flex flex-wrap items-center gap-x-6 gap-y-2"
        >
          <TrustBadge icon={ShieldCheck} text="256-bit SSL Encrypted" />
          <TrustBadge icon={ShieldCheck} text="SOC 2 Type II" />
          <TrustBadge icon={Globe} text="ISO 27001 Certified" />
          <TrustBadge icon={Users} text="GDPR Compliant" />
        </motion.div>
      </motion.div>

      {/* ── Right: Form Panel ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-background text-foreground relative">
        {/* Mobile logo bar */}
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
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2 tracking-tight">
              Welcome back
            </h2>
            <p className="text-muted-foreground text-sm">
              Sign in to your BuySell account to continue.
            </p>
          </div>

          {/* Google OAuth — primary CTA */}
          <button
            id="google-login-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-card border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-all shadow-sm mb-6 disabled:opacity-50"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              or sign in with email
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
                className="mb-5 p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl flex items-start gap-3 text-sm"
              >
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email / password form */}
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-bold text-foreground">
                Email address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-xs font-bold text-foreground">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2.5 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
                <button
                  type="button"
                  id="toggle-password-visibility"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                id="remember-me-checkbox"
                role="checkbox"
                aria-checked={rememberMe}
                tabIndex={0}
                onClick={() => setRememberMe((v) => !v)}
                onKeyDown={(e) => e.key === "Enter" && setRememberMe((v) => !v)}
                className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                  rememberMe
                    ? "bg-primary border-primary"
                    : "border-border bg-card"
                }`}
              >
                {rememberMe && (
                  <svg width="10" height="8" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-xs text-muted-foreground">Keep me signed in for 5 days</span>
            </label>

            {/* Submit */}
            <motion.button
              type="submit"
              id="login-submit"
              disabled={loading || !email || !password}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.99 }}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
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
                  Signing in…
                </>
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground mt-8">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
            >
              Create one free
            </Link>
          </p>

          {/* Security note */}
          <div className="mt-8 flex items-center justify-center gap-1.5 text-muted-foreground/50 text-xs">
            <TrendingUp size={11} />
            <span>Enterprise-grade security · Your data is always encrypted</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}