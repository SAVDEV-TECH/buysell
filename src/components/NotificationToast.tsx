"use client";

import { useEffect } from "react";
import { useNotifications } from "@/context/NotificationContext";
import { getTypeBadge } from "./NotificationPopover";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotificationToast() {
  const { latestToast, dismissToast, markAsRead } = useNotifications();
  const router = useRouter();

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!latestToast) return;
    const timer = setTimeout(() => {
      dismissToast();
    }, 6000);
    return () => clearTimeout(timer);
  }, [latestToast, dismissToast]);

  if (!latestToast) return null;

  const badge = getTypeBadge(latestToast.type);

  const handleClick = async () => {
    await markAsRead(latestToast.id);
    dismissToast();
    if (latestToast.link) {
      router.push(latestToast.link);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="fixed bottom-6 right-6 z-[100] max-w-sm w-full bg-card border border-border rounded-2xl shadow-2xl p-4 flex items-start gap-3 backdrop-blur-xl cursor-pointer group"
        onClick={handleClick}
      >
        {/* Accent bar */}
        <div className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full" />

        {/* Icon */}
        <div className={`p-2.5 rounded-xl border flex-shrink-0 ml-1 ${badge.bg}`}>
          {badge.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">
              Live Notification
            </span>
            <span className="text-[10px] text-muted-foreground">Just now</span>
          </div>
          <h4 className="text-sm font-bold text-foreground truncate">
            {latestToast.title}
          </h4>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {latestToast.message}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            dismissToast();
          }}
          aria-label="Close notification toast"
          className="p-1 text-muted-foreground hover:text-foreground dark:hover:text-slate-200 rounded-lg"
        >
          <X size={16} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
