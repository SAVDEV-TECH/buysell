"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Mail, Lock, User, ArrowRight, ShieldCheck, ShoppingCart, TrendingUp, Briefcase, Zap, AlertCircle, CheckCircle2 } from "lucide-react";

const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.11c-.22-.67-.35-1.39-.35-2.11s.13-1.44.35-2.11V7.05H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.95l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51z" fill="#EA4335"/>
    </svg>
  );
import { UserRole } from "@/context/AuthContext";

export default function RegisterPage() {
  const [role, setRole] = useState<UserRole>("WHOLESALER");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      // Save role in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: name,
        email: email,
        role: role,
        isVerified: false,
        createdAt: new Date(),
      });

      router.push("/dashboard");
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
     // If user registers with Google, we should ideally ask for role first
     setError("");
     setLoading(true);
     const provider = new GoogleAuthProvider();
     try {
       const userCredential = await signInWithPopup(auth, provider);
       const user = userCredential.user;

       // Check if user already has a role
       const userDoc = await getDoc(doc(db, "users", user.uid));
       if (!userDoc.exists()) {
           await setDoc(doc(db, "users", user.uid), {
               uid: user.uid,
               name: user.displayName,
               email: user.email,
               role: role, // Use the selected role
               isVerified: false,
               createdAt: new Date(),
           });
       }
       router.push("/dashboard");
     } catch (err: unknown) {
       setError((err as { message?: string }).message || "Google registration failed.");
     } finally {
       setLoading(false);
     }
  };

  const roles = [
    { 
       id: "MANUFACTURER", 
       title: "Manufacturer", 
       desc: "Showcase credentials and sell directly to wholesalers.",
       icon: <Zap size={24} />,
       color: "bg-accent/10 text-accent"
    },
    { 
       id: "WHOLESALER", 
       title: "Wholesaler", 
       desc: "Procure directly from manufacturers and manage bulk inventory.",
       icon: <Briefcase size={24} />,
       color: "bg-primary/10 text-primary"
    },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-20 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -left-20 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl relative"
      >
        <div className="glass rounded-[2rem] p-8 md:p-12 shadow-2xl border border-white/20 dark:border-white/10">
          <div className="text-center mb-10">
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase mb-4 tracking-wider">
               <Zap size={14} /> Join BuySell Marketplace
             </div>
            <h1 className="text-4xl font-bold mb-3">Create Account</h1>
            <p className="text-muted-foreground">Select your profile type and complete your details</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-8 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl flex items-center gap-3 text-sm"
            >
              <AlertCircle size={20} />
              <span>{error}</span>
            </motion.div>
          )}

          <div className="space-y-8">
            {/* Role Selection */}
            <div>
              <label className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4 block ml-1 italic">I want to...</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id as UserRole)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all relative group h-full ${
                      role === r.id 
                      ? "border-primary bg-primary/5 ring-4 ring-primary/10 shadow-lg" 
                      : "border-borderline hover:border-primary/30 bg-white/50 dark:bg-slate-900/50"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${r.color} group-hover:scale-110 transition-transform`}>
                      {r.icon}
                    </div>
                    <h3 className="font-bold text-sm mb-1">{r.title}</h3>
                    <p className="text-[10px] text-muted-foreground leading-tight">{r.desc}</p>
                    {role === r.id && (
                      <div className="absolute top-3 right-3 text-primary bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-sm border border-primary/20">
                        <CheckCircle2 size={14} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-bold ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-slate-900/50 border border-borderline rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-slate-900/50 border border-borderline rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-slate-900/50 border border-borderline rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-primary/20 disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Account"}
                  <UserPlus size={22} />
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleRegister}
                  className="px-8 py-4 glass border-borderline rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-muted/50 transition-all disabled:opacity-50"
                >
                  <GoogleIcon />
                  Google
                </button>
              </div>
            </form>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
