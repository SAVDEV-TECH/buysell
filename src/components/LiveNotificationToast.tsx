"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useNotifications, NotificationType, NotificationItem } from "@/context/NotificationContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  MessageSquare,
  FileText,
  ShieldCheck,
  Zap,
  X,
  Volume2,
  VolumeX,
  Bell,
  ChevronRight,
} from "lucide-react";
import {
  playNotificationSound,
  requestPushPermission,
  showBrowserPushNotification,
  SoundType,
} from "@/lib/notificationSounds";
import { useRouter } from "next/navigation";

// ─── Type Helpers ──────────────────────────────────────────────────────────────

function getTypeConfig(type: NotificationType) {
  switch (type) {
    case "ORDER":
      return {
        icon: <ShoppingBag size={20} className="text-blue-500" />,
        gradient: "from-blue-500/20 to-blue-600/5",
        border: "border-blue-500/30",
        accent: "bg-blue-500",
        label: "New Order",
        sound: "ORDER" as SoundType,
      };
    case "MESSAGE":
      return {
        icon: <MessageSquare size={20} className="text-purple-500" />,
        gradient: "from-purple-500/20 to-purple-600/5",
        border: "border-purple-500/30",
        accent: "bg-purple-500",
        label: "Message",
        sound: "MESSAGE" as SoundType,
      };
    case "RFQ":
      return {
        icon: <FileText size={20} className="text-amber-500" />,
        gradient: "from-amber-500/20 to-amber-600/5",
        border: "border-amber-500/30",
        accent: "bg-amber-500",
        label: "RFQ Update",
        sound: "RFQ" as SoundType,
      };
    case "VERIFICATION":
      return {
        icon: <ShieldCheck size={20} className="text-emerald-500" />,
        gradient: "from-emerald-500/20 to-emerald-600/5",
        border: "border-emerald-500/30",
        accent: "bg-emerald-500",
        label: "Verified",
        sound: "VERIFICATION" as SoundType,
      };
    default:
      return {
        icon: <Zap size={20} className="text-primary" />,
        gradient: "from-primary/20 to-primary/5",
        border: "border-primary/30",
        accent: "bg-primary",
        label: "System",
        sound: "SYSTEM" as SoundType,
      };
  }
}

// ─── Individual Toast Card ─────────────────────────────────────────────────────

interface ToastCardProps {
  notif: NotificationItem;
  onDismiss: (id: string) => void;
  soundEnabled: boolean;
}

