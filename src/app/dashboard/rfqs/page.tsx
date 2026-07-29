"use client";

import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FileText,
  Clock,
  CheckCircle2,
  MessageSquare,
  DollarSign,
  Loader2,
  ChevronRight,
  ArrowRight,
  Package,
  Plus,
  X,
  Send,
  Building2,
  Globe,
  Tag,
  ShieldCheck,
  Search,
  Filter,
  Check,
  XCircle,
  Eye,
  Layers,
  ShoppingBag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { generateQuotationPDF } from "@/lib/pdfQuotationGenerator";

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface RFQ {
  id: string;
  buyer_organization_id?: string;
  buyer_user_id?: string;
  title: string;
  category_id?: string;
  quantity: number;
  unit_of_measure: string;
  target_price?: number;
  currency: string;
  destination_country: string;
  incoterms?: string;
  requirements_spec?: any;
  status: "published" | "closed" | "fulfilled" | "draft";
  expiry_date?: string;
  created_at: string;
  // joined
  buyer_organization?: { company_name: string; is_verified?: boolean } | null;
  buyer_profile?: { full_name: string; email?: string } | null;
  quotes_count?: number;
}

interface SupplierQuote {
  id: string;
  rfq_id: string;
  supplier_organization_id?: string;
  supplier_user_id?: string;
  unit_price: number;
  total_quantity: number;
  total_amount: number;
  currency: string;
  lead_time_days: number;
  incoterms: string;
  notes?: string;
  status: "submitted" | "accepted" | "rejected" | "withdrawn";
  created_at: string;
  // joined
  supplier_organization?: { company_name: string; is_verified?: boolean } | null;
  supplier_profile?: { full_name: string } | null;
}

const COUNTRIES = [
  "Nigeria", "Ghana", "Kenya", "South Africa", "Egypt", "Ethiopia",
  "United States", "United Kingdom", "China", "India", "Germany", "Other",
];

const INCOTERMS = ["FOB", "CIF", "EXW", "DDP", "CFR"];
const UNITS = ["pcs", "kg", "tons", "meters", "liters", "boxes", "pallets", "sets", "bags"];

