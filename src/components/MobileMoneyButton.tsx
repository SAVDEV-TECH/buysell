"use client";

import { useState } from "react";
import { Smartphone, Loader2, CheckCircle, ShieldCheck, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PROVIDERS = [
  { id: "mtn", name: "MTN MoMo" },
  { id: "mpesa", name: "M-Pesa" },
  { id: "airtel", name: "Airtel Money" },
  { id: "vodafone", name: "Vodafone Cash" },
  { id: "tigo", name: "Tigo Pesa" },
  { id: "orange", name: "Orange Money" },
];

function ProviderLogo({ id }: { id: string }) {
  if (id === "mtn") {
    return (
      <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center p-1 text-black shadow-sm mx-auto mb-1.5 border border-amber-500/40">
        <div className="border border-black rounded-full px-1.5 py-0.5 font-black text-[9px] tracking-tighter leading-none text-center">
          MTN<br /><span className="text-[6px] font-black uppercase tracking-normal">MoMo</span>
        </div>
      </div>
    );
  }
  if (id === "mpesa") {
    return (
      <div className="w-10 h-10 rounded-xl bg-emerald-600 flex flex-col items-center justify-center p-1 text-white shadow-sm mx-auto mb-1.5 border border-emerald-700">
        <span className="text-[10px] font-black tracking-tight leading-none">m-pesa</span>
        <span className="text-[6px] font-bold uppercase tracking-widest text-emerald-200 mt-0.5">Pay</span>
      </div>
    );
  }
  if (id === "airtel") {
    return (
      <div className="w-10 h-10 rounded-xl bg-red-600 flex flex-col items-center justify-center p-1 text-white shadow-sm mx-auto mb-1.5 border border-red-700">
        <span className="text-[9px] font-black tracking-tight leading-none">airtel</span>
        <span className="text-[6px] font-extrabold uppercase text-red-200 mt-0.5">money</span>
      </div>
    );
  }
  if (id === "vodafone") {
    return (
      <div className="w-10 h-10 rounded-xl bg-red-500 flex flex-col items-center justify-center p-1 text-white shadow-sm mx-auto mb-1.5 border border-red-600">
        <span className="text-[8px] font-black tracking-tight leading-none">vodafone</span>
        <span className="text-[6px] font-extrabold uppercase text-red-100 mt-0.5">cash</span>
      </div>
    );
  }
  if (id === "tigo") {
    return (
      <div className="w-10 h-10 rounded-xl bg-blue-900 flex flex-col items-center justify-center p-1 text-white shadow-sm mx-auto mb-1.5 border border-blue-950">
        <span className="text-[9px] font-black tracking-tight text-amber-400 leading-none">tigo</span>
        <span className="text-[6px] font-extrabold uppercase text-white mt-0.5">pesa</span>
      </div>
    );
  }
  if (id === "orange") {
    return (
      <div className="w-10 h-10 rounded-xl bg-orange-500 flex flex-col items-center justify-center p-1 text-white shadow-sm mx-auto mb-1.5 border border-orange-600">
        <span className="text-[8px] font-black tracking-tight uppercase leading-none">orange</span>
        <span className="text-[6px] font-extrabold uppercase text-orange-100 mt-0.5">money</span>
      </div>
    );
  }
  return <Smartphone size={20} className="mx-auto mb-1.5" />;
}

interface MobileMoneyButtonProps {
  productId: string | number;
  amount: number;
  currency?: string;
  onSuccess?: (reference: string) => void;
  compact?: boolean;
  user?: any;
}

export default function MobileMoneyButton({
  productId,
  amount,
  currency = "USD",
  onSuccess,
  compact = false,
  user,
}: MobileMoneyButtonProps) {
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    if (!user) {
      alert("Please log in to continue with your purchase.");
      return;
    }
    setOpen(true);
  };

  return (
    <>
      {compact ? (
        <button
          onClick={handleOpen}
          className="w-full h-full py-1.5 px-2.5 bg-emerald-600 text-white rounded-lg text-[11px] font-extrabold uppercase tracking-wider hover:bg-emerald-700 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap"
        >
          <Smartphone size={12} /> Mobile Pay
        </button>
      ) : (
        <button
          onClick={handleOpen}
          className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-base hover:bg-emerald-700 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3"
        >
          <Smartphone size={20} /> Pay with Mobile Money
        </button>
      )}

      <AnimatePresence>
        {open && (
          <MobileMoneyModal
            productId={productId}
            amount={amount}
            currency={currency}
            onSuccess={onSuccess}
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function MobileMoneyModal({
  productId,
  amount,
  currency,
  onSuccess,
  onClose,
}: {
  productId: string | number;
  amount: number;
  currency: string;
  onSuccess?: (ref: string) => void;
  onClose: () => void;
}) {
  const [provider, setProvider] = useState(PROVIDERS[0]);
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"select" | "success">("select");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ussdCode, setUssdCode] = useState("");
  const [reference, setReference] = useState("");

  const handleSubmit = async () => {
    if (!phone.trim() || phone.replace(/\D/g, "").length < 9) {
      setError("Please enter a valid phone number (min 9 digits)");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/payments/mobile-money", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: provider.id,
          phoneNumber: phone,
          amount,
          currency,
          productId: String(productId),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUssdCode(data.ussdCode || "");
        setReference(data.reference || "");
        setStep("success");
        if (onSuccess) onSuccess(data.reference);
      } else {
        setError(data.message || "Payment initialization failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition-all"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              <Smartphone size={20} />
            </div>
            <div>
              <h3 className="font-black text-lg">Mobile Money</h3>
              <p className="text-emerald-100 text-xs font-bold">Secure African B2B Payments</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {step === "select" && (
            <>
              {/* Provider grid */}
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 block">
                  Select Provider
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setProvider(p)}
                      className={`p-2.5 rounded-2xl border-2 text-center transition-all ${
                        provider.id === p.id
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-md scale-105"
                          : "border-slate-200 dark:border-slate-700 hover:border-emerald-300"
                      }`}
                    >
                      <ProviderLogo id={p.id} />
                      <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 leading-tight">
                        {p.name}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone input */}
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 block">
                  Phone Number
                </label>
                <div className="relative">
                  <Smartphone
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +233 55 123 4567"
                    className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold focus:outline-none focus:border-emerald-500 bg-transparent transition-all"
                  />
                </div>
              </div>

              {/* Amount row */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 rounded-2xl px-4 py-3">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Amount</span>
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {currency} {amount.toLocaleString()}
                </span>
              </div>

              {error && <p className="text-xs text-red-500 font-bold">{error}</p>}

              {/* Escrow badge */}
              <div className="flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl p-3">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">
                  Funds are held in BuySell Escrow until delivery is confirmed by the buyer.
                </p>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Processing…</>
                ) : (
                  <><Smartphone size={16} /> Initiate {provider.name} Payment</>
                )}
              </button>
            </>
          )}

          {step === "success" && (
            <div className="text-center py-2 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-emerald-600" />
              </div>
              <div>
                <h4 className="font-black text-lg text-slate-900 dark:text-white">Payment Initiated!</h4>
                <p className="text-sm text-slate-500 mt-1">Complete the payment prompt on your phone</p>
              </div>

              {ussdCode && (
                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    USSD Code
                  </p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white tracking-wider">
                    {ussdCode}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Dial this on your {provider.name} line to complete
                  </p>
                </div>
              )}

              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl p-3 text-left">
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">
                  Reference: {reference}
                </p>
                <p className="text-[10px] text-amber-600/70 mt-0.5">
                  Funds held in BuySell Escrow until delivery confirmed
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
