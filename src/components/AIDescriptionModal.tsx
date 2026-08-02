"use client";

import { useState } from "react";
import { Sparkles, X, Loader2, CheckCircle2, Wand2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface GeneratedResult {
  description: string;
  keyFeatures: string[];
  suggestedSpecifications: Record<string, string>;
  metaKeywords: string[];
}

interface AIDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTitle: string;
  categoryName?: string;
  onApply: (result: GeneratedResult) => void;
}

export default function AIDescriptionModal({
  isOpen,
  onClose,
  initialTitle,
  categoryName,
  onApply,
}: AIDescriptionModalProps) {
  const [title, setTitle] = useState(initialTitle || "");
  const [notes, setNotes] = useState("");
  const [audience, setAudience] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GeneratedResult | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!title.trim()) {
      setError("Please enter a product title to generate description.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category: categoryName || "Wholesale B2B Goods",
          keywords: notes,
          targetAudience: audience,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Generation failed.");
      }

      setResult(data.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (result) {
      onApply(result);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-primary/10 via-purple-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/20 text-primary">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">AI Product Copywriter</h3>
              <p className="text-xs text-muted-foreground">Generate SEO-optimized B2B product descriptions & specs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Form Inputs */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Product Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Industrial Hydraulic Hose Pipe 100m Roll"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-primary/40 outline-none transition-all font-medium text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Key Features / Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="High pressure, oil resistant, ISO certified"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-primary/40 outline-none text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Target Audience (Optional)
              </label>
              <input
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Mining contractors, factory buyers"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-primary/40 outline-none text-xs"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-primary via-purple-600 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-primary/25 hover:opacity-95 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Generating AI Description & Specs…
              </>
            ) : result ? (
              <>
                <RefreshCw size={18} /> Regenerate with AI
              </>
            ) : (
              <>
                <Wand2 size={18} /> Generate B2B Listing Content
              </>
            )}
          </button>

          {/* Generated Result Preview */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-primary mb-1">
                  Generated B2B Description
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                  {result.description}
                </p>
              </div>

              {result.keyFeatures?.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-primary mb-1">
                    Key Product Highlights
                  </h4>
                  <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    {result.keyFeatures.map((feat, idx) => (
                      <li key={idx}>{feat}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.metaKeywords?.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-primary mb-1.5">
                    Suggested Search Keywords
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {result.metaKeywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            Cancel
          </button>
          {result && (
            <button
              onClick={handleApply}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 hover:scale-105 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 size={16} /> Apply to Form
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
