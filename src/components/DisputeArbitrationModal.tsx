"use client";

import React, { useState } from "react";
import { AlertTriangle, Upload, X, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DisputeArbitrationModalProps {
  orderId: string;
  orderAmount: number;
  isOpen: boolean;
  onClose: () => void;
  onDisputeSubmitted?: () => void;
}

export default function DisputeArbitrationModal({
  orderId,
  orderAmount,
  isOpen,
  onClose,
  onDisputeSubmitted,
}: DisputeArbitrationModalProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/escrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          action: "dispute_hold",
          notes: `[DISPUTE FILED BY TRADER] Reason: ${reason}. Details: ${description}. Evidence: ${evidenceUrl}`,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSubmitted(true);
        if (onDisputeSubmitted) onDisputeSubmitted();
      } else {
        alert(json.message || "Failed to submit dispute.");
      }
    } catch (err) {
      alert("Error submitting dispute. Check network connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 max-w-lg w-full shadow-2xl relative"
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Open Formal Escrow Dispute
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Order #{orderId.slice(0, 8).toUpperCase()} · Funds (${orderAmount.toLocaleString()} USD) will be frozen for admin arbitration
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                  Primary Dispute Reason
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-rose-500"
                >
                  <option value="Damaged Goods / Quality Defect">Damaged Goods / Quality Defect</option>
                  <option value="Quantity Mismatch / Missing Items">Quantity Mismatch / Missing Items</option>
                  <option value="Non-Delivery / Carrier Timeout">Non-Delivery / Carrier Timeout</option>
                  <option value="Specification Non-Compliance">Specification Non-Compliance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                  Detailed Claim & Inspection Summary
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe exact defects, missing quantities, or inspection discrepancies…"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                  Evidence Photo / Lab Report URL (Optional)
                </label>
                <input
                  type="url"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-black hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-black transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />}
                  File Dispute & Freeze Funds
                </button>
              </div>
            </form>
          ) : (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Dispute Submitted to Super Admin
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Order #${orderId.slice(0, 8).toUpperCase()} funds have been frozen under dispute hold. A Super Admin compliance officer will inspect evidence and arbitrate within 48 hours.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
