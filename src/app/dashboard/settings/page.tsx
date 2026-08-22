"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  Mail,
  MapPin,
  Phone,
  Briefcase,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  Settings as SettingsIcon,
  Globe,
  Building2,
  ShieldCheck,
  Bell,
  Lock,
  FileText,
  Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useCurrency } from "@/context/CurrencyContext";
import { SUPPORTED_CURRENCIES } from "@/lib/exchangeRates";

export default function SettingsPage() {
  const { user, profile, role, organizationId, verificationLevel } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Personal Profile state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Organization Profile state
  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [organizationType, setOrganizationType] = useState("manufacturer");
  const [website, setWebsite] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [description, setDescription] = useState("");

  // Notification Preferences
  const [notifyOrders, setNotifyOrders] = useState(true);
  const [notifyQuotes, setNotifyQuotes] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // ─── Load Profile & Organization Data ───────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      if (!user) return;
      setLoading(true);
      try {
        if (profile) {
          setFullName(profile.full_name || "");
          setEmail(profile.email || user.email || "");
          setPhone(profile.phone_number || "");
        }

        if (organizationId) {
          const { data: org } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", organizationId)
            .maybeSingle();

          if (org) {
            setCompanyName(org.company_name || "");
            setRegistrationNumber(org.legal_registration_number || org.registration_number || "");
            setOrganizationType(org.organization_type || "manufacturer");
            setWebsite(org.website || "");
            setBusinessPhone(org.phone || "");
            setAddress(org.address || "");
            setCity(org.city || "");
            setCountry(org.country || org.country_code || "Nigeria");
            setDescription(org.description || "");
          }
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, profile, organizationId, supabase]);

  // ─── Save Settings ──────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      // 1. Update User Profile
      const userPayload: any = {
        full_name: fullName.trim(),
      };
      if (phone.trim()) userPayload.phone_number = phone.trim();

      const { error: userErr } = await supabase
        .from("users")
        .update(userPayload)
        .eq("id", user.id);

      if (userErr) throw userErr;

      // 2. Update Organization Profile
      if (organizationId && companyName.trim()) {
        const orgPayload: any = {
          company_name: companyName.trim(),
          updated_at: new Date().toISOString(),
        };

        if (registrationNumber.trim()) {
          orgPayload.legal_registration_number = registrationNumber.trim();
        }
        if (website.trim()) orgPayload.website = website.trim();
        if (businessPhone.trim()) orgPayload.phone = businessPhone.trim();
        if (address.trim()) orgPayload.address = address.trim();
        if (city.trim()) orgPayload.city = city.trim();
        if (country) orgPayload.country = country;
        if (description.trim()) orgPayload.description = description.trim();

        const { error: orgErr } = await supabase
          .from("organizations")
          .update(orgPayload)
          .eq("id", organizationId);

        if (orgErr) throw orgErr;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error saving settings:", err);
      const msg = err?.message || err?.details || err?.hint || (typeof err === "object" ? JSON.stringify(err) : String(err));
      setError(msg || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 size={40} className="text-primary animate-spin mb-4" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading Account Settings…</p>
      </div>
    );
  }

  const isVerified = verificationLevel === "verified";

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Account & Organization Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your personal profile, B2B business details, and security preferences
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-2xl font-bold text-sm shadow-xl shadow-primary/25 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Save Changes
        </button>
      </div>

      {/* ── Verification Banner ── */}
      <div className={`p-6 rounded-3xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
        isVerified
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300"
          : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
            isVerified ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
          }`}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 className="font-black text-sm flex items-center gap-2">
              Organization Verification: {isVerified ? "Verified Business (Tier 1)" : "Pending Verification"}
              {isVerified && <VerifiedBadge />}
            </h3>
            <p className="text-xs opacity-80 mt-0.5">
              {isVerified
                ? "Your organization is fully verified to trade globally and receive escrow settlements."
                : "Submit business registration documents to earn the Verified Supplier Badge."}
            </p>
          </div>
        </div>

        {!isVerified && (
          <Link
            href="/dashboard/verification"
            className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-amber-600 transition-all shrink-0"
          >
            Complete KYB Audit
          </Link>
        )}
      </div>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-2xl text-xs font-bold flex items-center gap-2"
          >
            <CheckCircle size={18} /> Settings saved successfully to Supabase!
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-2xl text-xs font-bold flex items-center gap-2"
          >
            <AlertCircle size={18} /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSave} className="space-y-8">

        {/* ── Section 1: User Profile Settings ── */}
        <div className="bg-card rounded-3xl border border-border p-6 md:p-8 space-y-6">
          <h2 className="text-base font-black text-foreground flex items-center gap-2 border-b border-border pb-4">
            <User size={18} className="text-primary" /> Personal Profile
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">Full Name *</label>
              <div className="relative">
                <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-muted border border-border rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="e.g. John Doe"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">Email Address (Account ID)</label>
              <div className="relative">
                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full pl-11 pr-4 py-3 bg-muted/60 border border-border rounded-2xl text-xs font-medium text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-muted border border-border rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="+234 800 000 0000"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">Assigned Role</label>
              <div className="relative">
                <Briefcase size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  disabled
                  value={role || "Merchant"}
                  className="w-full pl-11 pr-4 py-3 bg-muted/60 border border-border rounded-2xl text-xs font-bold text-primary capitalize cursor-not-allowed"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-foreground block mb-1.5">Preferred Display Currency &amp; Localization</label>
              <div className="relative">
                <Globe size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-muted border border-border rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                >
                  {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} ({c.symbol}) — {c.name} ({c.countryName})
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Marketplace products will automatically display estimated price conversions in your preferred currency.
              </p>
            </div>
          </div>
        </div>

        {/* ── Section 2: Organization Business Profile ── */}
        <div className="bg-card rounded-3xl border border-border p-6 md:p-8 space-y-6">
          <h2 className="text-base font-black text-foreground flex items-center gap-2 border-b border-border pb-4">
            <Building2 size={18} className="text-primary" /> B2B Organization Profile
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">Company Legal Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="e.g. Lagos Industrial Manufacturing Ltd"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">Business Registration / RC Number</label>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-xs font-mono font-medium outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="e.g. RC-1928371"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">Business Type</label>
              <select
                value={organizationType}
                onChange={(e) => setOrganizationType(e.target.value)}
                className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="manufacturer">Manufacturer / Factory Direct</option>
                <option value="wholesaler">Wholesaler & Distributor</option>
                <option value="importer">Importer & Trader</option>
                <option value="buyer">Corporate Procurement Buyer</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">Official Website URL</label>
              <div className="relative">
                <Globe size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-muted border border-border rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="https://company.com"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">Business Phone</label>
              <input
                type="text"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="+234 1 234 5678"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">Country Headquarters</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="Nigeria">Nigeria</option>
                <option value="Ghana">Ghana</option>
                <option value="Kenya">Kenya</option>
                <option value="South Africa">South Africa</option>
                <option value="Egypt">Egypt</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="China">China</option>
                <option value="Germany">Germany</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">Headquarters Address</label>
            <div className="relative">
              <MapPin size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-muted border border-border rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="10 Industrial Avenue, Ikeja, Lagos"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">Business Overview & Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              placeholder="Describe your manufacturing capacity, products offered, export experience, and factory standards..."
            />
          </div>
        </div>

        {/* ── Section 3: Notification Preferences ── */}
        <div className="bg-card rounded-3xl border border-border p-6 md:p-8 space-y-6">
          <h2 className="text-base font-black text-foreground flex items-center gap-2 border-b border-border pb-4">
            <Bell size={18} className="text-primary" /> Real-Time Notification Preferences
          </h2>

          <div className="space-y-4">
            {[
              { label: "Trade Order Status Updates", desc: "Receive instant notifications when order status changes (Shipped, Delivered, Escrow Released).", state: notifyOrders, setState: setNotifyOrders },
              { label: "Quotation Proposals & RFQs", desc: "Alerts when suppliers submit quotes for your RFQs or buyers request quotations.", state: notifyQuotes, setState: setNotifyQuotes },
              { label: "Direct B2B Messages", desc: "Push alerts when verified buyers or suppliers message you in the Chat Hub.", state: notifyMessages, setState: setNotifyMessages },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-muted/40 border border-border">
                <div>
                  <p className="font-bold text-xs text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={item.state}
                  onChange={(e) => item.setState(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Submit Button ── */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-black text-base shadow-xl shadow-primary/25 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            Save All Settings
          </button>
        </div>

      </form>
    </div>
  );
}
