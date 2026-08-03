"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  Minus,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ChatMessage {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
}

interface FloatingChatBoxProps {
  manufacturerId: string;
  manufacturerName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function FloatingChatBox({
  manufacturerId,
  manufacturerName,
  isOpen,
  onClose,
}: FloatingChatBoxProps) {
  const { user } = useAuth();
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [isMinimized, setIsMinimized] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Initialize or Fetch Database Conversation ─────────────────────────────
  const initConversation = useCallback(async () => {
    if (!user || !manufacturerId) return;
    setLoading(true);
    setErrorMsg("");

    try {
      // Call server-side API to get or create persistent conversation
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: manufacturerId }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to initialize conversation.");
      }

      const convId = json.data?.conversation?.id;
      if (convId) {
        setConversationId(convId);

        // Fetch existing messages
        const { data: fetchedMsgs } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: true });

        setMessages((fetchedMsgs as ChatMessage[]) || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[FloatingChatBox] Init error:", msg);
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [user, manufacturerId, supabase]);

  useEffect(() => {
    if (isOpen && user) {
      initConversation();
    }
  }, [isOpen, user, initConversation]);

  // ─── Realtime Subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chatbox-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  // Auto scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Send Message to Supabase Database ─────────────────────────────────────
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !conversationId || sending) return;

    const text = newMessage.trim();
    setNewMessage("");
    setSending(true);

    const optimistic: ChatMessage = {
      id: `opt-${Date.now()}`,
      sender_id: user.id,
      text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      // 1. Insert message into Supabase DB
      const { error: sendErr } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        text,
        read: false,
      });

      if (sendErr) throw sendErr;

      // 2. Update conversation last message timestamp
      await supabase
        .from("conversations")
        .update({
          last_message_text: text,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[FloatingChatBox] Send error:", msg);
      alert("Failed to send message: " + msg);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className={`fixed bottom-20 right-4 sm:bottom-6 sm:right-6 w-[360px] max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden flex flex-col transition-all duration-300 ${
          isMinimized ? "h-[64px]" : "h-[500px] max-h-[80vh]"
        }`}
      >
        {/* Header */}
        <div
          className="bg-slate-900 text-white p-4 flex items-center justify-between cursor-pointer border-b border-slate-800"
          onClick={() => setIsMinimized(!isMinimized)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center font-black text-sm text-white flex-shrink-0 shadow-md">
              {manufacturerName?.charAt(0) || "S"}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-white truncate leading-tight">
                {manufacturerName}
              </h3>
              <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Escrow Trade Channel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                router.push("/dashboard/messages");
              }}
              title="Open full screen chat dashboard"
              className="p-1.5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-colors"
            >
              <ExternalLink size={15} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(!isMinimized);
              }}
              className="p-1.5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-colors"
            >
              <Minus size={15} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 hover:bg-white/10 text-red-400 rounded-lg transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <>
            <div className="flex-1 bg-slate-50/50 dark:bg-slate-950/40 p-4 overflow-y-auto flex flex-col gap-3">
              {!user ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <p className="text-xs font-bold text-muted-foreground">
                    Please log in to send persistent messages to {manufacturerName}.
                  </p>
                  <Link
                    href="/login"
                    className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-md"
                  >
                    Log In Now
                  </Link>
                </div>
              ) : loading ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <Loader2 size={24} className="text-primary animate-spin mb-2" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Connecting Secure Channel…
                  </p>
                </div>
              ) : errorMsg ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                  <p className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/40 p-3 rounded-xl border border-red-200 dark:border-red-800">
                    {errorMsg}
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60 space-y-2">
                  <MessageSquare size={32} className="text-primary" />
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Start B2B Trade Conversation
                  </p>
                  <p className="text-[10px] text-muted-foreground max-w-[200px]">
                    Messages are saved to your dashboard and protected by BuySell escrow.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === user.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                          isMe
                            ? "bg-primary text-white rounded-br-none"
                            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={scrollRef} />
            </div>

            {/* Input Bar */}
            {user && (
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Write a message…"
                    className="flex-1 px-3.5 py-2.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {sending ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Send size={15} />
                    )}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
