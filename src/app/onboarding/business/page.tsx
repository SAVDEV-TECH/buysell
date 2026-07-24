 "use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Building2,
  Globe,
  Phone,
  MapPin,
  Users,
  Package,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Loader2,
  Factory,
  ShoppingCart,
  Layers,
  FileText,
  ArrowRight,
  Briefcase,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrgType = "supplier" | "buyer" | "both";
type StepId = "role" | "company" | "details" | "done";

interface FormState {
  orgType: OrgType | null;
  companyName: string;
  registrationNumber: string;
  website: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  employeeCount: string;
  productCategories: string;
  annualRevenue: string;
  description: string;
}

const STEPS: { id: StepId; label: string }[] = [
  { id: "role", label: "Business Type" },
  { id: "company", label: "Company Info" },
  { id: "details", label: "Business Details" },
  { id: "done", label: "All Set!" },
];

const COUNTRIES = [
  "Nigeria","Ghana","Kenya","South Africa","Egypt","Ethiopia",
  "Tanzania","Uganda","Senegal","Côte d'Ivoire","Cameroon",
  "United States","United Kingdom","China","India","Germany",
  "France","UAE","Canada","Australia","Brazil","Other",
];

// Maps the full country name shown in the dropdown to the ISO-style code
// stored in organizations.country_code
const COUNTRY_CODES: Record<string, string> = {
  "Nigeria": "NG",
  "Ghana": "GH",
  "Kenya": "KE",
  "South Africa": "ZA",
  "Egypt": "EG",
  "Ethiopia": "ET",
  "Tanzania": "TZ",
  "Uganda": "UG",
  "Senegal": "SN",
  "Côte d'Ivoire": "CI",
  "Cameroon": "CM",
  "United States": "US",
  "United Kingdom": "GB",
  "China": "CN",
  "India": "IN",
  "Germany": "DE",
  "France": "FR",
  "UAE": "AE",
  "Canada": "CA",
  "Australia": "AU",
  "Brazil": "BR",
  "Other": "XX",
};

const EMPLOYEE_RANGES = ["1–10","11–50","51–200","201–500","501–1,000","1,000+"];
const REVENUE_RANGES  = ["Under $100K","$100K–$500K","$500K–$1M","$1M–$5M","$5M–$20M","$20M+"];

const inputCls =
  "w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-slate-400";

