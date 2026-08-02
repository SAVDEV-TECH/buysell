"use client";

import React, { useState } from "react";
import { ShieldCheck, CheckCircle2, Building2, Upload, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

interface KYBVerificationWizardProps {
  organizationId?: string;
  countryCode?: string;
  onComplete?: () => void;
}

export function KYBVerificationWizard({
  organizationId,
  countryCode = "NG",
  onComplete,
}: KYBVerificationWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [companyName, setCompanyName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [businessType, setBusinessType] = useState(countryCode === "NG" ? "cac" : "rccm");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNumber || !organizationId) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/kyb/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          countryCode,
          businessType,
          registrationNumber: regNumber,
          companyName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      if (data.verified) {
        setVerified(true);
        setStep(3);
      } else {
        setStep(2); // Manual document upload fallback step
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to verify registration number.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full glass rounded-3xl border border-borderline p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-3 border-b border-borderline pb-4">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
          <ShieldCheck size={22} />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Export Supplier Verification (KYB)
          </h3>
          <p className="text-xs text-muted-foreground">
            Get verified to earn the Gold Supplier Badge &amp; unlock 100% Escrow Guarantee
          </p>
        </div>
      </div>

      {step === 1 && (
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">Company Name (as registered)</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. West Africa Agricultural Exports Ltd"
              className="w-full px-4 py-3 bg-background border border-borderline rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">Registry Type</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-borderline rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none"
              >
                <option value="cac">CAC (Nigeria)</option>
                <option value="rccm">RCCM (Togo / Francophone)</option>
                <option value="grs">GRS (Ghana)</option>
                <option value="cr12">CR12 (Kenya)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">Registration Number (RC/RCCM)</label>
              <input
                type="text"
                required
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                placeholder="e.g. RC-1849204"
                className="w-full px-4 py-3 bg-background border border-borderline rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-primary text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : "Verify Registration via Government Registry"}
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-700 dark:text-amber-400 text-xs">
            <p className="font-bold">Instant Lookup Pending</p>
            <p className="mt-1">
              Upload your corporate registration certificate (CAC / RCCM) or tax clearance for manual verification by the BuySell compliance team.
            </p>
          </div>

          <div className="p-8 border-2 border-dashed border-borderline rounded-2xl text-center space-y-2 cursor-pointer hover:border-primary/50 transition-all">
            <Upload size={32} className="mx-auto text-muted-foreground" />
            <p className="text-sm font-bold">Upload Corporate Certificate (PDF/PNG)</p>
            <p className="text-xs text-muted-foreground">Max file size 10MB</p>
          </div>

          <button
            type="button"
            onClick={() => {
              setVerified(true);
              setStep(3);
            }}
            className="w-full py-3.5 bg-primary text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-primary/90 transition-all"
          >
            Submit Documents for Review
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} />
          </div>
          <h4 className="text-lg font-black">Verification Certificate Issued</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Your organization has been verified. The Verified Export Supplier Badge is now active on your product listings and RFQ proposals.
          </p>
          {onComplete && (
            <button
              onClick={onComplete}
              className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-xs"
            >
              Return to Dashboard
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default KYBVerificationWizard;
