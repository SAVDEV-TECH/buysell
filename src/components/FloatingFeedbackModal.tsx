"use client";

import { useState, useEffect } from "react";
import { MessageSquarePlus, Star, Send, X, CheckCircle2, Sparkles, MessageCircle } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export default function FloatingFeedbackModal() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [category, setCategory] = useState<"feedback" | "bug" | "onboarding">("feedback");
  const [rating, setRating] = useState<number>(5);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);

    // Track analytics event
    trackEvent("submit_feedback", {
      category,
      rating,
      has_email: Boolean(email),
    });

    // Simulate API submission
    await new Promise((resolve) => setTimeout(resolve, 800));

    setLoading(false);
    setSubmitted(true);

    setTimeout(() => {
      setSubmitted(false);
      setOpen(false);
      setMessage("");
      setEmail("");
    }, 2500);
  };

  return (
    <>
      {/* ── Floating Widget Trigger Button (Hidden on mobile to reduce clutter) ──────────────── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Feedback & Support"
        className="hidden sm:flex fixed bottom-20 right-6 z-40 items-center gap-2 px-3.5 h-10 rounded-full bg-foreground text-background font-extrabold text-xs shadow-2xl hover:scale-105 transition-all duration-200 active:scale-95 group border border-border"
      >
        <MessageSquarePlus size={16} className="text-primary group-hover:rotate-12 transition-transform" />
        <span>Feedback & Support</span>
      </button>

      {/* ── Feedback Modal ────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-[110] bg-background/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-foreground">
                    Share Your Feedback
                  </h3>
                  <p className="text-xs text-muted-foreground">Help us improve BuySell platform</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground dark:hover:text-white hover:bg-muted transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            {submitted ? (
              <div className="p-8 text-center space-y-3 animate-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <h4 className="font-extrabold text-base text-foreground">
                  Thank You for Your Feedback!
                </h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Your insights help shape the future of BuySell B2B trading.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                
                {/* Category Pills */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-2">
                    Feedback Topic
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "feedback", label: "General" },
                      { id: "bug", label: "Report Bug" },
                      { id: "onboarding", label: "Seller Join" },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id as typeof category)}
                        className={`h-9 px-3 rounded-xl text-xs font-bold transition-all border ${
                          category === cat.id
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-muted border-border text-foreground hover:bg-muted"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating Stars */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Rate Your Experience
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          size={22}
                          className={
                            star <= rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/40"
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Input */}
                <div>
                  <label htmlFor="feedback-message" className="block text-xs font-bold text-foreground mb-1.5">
                    Message
                  </label>
                  <textarea
                    id="feedback-message"
                    required
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      category === "bug"
                        ? "Describe the issue you encountered..."
                        : category === "onboarding"
                        ? "Tell us about your business or products to list..."
                        : "What do you think about BuySell?"
                    }
                    className="w-full p-3 rounded-xl border border-border bg-muted/60 text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none transition-all resize-none"
                  />
                </div>

                {/* Optional Email */}
                <div>
                  <label htmlFor="feedback-email" className="block text-xs font-bold text-foreground mb-1.5">
                    Your Email (Optional)
                  </label>
                  <input
                    id="feedback-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full h-9 px-3 rounded-xl border border-border bg-muted/60 text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !message.trim()}
                  className="w-full h-10 rounded-xl bg-primary text-white text-xs font-black hover:bg-primary/90 transition-all shadow-md shadow-primary/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={15} /> Submit Feedback
                    </>
                  )}
                </button>

              </form>
            )}

          </div>
        </div>
      )}
    </>
  );
}