function ToastCard({ notif, onDismiss, soundEnabled }: ToastCardProps) {
  const router = useRouter();
  const config = getTypeConfig(notif.type);
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const DURATION = 6000; // 6 seconds

  useEffect(() => {
    // Play sound on mount
    if (soundEnabled) {
      playNotificationSound(config.sound);
    }

    // Show browser push notification if tab is not focused
    showBrowserPushNotification(notif.title, notif.message, notif.id);

    // Progress bar countdown
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(intervalRef.current!);
        onDismiss(notif.id);
      }
    }, 50);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = () => {
    onDismiss(notif.id);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 120, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 120, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className={`relative w-80 rounded-2xl border bg-gradient-to-br ${config.gradient} ${config.border} backdrop-blur-xl shadow-2xl overflow-hidden cursor-pointer select-none`}
      onClick={handleClick}
    >
      {/* Top accent stripe */}
      <div className={`h-0.5 w-full ${config.accent} opacity-80`} />

      <div className="p-4 flex items-start gap-3.5">
        {/* Icon bubble */}
        <div className={`p-2.5 rounded-xl border ${config.border} bg-white/80 dark:bg-slate-900/80 flex-shrink-0`}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${config.border} opacity-80`}>
              {config.label}
            </span>
            <Bell size={10} className="text-slate-400 animate-pulse" />
          </div>
          <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight line-clamp-1">
            {notif.title}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
            {notif.message}
          </p>
          {notif.link && (
            <span className="text-[11px] font-bold text-primary mt-1.5 inline-flex items-center gap-0.5">
              View details <ChevronRight size={10} />
            </span>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(notif.id);
          }}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-all flex-shrink-0 -mt-0.5"
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/20 dark:bg-slate-800/40">
        <div
          className={`h-full ${config.accent} transition-none`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}

// ─── Sound Toggle Button ───────────────────────────────────────────────────────

interface SoundToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

function SoundToggle({ enabled, onToggle }: SoundToggleProps) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onToggle}
      title={enabled ? "Mute notification sounds" : "Enable notification sounds"}
      className="hidden md:flex fixed bottom-6 left-6 z-[9998] p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-all hover:scale-110 active:scale-95"
    >
      {enabled ? <Volume2 size={18} /> : <VolumeX size={18} className="opacity-50" />}
    </motion.button>
  );
}

// ─── Push Permission Request Banner ───────────────────────────────────────────

function PushPermissionBanner({ onDismiss }: { onDismiss: () => void }) {
  const [requesting, setRequesting] = useState(false);

  const handleAllow = async () => {
    setRequesting(true);
    const granted = await requestPushPermission();
    setRequesting(false);
    if (granted) {
      onDismiss();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -60 }}
      className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100vw-2rem)] max-w-md"
    >
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 to-blue-500/10 backdrop-blur-xl shadow-2xl p-4 flex items-center gap-4">
        <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/20">
          <Bell size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-black text-slate-900 dark:text-white">
            Enable Push Notifications
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Get instant alerts for orders, RFQs, and messages even when your tab is in the background.
          </p>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={handleAllow}
            disabled={requesting}
            className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-black hover:bg-primary/90 transition-all disabled:opacity-70 whitespace-nowrap"
          >
            {requesting ? "Enabling…" : "Allow"}
          </button>
          <button
            onClick={onDismiss}
            className="text-xs text-muted-foreground hover:text-slate-700 dark:hover:text-slate-300 text-center transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Live Notification Toast Manager ─────────────────────────────────────

const SOUND_KEY = "buysell_sound_enabled";
const PUSH_DISMISSED_KEY = "buysell_push_banner_dismissed";

export default function LiveNotificationToast() {
  const { latestToast, dismissToast, markAsRead } = useNotifications();

  // Queue of active toasts shown on screen
  const [queue, setQueue] = useState<NotificationItem[]>([]);

  // Track which IDs we've already shown (to prevent re-showing on re-render)
  const shownIds = useRef<Set<string>>(new Set());

  // Sound enabled state (persisted in localStorage)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(SOUND_KEY);
    return stored === null ? true : stored === "true";
  });

  // Push permission banner
  const [showPushBanner, setShowPushBanner] = useState(false);

  // Check if we should prompt for push permission
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const dismissed = localStorage.getItem(PUSH_DISMISSED_KEY);
    if (!dismissed && Notification.permission === "default") {
      // Wait 10 seconds then show the banner
      const timer = setTimeout(() => setShowPushBanner(true), 10000);
      return () => clearTimeout(timer);
    }
  }, []);

  // When a new latestToast arrives from context, add it to the queue
  useEffect(() => {
    if (!latestToast) return;
    if (shownIds.current.has(latestToast.id)) return;

    shownIds.current.add(latestToast.id);
    setQueue((prev) => {
      // Limit to max 4 toasts on screen
      const updated = [latestToast, ...prev].slice(0, 4);
      return updated;
    });

    // Mark as read after 5 seconds if not interacted with
    const readTimer = setTimeout(() => {
      markAsRead(latestToast.id);
    }, 5000);

    dismissToast();

    return () => clearTimeout(readTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestToast]);

  const handleDismiss = useCallback((id: string) => {
    setQueue((prev) => prev.filter((n) => n.id !== id));
    markAsRead(id);
  }, [markAsRead]);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(SOUND_KEY, String(next));
      if (next) {
        // Play a confirmation chime when enabling
        playNotificationSound("SUCCESS");
      }
      return next;
    });
  };

  const dismissPushBanner = () => {
    setShowPushBanner(false);
    localStorage.setItem(PUSH_DISMISSED_KEY, "true");
  };

  return (
    <>
      {/* Push permission banner */}
      <AnimatePresence>
        {showPushBanner && (
          <PushPermissionBanner onDismiss={dismissPushBanner} />
        )}
      </AnimatePresence>

      {/* Sound toggle */}
      <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />

      {/* Toast stack — bottom-right */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-3 items-end pointer-events-none">
        <AnimatePresence mode="popLayout">
          {queue.map((notif) => (
            <div key={notif.id} className="pointer-events-auto">
              <ToastCard
                notif={notif}
                onDismiss={handleDismiss}
                soundEnabled={soundEnabled}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