// ─── Field wrapper ─────────────────────────────────────────────────────────────
// Defined OUTSIDE parent — never recreated on state change
function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Step 1: Role ─────────────────────────────────────────────────────────────
// OUTSIDE parent — stable reference, inputs never remount
function StepRole({ orgType, setOrgType }: {
  orgType: OrgType | null;
  setOrgType: (v: OrgType) => void;
}) {
  const cards = [
    {
      type: "buyer" as OrgType,
      icon: <ShoppingCart size={24} className="text-blue-600" />,
      color: "bg-blue-100 dark:bg-blue-900/40",
      title: "Buyer / Wholesaler",
      description: "I want to source and purchase products in bulk from verified suppliers.",
    },
    {
      type: "supplier" as OrgType,
      icon: <Factory size={24} className="text-purple-600" />,
      color: "bg-purple-100 dark:bg-purple-900/40",
      title: "Manufacturer / Supplier",
      description: "I want to list my products and sell to businesses around the world.",
    },
    {
      type: "both" as OrgType,
      icon: <Layers size={24} className="text-orange-600" />,
      color: "bg-orange-100 dark:bg-orange-900/40",
      title: "Both — Buy & Sell",
      description: "My business both sources products from suppliers and sells our own goods.",
    },
  ];

  return (
    <div className="space-y-4">
      {cards.map(({ type, icon, color, title, description }) => {
        const selected = orgType === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => setOrgType(type)}
            className={`w-full text-left p-6 rounded-2xl border-2 transition-all duration-200 ${
              selected
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-[1.02]"
                : "border-slate-200 dark:border-slate-700 hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                {icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base">{title}</h3>
                  {selected && <CheckCircle2 size={20} className="text-primary flex-shrink-0" />}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Step 2: Company Info ─────────────────────────────────────────────────────
// OUTSIDE parent — inputs maintain focus correctly across re-renders
function StepCompany({ form, set }: {
  form: FormState;
  set: (field: keyof FormState, value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <Field label="Company / Business Name" required>
        <div className="relative">
          <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            className={inputCls + " pl-10"}
            placeholder="e.g. Acme Industries Ltd."
            value={form.companyName}
            onChange={(e) => set("companyName", e.target.value)}
          />
        </div>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Phone Number" required>
          <div className="relative">
            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              className={inputCls + " pl-10"}
              placeholder="+234 800 000 0000"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
        </Field>
        <Field label="Company Website">
          <div className="relative">
            <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              className={inputCls + " pl-10"}
              placeholder="https://yourcompany.com"
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
            />
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Country" required>
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
            <select
              className={inputCls + " pl-10 appearance-none"}
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
            >
              <option value="">Select country</option>
              {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </Field>
        <Field label="City">
          <input
            className={inputCls}
            placeholder="Lagos, Accra, Nairobi…"
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Business Registration Number">
        <div className="relative">
          <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            className={inputCls + " pl-10"}
            placeholder="RC 123456 / CAC No."
            value={form.registrationNumber}
            onChange={(e) => set("registrationNumber", e.target.value)}
          />
        </div>
      </Field>
    </div>
  );
}

// ─── Step 3: Business Details ─────────────────────────────────────────────────
// OUTSIDE parent — stable reference
function StepDetails({ form, set, submitError }: {
  form: FormState;
  set: (field: keyof FormState, value: string) => void;
  submitError: string;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Number of Employees" required>
          <div className="relative">
            <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              className={inputCls + " pl-10 appearance-none"}
              value={form.employeeCount}
              onChange={(e) => set("employeeCount", e.target.value)}
            >
              <option value="">Select range</option>
              {EMPLOYEE_RANGES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </Field>
        <Field label="Annual Revenue Range">
          <div className="relative">
            <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              className={inputCls + " pl-10 appearance-none"}
              value={form.annualRevenue}
              onChange={(e) => set("annualRevenue", e.target.value)}
            >
              <option value="">Select range</option>
              {REVENUE_RANGES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </Field>
      </div>

      <Field label="Main Product / Service Categories">
        <div className="relative">
          <Package size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            className={inputCls + " pl-10"}
            placeholder="e.g. Steel, Agricultural Produce, Textiles, Electronics"
            value={form.productCategories}
            onChange={(e) => set("productCategories", e.target.value)}
          />
        </div>
      </Field>

      <Field label="Business Description">
        <textarea
          rows={4}
          className={inputCls + " resize-none"}
          placeholder="Briefly describe what your business does, your key strengths, and what you're looking for on BuySell…"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </Field>

      {submitError && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          {submitError}
        </p>
      )}
    </div>
  );
}

// ─── Step 4: Done ─────────────────────────────────────────────────────────────
function StepDone({ companyName, onDashboard }: {
  companyName: string;
  onDashboard: () => void;
}) {
  return (
    <div className="text-center py-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/30"
      >
        <CheckCircle2 size={48} className="text-white" />
      </motion.div>

      <h2 className="text-2xl font-extrabold mb-2">Application Submitted!</h2>
      <p className="text-muted-foreground max-w-sm mx-auto mb-8">
        Your business profile for{" "}
        <span className="font-bold text-foreground">{companyName}</span> has been submitted
        for review. Our team typically verifies accounts within 24–48 hours.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 text-left">
        {[
          { icon: "✅", title: "Profile Created",   desc: "Your organization is in our system" },
          { icon: "🔍", title: "Under Review",       desc: "Our admins are verifying your info" },
          { icon: "🚀", title: "Go Live",            desc: "Start listing products once verified" },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="text-2xl mb-2">{icon}</div>
            <p className="font-bold text-sm">{title}</p>
            <p className="text-xs text-muted-foreground mt-1">{desc}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onDashboard}
          className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-primary text-white font-bold hover:bg-primary/90 hover:scale-105 transition-all shadow-xl shadow-primary/25"
        >
          Go to Dashboard <ArrowRight size={18} />
        </button>
        <Link
          href="/dashboard/verification"
          className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
        >
          Check Verification Status
        </Link>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OnboardingBusinessPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [form, setForm] = useState<FormState>({
    orgType: null,
    companyName: "",
    registrationNumber: "",
    website: "",
    phone: "",
    country: "",
    city: "",
    address: "",
    employeeCount: "",
    productCategories: "",
    annualRevenue: "",
    description: "",
  });

  const currentStep = STEPS[stepIndex].id;
  const isLastStep = stepIndex === STEPS.length - 2;

  // Stable setter — only the field value changes, not the function reference
  const set = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const setOrgType = (v: OrgType) =>
    setForm((prev) => ({ ...prev, orgType: v }));

  const canAdvance = () => {
    if (currentStep === "role")    return !!form.orgType;
    if (currentStep === "company") return form.companyName.trim().length > 1 && form.phone.trim().length > 4 && form.country.length > 0;
    if (currentStep === "details") return form.employeeCount.length > 0;
    return true;
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const regNum = form.registrationNumber.trim() || `REG-${Date.now().toString(36).toUpperCase()}`;

      // Table only has country_code (e.g. "NG"), not a full country name column
      const countryCode = COUNTRY_CODES[form.country] || "NG";

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          company_name:              form.companyName.trim(),
          organization_type:         form.orgType,
          legal_registration_number: regNum,
          registration_number:       regNum,
          phone:                     form.phone.trim() || null,
          website:                   form.website.trim() || null,
          country_code:              countryCode,
          city:                      form.city.trim() || null,
          address:                   form.address.trim() || null,
          employee_count:            form.employeeCount || null,
          annual_revenue_range:      form.annualRevenue || null,
          product_categories:        form.productCategories.trim() || null,
          description:               form.description.trim() || null,
          verification_level:        "unverified",
          is_active:                 false,
        })
        .select("id")
        .single();

      if (orgError) throw orgError;

      const newRole = form.orgType === "buyer" ? "buyer_admin" : "supplier_admin";
      const { error: userError } = await supabase
        .from("users")
        .update({ organization_id: org.id, role: newRole })
        .eq("id", user.id);

      if (userError) throw userError;

      setStepIndex(STEPS.length - 1);
    } catch (err: unknown) {
      setSubmitError(
        (err as { message?: string }).message || "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/20 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4">
            <Building2 size={12} /> Business Onboarding
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
            Set Up Your Business Profile
          </h1>
          <p className="text-muted-foreground">
            Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}! Complete these steps to unlock full platform access.
          </p>
        </div>

        {/* Progress stepper */}
        {currentStep !== "done" && (
          <div className="mb-8">
            <div className="flex items-center">
              {STEPS.filter((s) => s.id !== "done").map((step, i) => {
                const isActive = i === stepIndex;
                const isDone   = i < stepIndex;
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isDone   ? "bg-primary text-white" :
                        isActive ? "bg-primary text-white ring-4 ring-primary/20" :
                                   "bg-slate-100 dark:bg-slate-800 text-slate-400"
                      }`}>
                        {isDone ? <CheckCircle2 size={16} /> : i + 1}
                      </div>
                      <span className={`text-[10px] mt-1 font-medium hidden sm:block ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                        {step.label}
                      </span>
                    </div>
                    {i < STEPS.filter((s) => s.id !== "done").length - 1 && (
                      <div className={`h-0.5 flex-1 mx-2 rounded-full transition-all ${isDone ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xl shadow-slate-200/50 dark:shadow-black/20 overflow-hidden">

          {/* Card header */}
          {currentStep !== "done" && (
            <div className="px-8 pt-8 pb-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-extrabold">
                {currentStep === "role"    && "What best describes your business?"}
                {currentStep === "company" && "Tell us about your company"}
                {currentStep === "details" && "Final details"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {currentStep === "role"    && "Choose the role that matches how you plan to use BuySell."}
                {currentStep === "company" && "This information will appear on your public business profile."}
                {currentStep === "details" && "Help buyers and our team understand your business better."}
              </p>
            </div>
          )}

          {/* Step content — AnimatePresence slides between steps */}
          <div className="px-8 py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {currentStep === "role" && (
                  <StepRole orgType={form.orgType} setOrgType={setOrgType} />
                )}
                {currentStep === "company" && (
                  <StepCompany form={form} set={set} />
                )}
                {currentStep === "details" && (
                  <StepDetails form={form} set={set} submitError={submitError} />
                )}
                {currentStep === "done" && (
                  <StepDone companyName={form.companyName} onDashboard={() => router.push("/dashboard")} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation buttons */}
          {currentStep !== "done" && (
            <div className="px-8 pb-8 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setStepIndex((i) => i - 1)}
                disabled={stepIndex === 0}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                <ChevronLeft size={16} /> Back
              </button>

              <button
                type="button"
                disabled={!canAdvance() || submitting}
                onClick={() => {
                  if (isLastStep) handleSubmit();
                  else setStepIndex((i) => i + 1);
                }}
                className="flex items-center gap-2 px-7 py-3 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-40 hover:bg-primary/90 hover:scale-105 active:scale-100 transition-all shadow-lg shadow-primary/25"
              >
                {submitting ? (
                  <><Loader2 size={16} className="animate-spin" /> Submitting…</>
                ) : isLastStep ? (
                  <><CheckCircle2 size={16} /> Submit Application</>
                ) : (
                  <>Continue <ChevronRight size={16} /></>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer skip link */}
        {currentStep !== "done" && (
          <p className="text-center text-xs text-muted-foreground mt-6">
            Just browsing?{" "}
            <Link href="/dashboard" className="text-primary font-semibold hover:underline">
              Skip for now
            </Link>{" "}
            — you can always complete this later from your dashboard.
          </p>
        )}
      </div>
    </div>
  );
}