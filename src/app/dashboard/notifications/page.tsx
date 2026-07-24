"use client";

import { useState } from "react";
import { useNotifications, NotificationType, NotificationItem } from "@/context/NotificationContext";
import { getTypeBadge } from "@/components/NotificationPopover";
import {
  Bell,
  CheckCheck,
  Trash2,
  Search,
  Filter,
  Clock,
  ChevronRight,
  Inbox,
  Sparkles,
  Loader2,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

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
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    sendNotification
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSendingDemo, setIsSendingDemo] = useState(false);

  const tabs = [
    { id: "ALL", label: "All", count: notifications.length },
    { id: "UNREAD", label: "Unread", count: unreadCount },
    { id: "ORDER", label: "Orders", count: notifications.filter((n) => n.type === "ORDER").length },
    { id: "RFQ", label: "RFQs", count: notifications.filter((n) => n.type === "RFQ").length },
    { id: "VERIFICATION", label: "Verification", count: notifications.filter((n) => n.type === "VERIFICATION").length },
    { id: "SYSTEM", label: "System", count: notifications.filter((n) => n.type === "SYSTEM").length },
  ];

  // Filtered notifications
  const filteredNotifications = notifications.filter((item) => {
    // Tab filter
    if (activeTab === "UNREAD" && item.read) return false;
    if (activeTab !== "ALL" && activeTab !== "UNREAD" && item.type !== activeTab) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.title.toLowerCase().includes(q) || item.message.toLowerCase().includes(q);
    }
    return true;
  });

  const handleSendTestNotification = async () => {
    if (!user) return;
    setIsSendingDemo(true);

    const types: NotificationType[] = ["ORDER", "RFQ", "MESSAGE", "VERIFICATION", "SYSTEM"];
    const randomType = types[Math.floor(Math.random() * types.length)];

    const samples: Record<NotificationType, { title: string; message: string; link: string }> = {
      ORDER: {
        title: "New Wholesale Order #BS-" + Math.floor(1000 + Math.random() * 9000),
        message: "A buyer placed an order for 500 units of Industrial Raw Cotton ($12,500.00).",
        link: "/dashboard/orders",
      },
      RFQ: {
        title: "RFQ Response Received",
        message: "Apex Manufacturing submitted a custom quotation for your requested specifications.",
        link: "/dashboard/rfqs",
      },
      MESSAGE: {
        title: "New Direct Message Received",
        message: "A verified supplier sent a message regarding product availability.",
        link: "/dashboard/messages",
      },
      VERIFICATION: {
        title: "Business Document Verified",
        message: "Your tax identification number and CAC registry documents were approved by admin.",
        link: "/dashboard/verification",
      },
      SYSTEM: {
        title: "System Update: Realtime Engine Active",
        message: "Real-time B2B event streams and notifications are fully online.",
        link: "/dashboard/notifications",
      },
    };

    const sample = samples[randomType];
    await sendNotification(user.id, sample.title, sample.message, randomType, sample.link);
    setIsSendingDemo(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-3 py-1 bg-red-500 text-white text-xs font-black rounded-full shadow-md shadow-red-500/20 animate-pulse">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time event logs, order alerts, and business activity stream
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleSendTestNotification}
            disabled={isSendingDemo}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold hover:scale-105 transition-all shadow-md disabled:opacity-50"
          >
            {isSendingDemo ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} className="text-amber-400" />
            )}
            Trigger Test Event
          </button>

          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition-all"
            >
              <CheckCheck size={16} /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Controls Bar: Search & Category Tabs */}
      <div className="space-y-4">
        {/* Search & Bulk Action */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-slate-400"
            />
          </div>

          {notifications.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to clear all notifications?")) {
                  clearAll();
                }
              }}
              className="text-xs font-semibold text-slate-500 hover:text-red-500 transition-colors flex items-center gap-1.5 self-end sm:self-center"
            >
              <Trash2 size={14} /> Clear all notifications
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200 dark:border-slate-800">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                  isActive
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                {tab.label}
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications List Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 text-center space-y-4">
            <Loader2 size={36} className="text-primary animate-spin" />
            <p className="text-sm font-semibold text-muted-foreground">Connecting to real-time notification stream...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center px-4 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <Inbox size={32} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No notifications found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {searchQuery
                  ? `No results matching "${searchQuery}". Try searching with another keyword.`
                  : "You have no active alerts in this category right now."}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            <AnimatePresence mode="popLayout">
              {filteredNotifications.map((notif) => {
                const badge = getTypeBadge(notif.type);
                return (
                  <motion.div
                    key={notif.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className={`p-6 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative group ${
                      !notif.read ? "bg-primary/[0.02] dark:bg-primary/[0.04]" : ""
                    }`}
                  >
                    {/* Left unread stripe */}
                    {!notif.read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                    )}

                    {/* Main content group */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Icon */}
                      <div className={`p-3 rounded-2xl border flex-shrink-0 ${badge.bg}`}>
                        {badge.icon}
                      </div>

                      {/* Text details */}
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            onClick={() => markAsRead(notif.id)}
                            className={`font-bold text-base cursor-pointer hover:text-primary transition-colors ${
                              !notif.read ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {notif.title}
                          </h3>

                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${badge.bg}`}>
                            {badge.label}
                          </span>

                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {notif.message}
                        </p>

                        <div className="flex items-center gap-4 pt-1">
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock size={12} /> {formatTimeAgo(notif.created_at)}
                          </span>

                          {notif.link && (
                            <Link
                              href={notif.link}
                              onClick={() => markAsRead(notif.id)}
                              className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                            >
                              View details <ChevronRight size={14} />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {!notif.read && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          title="Mark as read"
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-all"
                        >
                          Mark read
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notif.id)}
                        title="Delete notification"
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* System Status Footer Banner */}
      <div className="p-8 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Bell size={120} />
        </div>
        <div className="relative z-10 text-center sm:text-left">
          <h4 className="text-lg font-bold mb-1 flex items-center justify-center sm:justify-start gap-2">
            Realtime Event Pipeline <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          </h4>
          <p className="text-xs text-slate-300 max-w-md">
            All order updates, RFQ responses, and system verification alerts are pushed live over encrypted Supabase WebSockets.
          </p>
        </div>
        <div className="relative z-10 px-4 py-2 rounded-xl bg-white/10 backdrop-blur text-xs font-mono font-bold tracking-wider text-emerald-300 border border-white/10">
          STREAM: ACTIVE
        </div>
      </div>
    </div>
  );
}