export default function RFQManagementPage() {
  const { user, profile, organizationId } = useAuth();
  const { sendNotification } = useNotifications();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"marketplace" | "my_rfqs">("marketplace");
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Selected RFQ & Quotes
  const [selectedRFQ, setSelectedRFQ] = useState<RFQ | null>(null);
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [submittingQuote, setSubmittingQuote] = useState(false);

  // Create RFQ form state
  const [newRfq, setNewRfq] = useState({
    title: "",
    quantity: "1000",
    unitOfMeasure: "pcs",
    targetPrice: "",
    destinationCountry: "Nigeria",
    incoterms: "FOB",
    specifications: "",
  });

  // Submit Quote form state
  const [quoteForm, setQuoteForm] = useState({
    unitPrice: "",
    leadTime: "14",
    incoterm: "FOB",
    notes: "",
  });

  const [acceptingQuoteId, setAcceptingQuoteId] = useState<string | null>(null);

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // ─── Fetch RFQs ─────────────────────────────────────────────────────────────
  const fetchRFQs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("rfqs")
        .select(`
          *,
          buyer_organization:organizations!rfqs_buyer_organization_id_fkey(company_name, is_verified),
          buyer_profile:users!rfqs_buyer_user_id_fkey(full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (activeTab === "my_rfqs" && user) {
        query = query.or(`buyer_user_id.eq.${user.id},buyer_organization_id.eq.${organizationId}`);
      } else {
        query = query.eq("status", "published");
      }

      const { data, error } = await query;
      if (error) throw error;
      setRfqs((data as RFQ[]) || []);
    } catch (err) {
      console.warn("[RFQs] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, user, organizationId, supabase]);

  useEffect(() => {
    fetchRFQs();
  }, [fetchRFQs]);

  // ─── Fetch Quotes for Selected RFQ ──────────────────────────────────────────
  const fetchQuotesForRFQ = useCallback(async (rfqId: string) => {
    setLoadingQuotes(true);
    try {
      const { data, error } = await supabase
        .from("supplier_quotes")
        .select(`
          *,
          supplier_organization:organizations!supplier_quotes_supplier_organization_id_fkey(company_name, is_verified),
          supplier_profile:users!supplier_quotes_supplier_user_id_fkey(full_name)
        `)
        .eq("rfq_id", rfqId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuotes((data as SupplierQuote[]) || []);
    } catch (err) {
      console.warn("[Quotes] fetch error:", err);
    } finally {
      setLoadingQuotes(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (selectedRFQ) {
      fetchQuotesForRFQ(selectedRFQ.id);
    } else {
      setQuotes([]);
    }
  }, [selectedRFQ, fetchQuotesForRFQ]);

  // ─── Realtime Subscriptions ──────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("rfqs-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "rfqs" }, fetchRFQs)
      .on("postgres_changes", { event: "*", schema: "public", table: "supplier_quotes" }, () => {
        if (selectedRFQ) fetchQuotesForRFQ(selectedRFQ.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchRFQs, selectedRFQ, fetchQuotesForRFQ]);

  // ─── Create RFQ ─────────────────────────────────────────────────────────────
  const handleCreateRFQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreating(true);
    setCreateError("");

    try {
      const payload = {
        buyer_organization_id: organizationId || null,
        buyer_user_id: user.id,
        title: newRfq.title.trim(),
        quantity: Number(newRfq.quantity) || 100,
        unit_of_measure: newRfq.unitOfMeasure,
        target_price: Number(newRfq.targetPrice) || null,
        currency: "USD",
        destination_country: newRfq.destinationCountry,
        incoterms: newRfq.incoterms,
        status: "published",
        requirements_spec: {
          specifications: newRfq.specifications,
          buyer_email: user.email,
          buyer_name: profile?.full_name || "Buyer",
        },
      };

      const { data, error } = await supabase
        .from("rfqs")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;

      await sendNotification(
        user.id,
        "📋 RFQ Published",
        `Your RFQ "${newRfq.title}" was published to verified suppliers.`,
        "RFQ",
        "/dashboard/rfqs"
      );

      setShowCreateModal(false);
      setNewRfq({
        title: "",
        quantity: "1000",
        unitOfMeasure: "pcs",
        targetPrice: "",
        destinationCountry: "Nigeria",
        incoterms: "FOB",
        specifications: "",
      });
      fetchRFQs();
    } catch (err: any) {
      console.error("Error creating RFQ:", err);
      setCreateError(err.message || "Failed to create RFQ.");
    } finally {
      setCreating(false);
    }
  };

  // ─── Submit Quote ───────────────────────────────────────────────────────────
  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRFQ || !quoteForm.unitPrice) return;
    setSubmittingQuote(true);

    try {
      const unitP = Number(quoteForm.unitPrice);
      const qty = selectedRFQ.quantity || 100;
      const totalAmt = unitP * qty;

      const { error } = await supabase.from("supplier_quotes").insert({
        rfq_id: selectedRFQ.id,
        supplier_organization_id: organizationId || null,
        supplier_user_id: user.id,
        unit_price: unitP,
        total_quantity: qty,
        total_amount: totalAmt,
        currency: "USD",
        lead_time_days: Number(quoteForm.leadTime) || 14,
        incoterms: quoteForm.incoterm,
        notes: quoteForm.notes.trim() || null,
        status: "submitted",
      });

      if (error) throw error;

      if (selectedRFQ.buyer_user_id) {
        await sendNotification(
          selectedRFQ.buyer_user_id,
          "💬 New Quotation Received!",
          `A supplier submitted a quote ($${unitP}/unit) for RFQ "${selectedRFQ.title}".`,
          "RFQ",
          "/dashboard/rfqs"
        );
      }

      setShowQuoteModal(false);
      setQuoteForm({ unitPrice: "", leadTime: "14", incoterm: "FOB", notes: "" });
      fetchQuotesForRFQ(selectedRFQ.id);
    } catch (err: any) {
      console.error("Error submitting quote:", err);
      alert("Failed to submit quote: " + err.message);
    } finally {
      setSubmittingQuote(false);
    }
  };

  // ─── Accept Quote & Create Order ─────────────────────────────────────────────
  const handleAcceptQuote = async (quote: SupplierQuote) => {
    if (!user || !selectedRFQ) return;
    setAcceptingQuoteId(quote.id);

    try {
      // 1. Update quote status
      await supabase
        .from("supplier_quotes")
        .update({ status: "accepted" })
        .eq("id", quote.id);

      // 2. Reject other quotes for this RFQ
      await supabase
        .from("supplier_quotes")
        .update({ status: "rejected" })
        .eq("rfq_id", selectedRFQ.id)
        .neq("id", quote.id);

      // 3. Close the RFQ
      await supabase
        .from("rfqs")
        .update({ status: "fulfilled" })
        .eq("id", selectedRFQ.id);

      // 4. Create official Order in database
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          buyer_organization_id: organizationId || selectedRFQ.buyer_organization_id || null,
          supplier_organization_id: quote.supplier_organization_id || null,
          total_amount: quote.total_amount,
          currency: quote.currency || "USD",
          status: "processing",
          payment_status: "escrow_pending",
          shipping_address: { country: selectedRFQ.destination_country },
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (orderErr) throw orderErr;

      // 5. Notify Supplier
      if (quote.supplier_user_id) {
        await sendNotification(
          quote.supplier_user_id,
          "🎉 Proposal Accepted!",
          `Your quotation for "${selectedRFQ.title}" was accepted! Order generated.`,
          "ORDER",
          "/dashboard/orders"
        );
      }

      fetchQuotesForRFQ(selectedRFQ.id);
      fetchRFQs();
      router.push("/dashboard/orders");
    } catch (err: any) {
      console.error("Error accepting quote:", err);
      alert("Failed to accept quote: " + err.message);
    } finally {
      setAcceptingQuoteId(null);
    }
  };

  // ─── Filtered RFQs ───────────────────────────────────────────────────────────
  const filteredRFQs = rfqs.filter((r) => {
    const matchSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.destination_country.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">

      {/* ── Header & Action Bar ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Request for Quotations (RFQs)</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Global B2B sourcing engine · Post requests or submit competitive supplier proposals
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3.5 bg-primary text-white rounded-2xl font-bold text-sm shadow-xl shadow-primary/25 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus size={18} /> Post New RFQ
        </button>
      </div>

      {/* ── Mode Switcher & Filter Strip ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 glass p-3 rounded-3xl border border-borderline">
        {/* Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => { setActiveTab("marketplace"); setSelectedRFQ(null); }}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === "marketplace" ? "bg-white dark:bg-slate-900 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe size={14} /> Open Marketplace RFQs
          </button>
          <button
            onClick={() => { setActiveTab("my_rfqs"); setSelectedRFQ(null); }}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === "my_rfqs" ? "bg-white dark:bg-slate-900 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText size={14} /> My Posted RFQs
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title or country…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* ── Main Layout: RFQ Stream + Detailed Inspector ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Col: RFQ List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">
              {activeTab === "marketplace" ? "Live Sourcing Feed" : "Your Requests"} ({filteredRFQs.length})
            </span>
          </div>

          {loading ? (
            <div className="glass rounded-3xl p-16 flex flex-col items-center justify-center border border-borderline">
              <Loader2 size={32} className="text-primary animate-spin mb-3" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Syncing RFQ stream…</p>
            </div>
          ) : filteredRFQs.length === 0 ? (
            <div className="glass rounded-3xl p-12 text-center border border-dashed border-borderline space-y-4">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
                <FileText size={28} />
              </div>
              <div>
                <h3 className="text-base font-black">No RFQs Found</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeTab === "my_rfqs" ? "You haven't posted any RFQs yet." : "No open sourcing requests matching your criteria."}
                </p>
              </div>
              {activeTab === "my_rfqs" && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition-all"
                >
                  Post First RFQ
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
              {filteredRFQs.map((rfq) => {
                const isSelected = selectedRFQ?.id === rfq.id;
                const buyerOrg = (rfq.buyer_organization as any)?.company_name || (rfq.buyer_profile as any)?.full_name || "Verified Buyer";
                return (
                  <motion.div
                    key={rfq.id}
                    layout
                    onClick={() => setSelectedRFQ(rfq)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer relative group ${
                      isSelected
                        ? "bg-primary/5 border-primary shadow-lg shadow-primary/10"
                        : "glass border-borderline hover:border-primary/30"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-mono font-black uppercase tracking-widest text-primary">
                        RFQ-{rfq.id.slice(0, 6).toUpperCase()}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        rfq.status === "published" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                      }`}>
                        {rfq.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                      {rfq.title}
                    </h3>

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-semibold flex-wrap">
                      <span className="flex items-center gap-1"><Package size={12} /> {rfq.quantity.toLocaleString()} {rfq.unit_of_measure}</span>
                      <span className="flex items-center gap-1"><Globe size={12} /> {rfq.destination_country}</span>
                      {rfq.target_price && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          Target: ${rfq.target_price}/{rfq.unit_of_measure}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-borderline/50 flex justify-between items-center text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 font-bold">
                        <Building2 size={11} /> {buyerOrg}
                      </span>
                      <ChevronRight size={14} className={`transition-transform ${isSelected ? "translate-x-1 text-primary" : ""}`} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Inspection & Proposal Details (7 cols) */}
        <div className="lg:col-span-7">
          {selectedRFQ ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-3xl border border-borderline p-6 md:p-8 space-y-6 sticky top-6"
            >
              {/* Inspection Header */}
              <div className="flex justify-between items-start border-b border-borderline pb-5">
                <div>
                  <span className="text-[10px] font-mono font-black text-primary uppercase tracking-widest">
                    RFQ DETAILS · #{selectedRFQ.id.slice(0, 8)}
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">{selectedRFQ.title}</h2>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    Posted by {(selectedRFQ.buyer_organization as any)?.company_name || "Verified Buyer"} · Destination: <strong>{selectedRFQ.destination_country}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRFQ(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Quantity</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                    {selectedRFQ.quantity.toLocaleString()} {selectedRFQ.unit_of_measure}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Target Budget</p>
                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {selectedRFQ.target_price ? `$${selectedRFQ.target_price}/${selectedRFQ.unit_of_measure}` : "Flexible"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Incoterm</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{selectedRFQ.incoterms || "FOB"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</p>
                  <span className="inline-block mt-0.5 text-xs font-black uppercase text-primary">{selectedRFQ.status}</span>
                </div>
              </div>

              {/* Requirements Description */}
              {selectedRFQ.requirements_spec?.specifications && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Technical Specifications</h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-950/40 p-4 rounded-2xl border border-borderline leading-relaxed whitespace-pre-wrap">
                    {selectedRFQ.requirements_spec.specifications}
                  </p>
                </div>
              )}

              {/* ── Quotation Proposals Section ── */}
              <div className="space-y-4 pt-2 border-t border-borderline">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <DollarSign size={16} className="text-primary" /> Submitted Supplier Proposals ({quotes.length})
                  </h3>

                  {/* If supplier viewing, option to submit quote */}
                  {user && selectedRFQ.status === "published" && (
                    <button
                      onClick={() => setShowQuoteModal(true)}
                      className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-1.5"
                    >
                      <Send size={12} /> Submit Proposal
                    </button>
                  )}
                </div>

                {loadingQuotes ? (
                  <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin text-primary" /> Loading proposals…
                  </div>
                ) : quotes.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-borderline">
                    <p className="text-xs text-muted-foreground font-semibold">No quotations submitted for this RFQ yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {quotes.map((quote) => {
                      const isSupplierVerified = (quote.supplier_organization as any)?.is_verified;
                      const supplierName = (quote.supplier_organization as any)?.company_name || (quote.supplier_profile as any)?.full_name || "Verified Supplier";
                      const isBuyer = selectedRFQ.buyer_user_id === user?.id;

                      return (
                        <div
                          key={quote.id}
                          className={`p-4 rounded-2xl border transition-all space-y-3 ${
                            quote.status === "accepted"
                              ? "bg-emerald-500/10 border-emerald-500/30"
                              : "bg-white dark:bg-slate-900 border-borderline"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                {supplierName}
                                {isSupplierVerified && <VerifiedBadge />}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Submitted {new Date(quote.created_at).toLocaleDateString()}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-sm font-black text-slate-900 dark:text-white">
                                ${quote.unit_price}/{selectedRFQ.unit_of_measure}
                              </p>
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                Total: ${quote.total_amount.toLocaleString()} ({quote.incoterms})
                              </p>
                            </div>
                          </div>

                          {quote.notes && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl text-[11px]">
                              &ldquo;{quote.notes}&rdquo;
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-borderline/40 text-[10px] text-muted-foreground flex-wrap gap-2">
                            <span>⚡ Lead time: <strong>{quote.lead_time_days} days</strong></span>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => generateQuotationPDF({ rfq: selectedRFQ, quote })}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20 rounded-lg font-bold transition-all text-[11px]"
                              >
                                <FileText size={12} /> Download PDF Quote
                              </button>

                              {/* Actions for Buyer */}
                              {isBuyer && quote.status === "submitted" && (
                                <button
                                  onClick={() => handleAcceptQuote(quote)}
                                  disabled={acceptingQuoteId === quote.id}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
                                >
                                  {acceptingQuoteId === quote.id ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <Check size={12} />
                                  )}
                                  Accept & Generate Order
                                </button>
                              )}
                            </div>

                            {quote.status === "accepted" && (
                              <span className="flex items-center gap-1 text-emerald-600 font-black uppercase tracking-wider">
                                <CheckCircle2 size={12} /> Accepted & Order Generated
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="glass rounded-3xl border border-borderline p-16 text-center space-y-4 flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-3xl flex items-center justify-center shadow-inner">
                <FileText size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Select an RFQ to Inspect</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Click on any RFQ card from the left panel to review full specifications and submit or compare supplier proposals.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Create RFQ Modal ── */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-extrabold">Post Sourcing Request (RFQ)</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Broadcast custom specs to verified suppliers.</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
                >
                  <X size={18} />
                </button>
              </div>

              {createError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-600 rounded-xl text-xs font-bold">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreateRFQ} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5,000 Pcs Industrial Stainless Steel Valves"
                    value={newRfq.title}
                    onChange={(e) => setNewRfq({ ...newRfq, title: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Quantity *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newRfq.quantity}
                      onChange={(e) => setNewRfq({ ...newRfq, quantity: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Unit</label>
                    <select
                      value={newRfq.unitOfMeasure}
                      onChange={(e) => setNewRfq({ ...newRfq, unitOfMeasure: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40 bg-transparent"
                    >
                      {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Price / Unit ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 12.50"
                      value={newRfq.targetPrice}
                      onChange={(e) => setNewRfq({ ...newRfq, targetPrice: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Destination Country</label>
                    <select
                      value={newRfq.destinationCountry}
                      onChange={(e) => setNewRfq({ ...newRfq, destinationCountry: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40 bg-transparent"
                    >
                      {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Technical Specifications & Notes</label>
                  <textarea
                    rows={4}
                    placeholder="Specify dimensions, material grades, packaging requirements, certifications needed..."
                    value={newRfq.specifications}
                    onChange={(e) => setNewRfq({ ...newRfq, specifications: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {creating ? <Loader2 size={16} className="animate-spin" /> : "Publish RFQ"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Submit Supplier Quote Modal ── */}
      <AnimatePresence>
        {showQuoteModal && selectedRFQ && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black">Submit Quotation Proposal</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">For RFQ: {selectedRFQ.title}</p>
                </div>
                <button
                  onClick={() => setShowQuoteModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitQuote} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Unit Price ($ USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 10.50"
                    value={quoteForm.unitPrice}
                    onChange={(e) => setQuoteForm({ ...quoteForm, unitPrice: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {quoteForm.unitPrice && (
                    <p className="text-[10px] font-bold text-emerald-600 mt-1">
                      Calculated Total: ${(Number(quoteForm.unitPrice) * selectedRFQ.quantity).toLocaleString()} USD
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Lead Time (days)</label>
                    <input
                      type="number"
                      required
                      value={quoteForm.leadTime}
                      onChange={(e) => setQuoteForm({ ...quoteForm, leadTime: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Incoterms</label>
                    <select
                      value={quoteForm.incoterm}
                      onChange={(e) => setQuoteForm({ ...quoteForm, incoterm: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40 bg-transparent"
                    >
                      {INCOTERMS.map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Supplier Proposal Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Include warranty, sample availability, packing conditions..."
                    value={quoteForm.notes}
                    onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowQuoteModal(false)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingQuote || !quoteForm.unitPrice}
                    className="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submittingQuote ? <Loader2 size={16} className="animate-spin" /> : "Transmit Quote"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
