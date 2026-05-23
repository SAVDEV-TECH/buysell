"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, limit, addDoc, Timestamp, updateDoc, doc } from "firebase/firestore";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "ORDER" | "MESSAGE" | "PROMO" | "SYSTEM";
  read: boolean;
  createdAt: any;
  link?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  sendNotification: (userId: string, title: string, message: string, type: Notification["type"], link?: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      try {
        const fetched = snap.docs.map(doc => ({ 
           id: doc.id, 
           ...doc.data() 
        })) as Notification[];
        
        // Sort in memory to avoid indexing requirement
        fetched.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        
        setNotifications(fetched);
        setUnreadCount(fetched.filter(n => !n.read).length);
      } catch (err) {
        console.error("Error processing notifications snap:", err);
      }
    }, (error: any) => {
      if (error.code === 'permission-denied') {
        console.warn("Permission denied for notifications node. Check Firestore userId rules.");
      } else {
        console.error("Critical notification listener error:", error);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (error) {
      console.error("Error marking notification read:", error);
    }
  };

  const sendNotification = async (userId: string, title: string, message: string, type: Notification["type"], link?: string) => {
    try {
      await addDoc(collection(db, "notifications"), {
        userId,
        title,
        message,
        type,
        read: false,
        createdAt: Timestamp.now(),
        link: link || ""
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, sendNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within NotificationProvider");
  return context;
};
