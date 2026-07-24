"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  Star, 
  MessageSquare, 
  ThumbsUp, 
  ShieldCheck, 
  Loader2, 
  Send,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export default function ReviewSection({ productId }: { productId: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Please login to leave a review.");
      return;
    }
    if (!comment.trim()) return;

    setSubmitting(true);
    setError("");

    setReviews(prev => [
      {
        id: Math.random().toString(),
        userId: user.id,
        userName: user.email?.split("@")[0] || "Verified Buyer",
        rating,
        comment: comment.trim(),
        createdAt: new Date(),
      },
      ...prev
    ]);

    setComment("");
    setRating(5);
    setSubmitting(false);
  };

  return (
    <div className="mt-20 space-y-12 pb-20">
      <div className="flex items-center justify-between">
        <div>
           <h3 className="text-3xl font-black mb-2">Customer Feedback</h3>
           <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Verified Customer Reviews</p>
        </div>
        <div className="flex gap-2">
           <div className="flex items-center gap-1.5 px-4 py-2 glass rounded-2xl border border-borderline">
              <Star size={16} className="text-orange-500 fill-orange-500" />
              <span className="font-bold">{reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : "5.0"}</span>
           </div>
           <div className="flex items-center gap-1.5 px-4 py-2 glass rounded-2xl border border-borderline">
              <MessageSquare size={16} className="text-primary" />
              <span className="font-bold">{reviews.length}</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
         <div className="lg:col-span-1">
            <div className="glass p-8 rounded-[2.5rem] border border-borderline sticky top-24">
               <h4 className="text-lg font-black mb-6">Write a Review</h4>
               <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 block italic">Satisfaction Level</label>
                    <div className="flex gap-2">
                       {[1, 2, 3, 4, 5].map((s) => (
                         <button 
                           key={s}
                           type="button"
                           onClick={() => setRating(s)}
                           className={`p-2 transition-all hover:scale-110 ${rating >= s ? 'text-orange-500' : 'text-muted-foreground opacity-30'}`}
                         >
                           <Star size={24} fill={rating >= s ? "currentColor" : "none"} />
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block italic">Review Details</label>
                    <textarea 
                      placeholder="Comment on quality, delivery speed, and supplier reliability..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={4}
                      className="w-full px-6 py-4 glass rounded-2xl border border-borderline outline-none focus:ring-4 focus:ring-primary/10 transition-all text-sm font-medium resize-none"
                    />
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2 p-3 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-tighter rounded-xl border border-red-500/20"
                      >
                         <AlertCircle size={14} /> {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button 
                    disabled={submitting || !comment.trim()}
                    type="submit" 
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:grayscale disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : <><Send size={18} /> Submit Review</>}
                  </button>
               </form>
            </div>
         </div>

         <div className="lg:col-span-2 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <Loader2 className="animate-spin text-primary mb-4" size={32} />
                <p className="text-[10px] font-black tracking-widest uppercase italic">Loading reviews...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-20 text-center glass rounded-[3rem] border border-borderline border-dashed">
                 <ShieldCheck size={48} className="mx-auto text-muted-foreground opacity-10 mb-4" />
                 <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">No reviews for this product yet.</p>
              </div>
            ) : (
              reviews.map((r, i) => (
                <motion.div 
                  key={r.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass p-8 rounded-[2.5rem] border border-borderline hover:border-primary/20 transition-all group"
                >
                   <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center text-primary font-black text-lg">
                            {r.userName.charAt(0)}
                         </div>
                         <div>
                            <h5 className="font-bold flex items-center gap-2">
                               {r.userName}
                               <ShieldCheck size={14} className="text-emerald-500" />
                            </h5>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5 italic">Verified Purchase</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="flex gap-0.5 text-orange-500 mb-1">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} size={12} fill={r.rating >= s ? "currentColor" : "none"} className={r.rating < s ? 'opacity-20' : ''} />
                            ))}
                         </div>
                      </div>
                   </div>
                   
                   <p className="text-sm text-muted-foreground leading-relaxed font-medium">"{r.comment}"</p>
                   
                   <div className="mt-8 flex items-center gap-6 pt-6 border-t border-borderline/50">
                      <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all">
                        <ThumbsUp size={14} /> Helpful Review
                      </button>
                   </div>
                </motion.div>
              ))
            )}
         </div>
      </div>
    </div>
  );
}
