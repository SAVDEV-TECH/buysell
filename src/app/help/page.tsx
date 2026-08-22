"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  BookOpen,
  MessageCircle,
  LifeBuoy,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Mail,
  Phone,
  Send,
  CheckCircle,
  X,
  HelpCircle,
  Package,
  CreditCard,
  ShieldCheck,
  Users,
  Truck,
} from "lucide-react";

// ─── FAQ Data ─────────────────────────────────────────────────────────────────
const FAQ_CATEGORIES = [
  {
    id: "general",
    label: "General",
    icon: HelpCircle,
    color: "text-primary bg-primary/10",
    items: [
      {
        q: "What is BuySell?",
        a: "BuySell is Africa's premier B2B trade platform connecting manufacturers, wholesalers, and retailers across the continent. You can list products, place bulk orders, negotiate deals, and process payments — all in one place.",
      },
      {
        q: "Is BuySell free to use?",
        a: "Yes, creating an account and browsing the marketplace is completely free. A small transaction fee applies when you complete a paid order. Verified business accounts unlock additional features.",
      },
      {
        q: "How do I get my business verified?",
        a: "After completing onboarding, submit your CAC registration number and a government-issued ID. Our team reviews applications within 1–2 business days and notifies you by email.",
      },
    ],
  },
  {
    id: "orders",
    label: "Orders",
    icon: Package,
    color: "text-orange-500 bg-orange-500/10",
    items: [
      {
        q: "How do I place a bulk order?",
        a: "Browse the marketplace, open a product listing, and click 'Request Quote' or 'Add to Order'. You can negotiate minimum quantities and pricing directly with the seller before confirming.",
      },
      {
        q: "Can I track my order?",
        a: "Yes. Once your order is confirmed, go to Dashboard → Orders to see real-time status updates: Pending, Processing, Shipped, and Delivered.",
      },
      {
        q: "What happens if I need to cancel an order?",
        a: "You can cancel an order before it enters the 'Processing' stage. After that, contact the seller to agree on a return or refund. Disputes can be raised through our arbitration system.",
      },
    ],
  },
  {
    id: "payments",
    label: "Payments",
    icon: CreditCard,
    color: "text-green-500 bg-green-500/10",
    items: [
      {
        q: "What payment methods are accepted?",
        a: "BuySell supports bank transfers, Paystack, Flutterwave, and mobile money. International payments are processed via our secure escrow gateway.",
      },
      {
        q: "When will I receive my payouts?",
        a: "Payouts are processed to your connected bank account within 2–3 business days after an order is marked as Delivered and confirmed by the buyer.",
      },
      {
        q: "Is my payment information secure?",
        a: "Yes. All payments are processed through PCI-DSS compliant gateways. BuySell never stores your card details. Escrow protection holds funds safely until order completion.",
      },
    ],
  },
  {
    id: "sellers",
    label: "Sellers",
    icon: LifeBuoy,
    color: "text-secondary bg-primary/5",
    items: [
      {
        q: "How do I list a new product?",
        a: "Go to Dashboard → Products → 'Add New Product'. Fill in product details, pricing tiers, minimum order quantities, and upload photos. Your listing goes live immediately after submission.",
      },
      {
        q: "Can I manage multiple staff members?",
        a: "Yes. Verified business accounts can invite team members from Dashboard → Team Management and assign roles such as Sales Rep, Inventory Manager, or Admin.",
      },
      {
        q: "How do I handle a disputed order?",
        a: "If a buyer raises a dispute, you will be notified and given 48 hours to respond with evidence. Our arbitration team reviews both sides and makes a fair ruling within 5 business days.",
      },
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: ShieldCheck,
    color: "text-purple-500 bg-purple-500/10",
    items: [
      {
        q: "How does BuySell protect my data?",
        a: "All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We use Supabase's row-level security to ensure users can only access their own data.",
      },
      {
        q: "What is the escrow system?",
        a: "Escrow holds a buyer's payment securely until they confirm the goods have been received in the agreed condition. This protects both parties from fraud.",
      },
      {
        q: "How do I report a suspicious seller?",
        a: "On any product or store page, click the flag icon or 'Report' button. Our trust & safety team investigates all reports within 24 hours.",
      },
    ],
  },
  {
    id: "shipping",
    label: "Shipping",
    icon: Truck,
    color: "text-amber-500 bg-amber-500/10",
    items: [
      {
        q: "Does BuySell handle shipping?",
        a: "BuySell provides a freight calculator and partner logistics integrations. Actual shipping is arranged between buyer and seller, with BuySell facilitating tracking visibility.",
      },
      {
        q: "Do you support cross-border trade?",
        a: "Yes. BuySell supports cross-border B2B trade across Africa and internationally, with currency conversion, customs documentation guidance, and multi-currency payments.",
      },
      {
        q: "What happens if goods arrive damaged?",
        a: "Take photos immediately upon delivery and raise a dispute within 48 hours via Dashboard → Orders → Report Issue. Our team will guide you through the claims process.",
      },
    ],
  },
];

// ─── Contact form ──────────────────────────────────────────────────────────────
function ContactModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate sending — replace with your real API call
    await new Promise((r) => setTimeout(r, 1500));
    setSent(true);
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-border relative"
      >
        <button onClick={onClose} className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors">
          <X size={20} />
        </button>

        {sent ? (
          <div className="text-center py-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={36} className="text-green-500" />
            </motion.div>
            <h3 className="text-2xl font-black mb-2">Message Sent!</h3>
            <p className="text-muted-foreground text-sm">Our support team will get back to you within 24 hours.</p>
            <button onClick={onClose} className="mt-6 px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all">
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="mb-7">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-3">
                <MessageCircle size={24} className="text-primary" />
              </div>
              <h3 className="text-2xl font-black mb-1">Contact Support</h3>
              <p className="text-muted-foreground text-sm">We typically respond within 24 hours on business days.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block">Your Name</label>
                  <input required placeholder="John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/40 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block">Email</label>
                  <input required type="email" placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/40 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block">Subject</label>
                <select required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/40 text-sm">
                  <option value="">Select a topic…</option>
                  <option value="order">Order Issue</option>
                  <option value="payment">Payment Problem</option>
                  <option value="account">Account / Login</option>
                  <option value="seller">Seller Support</option>
                  <option value="dispute">Dispute / Fraud</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block">Message</label>
                <textarea required rows={4} placeholder="Describe your issue in detail…" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/40 text-sm resize-none" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50">
                {loading ? "Sending…" : <><Send size={16} /> Send Message</>}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── FAQ accordion item ────────────────────────────────────────────────────────
function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${open ? "border-primary/30 bg-primary/5 dark:bg-primary/10" : "border-border bg-background/50"}`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left"
      >
        <span className="font-bold text-sm sm:text-base">{q}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180 text-primary" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <p className="px-5 pb-5 text-muted-foreground text-sm leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function HelpCenterPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("general");
  const [showContact, setShowContact] = useState(false);

  // Filter FAQ items by search query across all categories
  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const results: { q: string; a: string; category: string }[] = [];
    FAQ_CATEGORIES.forEach((cat) => {
      cat.items.forEach((item) => {
        if (item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)) {
          results.push({ ...item, category: cat.label });
        }
      });
    });
    return results;
  }, [search]);

  const activeItems = FAQ_CATEGORIES.find((c) => c.id === activeCategory)?.items ?? [];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-primary via-primary/90 to-secondary pt-12 pb-28 px-4 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-[80px]" />

        <div className="max-w-4xl mx-auto relative z-10">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-8 font-medium text-sm">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>

          <h1 className="text-3xl sm:text-5xl font-black mb-3">How can we help you?</h1>
          <p className="text-white/70 mb-8 text-sm sm:text-base">Search our knowledge base or browse by category below.</p>

          {/* Search bar */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            )}
            <input
              type="text"
              id="help-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for help articles, e.g. 'payment', 'order', 'listing'…"
              className="w-full pl-12 pr-12 py-4 bg-white rounded-2xl text-foreground focus:ring-4 focus:ring-white/30 outline-none text-sm sm:text-base shadow-2xl shadow-black/20"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-14 relative z-20 space-y-8">

        {/* ── Quick action cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: BookOpen, label: "Knowledge Base", desc: "Browse guides & docs", color: "text-primary bg-primary/10", action: () => setSearch("how") },
            { icon: Users, label: "Community", desc: "Ask other traders", color: "text-secondary bg-primary/5", action: () => {} },
            { icon: MessageCircle, label: "Contact Support", desc: "Open a support ticket", color: "text-orange-500 bg-orange-500/10", action: () => setShowContact(true) },
          ].map(({ icon: Icon, label, desc, color, action }) => (
            <button key={label} onClick={action}
              className="bg-card p-6 rounded-3xl shadow-lg  border border-border hover:-translate-y-1 hover:shadow-xl transition-all text-left group w-full">
              <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon size={24} />
              </div>
              <h3 className="font-bold mb-1 text-sm sm:text-base">{label}</h3>
              <p className="text-muted-foreground text-xs sm:text-sm mb-3">{desc}</p>
              <span className="text-primary font-bold text-xs flex items-center gap-1">
                {label === "Contact Support" ? "Open Ticket" : label === "Community" ? "Join Forum" : "Read Articles"} <ChevronRight size={13} />
              </span>
            </button>
          ))}
        </div>

        {/* ── Search results ── */}
        {searchResults !== null ? (
          <div className="bg-card rounded-3xl p-6 sm:p-10 border border-border">
            <h2 className="text-lg font-bold mb-5">
              {searchResults.length > 0
                ? `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""} for "${search}"`
                : `No results for "${search}"`}
            </h2>
            {searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((item, i) => (
                  <div key={i}>
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">{item.category}</span>
                    <FaqItem q={item.q} a={item.a} index={i} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <HelpCircle size={40} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-4">Can&apos;t find what you&apos;re looking for?</p>
                <button onClick={() => setShowContact(true)}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all">
                  Contact Support
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ── FAQ by category ── */
          <div className="bg-card rounded-3xl border border-border overflow-hidden">
            {/* Category tabs */}
            <div className="flex overflow-x-auto gap-1 p-3 border-b border-border scrollbar-hide">
              {FAQ_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${activeCategory === cat.id ? "bg-primary text-white shadow-md shadow-primary/20" : "text-muted-foreground hover:bg-muted"}`}>
                    <Icon size={15} />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* FAQ items */}
            <div className="p-6 sm:p-10 space-y-3">
              <AnimatePresence mode="wait">
                <motion.div key={activeCategory} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                  {activeItems.map((item, i) => (
                    <FaqItem key={i} q={item.q} a={item.a} index={i} />
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ── Contact banner ── */}
        <div className="bg-gradient-to-r from-primary to-secondary rounded-3xl p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-black mb-1">Still need help?</h3>
            <p className="text-white/80 text-sm">Our support team is available Mon–Fri, 9am–6pm WAT.</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-white/90">
              <span className="flex items-center gap-1.5"><Mail size={14} /> support@buisell.com.ng</span>
              <span className="flex items-center gap-1.5"><Phone size={14} /> +234 800 000 0000</span>
            </div>
          </div>
          <button onClick={() => setShowContact(true)}
            className="shrink-0 px-7 py-3.5 bg-white text-primary font-black rounded-2xl hover:bg-white/90 transition-all shadow-xl text-sm whitespace-nowrap">
            Open a Ticket
          </button>
        </div>
      </div>

      {/* ── Contact modal ── */}
      <AnimatePresence>
        {showContact && <ContactModal onClose={() => setShowContact(false)} />}
      </AnimatePresence>
    </div>
  );
}
