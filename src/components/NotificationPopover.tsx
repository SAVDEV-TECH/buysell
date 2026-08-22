"use client";

import { useState, useRef, useEffect } from "react";
import { useNotifications, NotificationItem, NotificationType } from "@/context/NotificationContext";
import {
  Bell,
  ShoppingBag,
  MessageSquare,
  FileText,
  ShieldCheck,
  Zap,
  CheckCheck,
  ChevronRight,
  X,
  ExternalLink,
  Sparkles,
  Inbox
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";

function formatTimeAgo(dateString: string): string {
  if (!dateString) return "Just now";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function getTypeBadge(type: NotificationType) {
  switch (type) {
    case "ORDER":
      return {
        icon: <ShoppingBag size={14} className="text-blue-600 dark:text-blue-400" />,
        bg: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
        label: "Order",
      };
    case "MESSAGE":
      return {
        icon: <MessageSquare size={14} className="text-purple-600 dark:text-purple-400" />,
        bg: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
        label: "Message",
      };
    case "RFQ":
      return {
        icon: <FileText size={14} className="text-amber-600 dark:text-amber-400" />,
        bg: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
        label: "RFQ",
      };
    case "VERIFICATION":
      return {
        icon: <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />,
        bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        label: "Verification",
      };
    default:
      return {
        icon: <Zap size={14} className="text-primary" />,
        bg: "bg-primary/10 border-primary/20 text-primary",
        label: "System",
      };
  }
}

export default function NotificationPopover() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const popoverRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayedNotifications = filter === "unread"
    ? notifications.filter((n) => !n.read)
    : notifications;

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      await markAsRead(notif.id);
    }
    if (notif.link) {
      setOpen(false);
      router.push(notif.link);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
        className="p-2.5 text-muted-foreground hover:bg-muted rounded-full relative transition-all active:scale-95"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-background animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-x-4 top-[72px] sm:inset-x-auto sm:top-auto sm:absolute sm:right-0 sm:mt-3 w-auto sm:w-96 bg-card rounded-3xl border border-border shadow-2xl z-[100] overflow-hidden flex flex-col max-h-[85vh] origin-top-right sm:origin-top-right"
          >
            {/* Popover Header */}
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-extrabold">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    title="Mark all as read"
                    className="text-xs text-primary font-bold hover:underline flex items-center gap-1 transition-all"
                  >
                    <CheckCheck size={14} /> Read all
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-4 py-2 border-b border-border flex items-center gap-2 bg-muted/20 text-xs font-bold">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1 rounded-full transition-all ${
                  filter === "all"
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter("unread")}
                className={`px-3 py-1 rounded-full transition-all ${
                  filter === "unread"
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {displayedNotifications.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mx-auto mb-3">
                    <Inbox size={24} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    No {filter === "unread" ? "unread" : ""} notifications
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You're all caught up with your B2B alerts!
                  </p>
                </div>
              ) : (
                displayedNotifications.slice(0, 10).map((notif) => {
                  const badge = getTypeBadge(notif.type);
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleItemClick(notif)}
                      className={`p-4 hover:bg-muted/60 transition-all cursor-pointer relative group flex items-start gap-3.5 ${
                        !notif.read ? "bg-primary/[0.03] dark:bg-primary/[0.05]" : ""
                      }`}
                    >
                      {/* Unread dot indicator */}
                      {!notif.read && (
                        <div className="absolute left-1.5 top-5 w-2 h-2 rounded-full bg-primary ring-4 ring-primary/20" />
                      )}

                      {/* Icon */}
                      <div className={`p-2.5 rounded-xl border flex-shrink-0 ${badge.bg}`}>
                        {badge.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className={`text-xs font-bold truncate ${!notif.read ? "text-foreground" : "text-foreground"}`}>
                            {notif.title}
                          </h4>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatTimeAgo(notif.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>

                      {/* Link indicator */}
                      {notif.link && (
                        <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 self-center" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border bg-muted/60 text-center">
              <Link
                href="/dashboard/notifications"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                View all notifications ({notifications.length}) <ExternalLink size={12} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
