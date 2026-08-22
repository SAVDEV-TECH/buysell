"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { X, Send, Loader2, CheckCircle2, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const INCOTERMS = [
  {
    code: "FOB",
    label: "FOB — Free On Board",
    desc: "Seller delivers to local port. Buyer handles ocean freight & customs. Recommended for African sellers.",
  },
  {
    code: "CIF",
    label: "CIF — Cost, Insurance & Freight",
    desc: "Seller arranges and pays for ocean freight and cargo insurance to destination port.",
  },
  {
    code: "EXW",
    label: "EXW — Ex Works",
    desc: "Buyer collects directly from seller's warehouse. Buyer handles all transport and customs.",
  },
  {
    code: "DDP",
    label: "DDP — Delivered Duty Paid",
    desc: "Seller delivers to buyer's door with all duties paid. Maximum responsibility for seller.",
  },
];

interface RFQModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: {
    id: string;
    title?: string;
    name?: string;
    price?: number;
    moq?: number;
  };
  manufacturer?: {
    id: string;
    name: string;
  };
}

export default function RFQModal({ isOpen, onClose, product, manufacturer }: RFQModalProps) {
  const { user, organizationId } = useAuth();
  const [quantity, setQuantity] = useState(product?.moq || 100);
  const [notes, setNotes] = useState("");
  const [incoterms, setIncoterms] = useState("FOB");
  const [targetPrice, setTargetPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orgCountry, setOrgCountry] = useState<string | null>(null);
  const supabase = createClient();

  const productName = product?.title || product?.name;

  // Lazily fetch the buyer's country from their organization profile
  // so we never need to hardcode destination_country
  const resolveDestinationCountry = async (): Promise<string> => {
    if (orgCountry) return orgCountry;
    if (!organizationId) return "NG"; // Safe African default
    try {
      const { data } = await supabase
        .from("organizations")
        .select("country_code")
        .eq("id", organizationId)
        .single();
      const code = data?.country_code || "NG";
      setOrgCountry(code);
      return code;
    } catch {
      return "NG";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !organizationId) return;

    setLoading(true);
    try {
      // Resolve buyer's actual country — never hardcoded
      const destinationCountry = await resolveDestinationCountry();

      // Default expiry: 48 hours from now (matches platform quote policy)
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 48);

      const { error } = await supabase.from("rfqs").insert({
        buyer_organization_id: organizationId,
        title: productName ? `RFQ for ${productName}` : "General Inquiry",
        destination_country: destinationCountry,
        incoterms,
        expiry_date: expiryDate.toISOString(),
        requirements_spec: {
          notes,
          quantity: Number(quantity),
          productId: product?.id,
          targetPrice: targetPrice ? Number(targetPrice) : null,
          manufacturerId: manufacturer?.id || null,
        },
        status: "published",
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setNotes("");
        setTargetPrice("");
      }, 2000);
    } catch (error) {
      console.error("Error submitting RFQ:", error);
      alert("Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedIncoterm = INCOTERMS.find((i) => i.code === incoterms);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-card w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-border/30 max-h-[90vh] overflow-y-auto"
          >
            {success ? (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 size={48} />
                </div>
                <h2 className="text-2xl font-black mb-2">Request Transmitted</h2>
                <p className="text-muted-foreground">Your RFQ has been sent to {manufacturer?.name || "Supplier"}.</p>
                <p className="text-xs text-muted-foreground mt-2">This quote expires in 48 hours.</p>
              </div>
            ) : (
              <>
                <div className="p-8 border-b border-border flex items-center justify-between bg-primary/5">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tighter text-primary">Request for Quotation</h2>
                    <p className="text-xs text-muted-foreground font-bold">Inquiry for {manufacturer?.name || "Supplier"} · Expires in 48 hrs</p>
                  </div>
                  <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                  {product && (
                    <div className="p-4 bg-muted/30 rounded-2xl border border-border flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-primary font-bold shadow-sm">
                        {((product as any).title || product.name || "P").charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Target Product</p>
                        <p className="font-bold text-sm">{(product as any).title || product.name}</p>
                      </div>
                    </div>
                  )}

                  {/* Quantity */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold ml-1">Required Quantity</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full px-6 py-4 bg-card border border-border rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                      placeholder="e.g. 5000"
                    />
                  </div>

                  {/* Target Price */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold ml-1">Target Price per Unit (USD) <span className="text-muted-foreground font-normal">(Optional)</span></label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      className="w-full px-6 py-4 bg-card border border-border rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                      placeholder="e.g. 2.50"
                    />
                  </div>

                  {/* Incoterms Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold ml-1">Delivery Terms (Incoterms)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {INCOTERMS.map((term) => (
                        <button
                          key={term.code}
                          type="button"
                          onClick={() => setIncoterms(term.code)}
                          className={`p-3 rounded-2xl border text-left transition-all ${
                            incoterms === term.code
                              ? "bg-primary/10 border-primary text-primary"
                              : "border-border hover:border-primary/40 bg-card"
                          }`}
                        >
                          <p className="text-xs font-black">{term.code}</p>
                          <p className="text-[10px] text-muted-foreground font-medium mt-0.5 leading-tight">
                            {term.label.split("—")[1]?.trim()}
                          </p>
                        </button>
                      ))}
                    </div>
                    {selectedIncoterm && (
                      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                        <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">{selectedIncoterm.desc}</p>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold ml-1">Specifications &amp; Notes</label>
                    <textarea
                      required
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      className="w-full px-6 py-4 bg-card border border-border rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
                      placeholder="Specify product grade, packaging, delivery timeline, compliance certificates required..."
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-4 border border-border rounded-2xl font-bold hover:bg-muted transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-4 bg-primary text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" size={20} /> : <><Send size={20} /> Submit RFQ</>}
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
