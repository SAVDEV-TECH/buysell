"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { 
  ShieldCheck, 
  CheckCircle, 
  FileText, 
  MapPin, 
  Briefcase, 
  Upload, 
  Loader2, 
  AlertCircle,
  Building
} from "lucide-react";
import { motion } from "framer-motion";

export default function VerificationPage() {
  const { user, profile, organizationId, verificationLevel } = useAuth();
  const supabase = createClient();

  const [businessName, setBusinessName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile?.organization) {
      setBusinessName(profile.organization.company_name || "");
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;

    setSaving(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          company_name: businessName,
          legal_registration_number: registrationNumber,
          verification_level: "pending",
          kyb_data: { address: businessAddress },
        })
        .eq("id", organizationId);

      if (updateError) throw updateError;

      setSuccess(true);
    } catch (err: any) {
      console.error("Verification submit error:", err);
      setError(err.message || "Failed to submit verification details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 size={48} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
          <Building size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Business Verification</h1>
          <p className="text-muted-foreground">Verify your corporate credentials in PostgreSQL</p>
        </div>
      </div>

      {verificationLevel === "verified" ? (
        <div className="glass rounded-[2.5rem] border-2 border-emerald-500/20 bg-emerald-500/5 p-10 flex items-center gap-6">
          <ShieldCheck size={44} className="text-emerald-500" />
          <div>
            <h2 className="text-2xl font-black">Company Verified</h2>
            <p className="text-sm text-muted-foreground">Your business has passed corporate KYB verification audits.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass rounded-[2.5rem] p-8 md:p-12 border border-borderline space-y-8">
          <div>
            <h3 className="text-2xl font-black mb-2 font-mono">KYB Verification Protocol</h3>
            <p className="text-muted-foreground text-sm font-medium">Submit legal registration details for PostgreSQL verification.</p>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl flex items-center gap-3 text-sm font-medium">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-600 rounded-2xl flex items-center gap-3 text-sm font-medium">
              <CheckCircle size={18} />
              <span>Verification request submitted successfully!</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold ml-1">Business Legal Name</label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input 
                  type="text" 
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Acme Corp Ltd"
                  className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-slate-900/50 border border-borderline rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold ml-1">Registration / License Number</label>
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input 
                  type="text" 
                  required
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="e.g. RC-123456"
                  className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-slate-900/50 border border-borderline rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold ml-1">Corporate Address</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-4 text-muted-foreground" size={18} />
              <textarea 
                required
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                rows={3}
                placeholder="Full address..."
                className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-slate-900/50 border border-borderline rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />} Submit Audit Request
          </button>
        </form>
      )}
    </div>
  );
}
