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

    const optimisticId = `opt-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: optimisticId,
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

      if (sendErr) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        throw sendErr;
      }

      // 2. Update conversation last message timestamp (non-blocking)
      const { error: convErr } = await supabase
        .from("conversations")
        .update({
          last_message_text: text,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      if (convErr) {
        console.warn("[FloatingChatBox] Non-critical conversation timestamp update failed:", convErr.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[FloatingChatBox] Send error:", msg);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      alert("Failed to send message: " + msg);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        className={`fixed bottom-20 right-4 sm:bottom-6 sm:right-6 w-[360px] max-w-[calc(100vw-2rem)] bg-card rounded-2xl shadow-2xl border border-border z-50 overflow-hidden flex flex-col transition-all duration-300 ${
          isMinimized ? "h-[56px]" : "h-[480px] max-h-[80vh]"
        }`}
      >
        {/* Header */}
        <div
          className="bg-card text-foreground p-3.5 flex items-center justify-between cursor-pointer border-b border-border select-none"
          onClick={() => setIsMinimized(!isMinimized)}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center font-bold text-xs text-white flex-shrink-0 shadow-sm">
              {manufacturerName?.charAt(0) || "S"}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs text-foreground truncate leading-tight">
                {manufacturerName}
              </h3>
              <p className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Escrow Trade Channel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                router.push("/dashboard/messages");
              }}
              title="Open full screen messages"
              className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"
            >
              <ExternalLink size={14} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(!isMinimized);
              }}
              title={isMinimized ? "Expand" : "Minimize"}
              className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"
            >
              <Minus size={14} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              title="Close chat"
              className="p-1.5 hover:bg-muted text-red-500 hover:text-red-600 rounded-lg transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <>
            <div className="flex-1 bg-background p-3.5 overflow-y-auto flex flex-col gap-2.5">
              {!user ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <p className="text-xs font-bold text-muted-foreground">
                    Please log in to send messages to {manufacturerName}.
                  </p>
                  <Link
                    href="/login"
                    className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-sm hover:bg-primary/90 transition-all"
                  >
                    Log In Now
                  </Link>
                </div>
              ) : loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                  <Loader2 size={20} className="text-primary animate-spin" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Connecting Trade Channel…
                  </p>
                </div>
              ) : errorMsg ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Supplier Profile Initializing</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {errorMsg}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={initConversation}
                      className="px-3.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-lg transition-all border border-border"
                    >
                      Retry
                    </button>
                    <Link
                      href="/dashboard/messages"
                      className="px-3.5 py-1.5 bg-primary text-white text-xs font-bold rounded-lg transition-all"
                    >
                      Open Messages
                    </Link>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2 p-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <MessageSquare size={20} />
                  </div>
                  <p className="text-xs font-bold text-foreground">
                    Direct Sourcing Channel
                  </p>
                  <p className="text-[11px] text-muted-foreground max-w-[220px] leading-relaxed">
                    Send real-time inquiries directly to {manufacturerName}. All trades are protected by BuySell escrow.
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
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm ${
                          isMe
                            ? "bg-primary text-white rounded-br-none"
                            : "bg-card border border-border text-foreground rounded-bl-none"
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
              <div className="p-2.5 bg-card border-t border-border">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Write a message…"
                    className="flex-1 px-3 py-2 text-xs bg-muted border border-border rounded-xl outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground font-medium transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="w-8 h-8 bg-primary text-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm hover:bg-primary/90 transition-all disabled:opacity-40"
                  >
                    {sending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Send size={13} />
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
