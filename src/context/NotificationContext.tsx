"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { createClient } from "@/lib/supabase/client";

export type NotificationType = "ORDER" | "MESSAGE" | "RFQ" | "SYSTEM" | "VERIFICATION";

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  latestToast: NotificationItem | null;
  dismissToast: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  sendNotification: (
    targetUserId: string,
    title: string,
    message: string,
    type: NotificationType,
    link?: string,
    metadata?: Record<string, any>
  ) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestToast, setLatestToast] = useState<NotificationItem | null>(null);

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // ─── 1. Fetch initial notifications from Supabase ──────────────────────────
  const fetchNotifications = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.warn("[NotificationContext] Error fetching notifications:", error.message);
        return;
      }

      setNotifications((data as NotificationItem[]) || []);
    } catch (err) {
      console.error("[NotificationContext] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // ─── 2. Subscribe to Real-Time Supabase Changes ────────────────────────────
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    fetchNotifications(user.id);

    // Set up Supabase Realtime subscription for INSERT and UPDATE on notifications table
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificationItem;
          setNotifications((prev) => [newNotif, ...prev]);
          setLatestToast(newNotif);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedNotif = payload.new as NotificationItem;
          setNotifications((prev) =>
            prev.map((item) => (item.id === updatedNotif.id ? updatedNotif : item))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const deletedId = payload.old.id;
          setNotifications((prev) => prev.filter((item) => item.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications, supabase]);

  const dismissToast = () => setLatestToast(null);

  // ─── 3. Action Methods ──────────────────────────────────────────────────────
  const markAsRead = async (id: string) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    try {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);
    } catch (err) {
      console.error("[NotificationContext] Error marking as read:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
    } catch (err) {
      console.error("[NotificationContext] Error marking all as read:", err);
    }
  };

  const deleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await supabase.from("notifications").delete().eq("id", id);
    } catch (err) {
      console.error("[NotificationContext] Error deleting notification:", err);
    }
  };

  const clearAll = async () => {
    if (!user) return;
    setNotifications([]);
    try {
      await supabase.from("notifications").delete().eq("user_id", user.id);
    } catch (err) {
      console.error("[NotificationContext] Error clearing notifications:", err);
    }
  };

  const sendNotification = async (
    targetUserId: string,
    title: string,
    message: string,
    type: NotificationType,
    link?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: targetUserId,
        title,
        message,
        type,
        link: link || null,
        metadata: metadata || {},
        read: false,
      });

      if (error) {
        console.error("[NotificationContext] Error sending notification:", error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("[NotificationContext] Unexpected error sending notification:", err);
      return false;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        latestToast,
        dismissToast,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        sendNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within NotificationProvider");
  return context;
};
