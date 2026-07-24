"use client";

import { useAuth } from "@/context/AuthContext";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  KeyboardEvent,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Send,
  Search,
  MessageSquare,
  Loader2,
  Plus,
  X,
  Check,
  CheckCheck,
  MoreVertical,
  User,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { VerifiedBadge } from "@/components/VerifiedBadge";

interface DBConversation {
  id: string;
  participant_a: string;
  participant_b: string;
  last_message_text: string | null;
  last_message_at: string | null;
  created_at: string;
  participant_a_profile?: { full_name: string; avatar_url: string } | null;
  participant_b_profile?: { full_name: string; avatar_url: string } | null;
}

interface DBMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  read: boolean;
  created_at: string;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-12 h-12 text-lg" : "w-10 h-10 text-sm";
  const colors = ["bg-primary", "bg-purple-500", "bg-blue-500", "bg-emerald-500", "bg-orange-500"];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center text-white font-extrabold flex-shrink-0`}>
      {name ? name[0].toUpperCase() : <User size={16} />}
    </div>
  );
}

export default function MessagesPage() {
  const { user, profile } = useAuth();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [conversations, setConversations] = useState<DBConversation[]>([]);
  const [activeConv, setActiveConv] = useState<DBConversation | null>(null);
  const [messages, setMessages] = useState<DBMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewConv, setShowNewConv] = useState(false);
  const [newConvEmail, setNewConvEmail] = useState("");
  const [creatingConv, setCreatingConv] = useState(false);
  const [createError, setCreateError] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ─── Fetch Conversations ────────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConvs(true);
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          participant_a_profile:users!conversations_participant_a_fkey(full_name, avatar_url),
          participant_b_profile:users!conversations_participant_b_fkey(full_name, avatar_url)
        `)
        .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      setConversations((data as DBConversation[]) || []);
    } catch (err) {
      console.warn("[Messages] Could not fetch conversations:", err);
    } finally {
      setLoadingConvs(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // ─── Realtime Subscription: Conversations list ──────────────────────────────
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("conversations-updates")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `participant_a=eq.${user.id}`,
      }, fetchConversations)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `participant_b=eq.${user.id}`,
      }, fetchConversations)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, supabase, fetchConversations]);

  // ─── Fetch Messages for Active Conversation ─────────────────────────────────
  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data as DBMessage[]) || []);
    } catch (err) {
      console.warn("[Messages] Could not fetch messages:", err);
    } finally {
      setLoadingMsgs(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (!activeConv) return;
    fetchMessages(activeConv.id);
  }, [activeConv, fetchMessages]);

  // ─── Realtime Subscription: Messages in active conversation ─────────────────
  useEffect(() => {
    if (!activeConv) return;
    const channel = supabase
      .channel(`messages-${activeConv.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${activeConv.id}`,
      }, (payload) => {
        setMessages((prev) => {
          if (prev.find((m) => m.id === payload.new.id)) return prev;
          return [...prev, payload.new as DBMessage];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConv, supabase]);

  // ─── Auto Scroll to Bottom ───────────────────────────────────────────────────
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Send Message ────────────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !activeConv || sending) return;
    const text = newMessage.trim();
    setNewMessage("");
    setSending(true);

    // Optimistic insert
    const optimistic: DBMessage = {
      id: `opt-${Date.now()}`,
      conversation_id: activeConv.id,
      sender_id: user.id,
      text,
      read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      // Insert message
      await supabase.from("messages").insert({
        conversation_id: activeConv.id,
        sender_id: user.id,
        text,
        read: false,
      });

      // Update conversation's last message
      await supabase.from("conversations").update({
        last_message_text: text,
        last_message_at: new Date().toISOString(),
      }).eq("id", activeConv.id);
    } catch (err) {
      console.error("[Messages] Send error:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ─── Start New Conversation ──────────────────────────────────────────────────
  const handleStartConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newConvEmail.trim()) return;
    setCreatingConv(true);
    setCreateError("");

    try {
      // Find the target user by email
      const { data: targetUser, error: userErr } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("email", newConvEmail.trim().toLowerCase())
        .maybeSingle();

      if (userErr || !targetUser) {
        setCreateError("No user found with that email address. Ask them to register first.");
        return;
      }

      if (targetUser.id === user.id) {
        setCreateError("You cannot start a conversation with yourself.");
        return;
      }

      // Check if conversation already exists
      const { data: existing } = await supabase
        .from("conversations")
        .select("*")
        .or(
          `and(participant_a.eq.${user.id},participant_b.eq.${targetUser.id}),and(participant_a.eq.${targetUser.id},participant_b.eq.${user.id})`
        )
        .maybeSingle();

      if (existing) {
        setActiveConv(existing as DBConversation);
        setShowNewConv(false);
        return;
      }

      // Create new conversation
      const { data: created, error: convErr } = await supabase
        .from("conversations")
        .insert({
          participant_a: user.id,
          participant_b: targetUser.id,
          last_message_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (convErr) throw convErr;

      await fetchConversations();
      setActiveConv(created as DBConversation);
      setShowNewConv(false);
      setNewConvEmail("");
    } catch (err: any) {
      setCreateError(err.message || "Failed to start conversation.");
    } finally {
      setCreatingConv(false);
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const getPartnerName = (conv: DBConversation): string => {
    if (!user) return "Counterpart";
    if (conv.participant_a === user.id) {
      return (conv.participant_b_profile as any)?.full_name || "B2B Partner";
    }
    return (conv.participant_a_profile as any)?.full_name || "B2B Partner";
  };

  const filteredConvs = conversations.filter((c) =>
    getPartnerName(c).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const myName = profile?.full_name || user?.email || "You";

  return (
    <div className="flex h-[calc(100vh-130px)] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">

      {/* ── Left Sidebar: Conversation List ──────────────────────────────── */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900 flex-shrink-0 ${activeConv ? "hidden md:flex" : "flex"}`}>
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Messages</h1>
            <p className="text-xs text-muted-foreground">{conversations.length} conversations</p>
          </div>
          <button
            onClick={() => setShowNewConv(true)}
            title="Start new conversation"
            className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {loadingConvs ? (
            <div className="py-16 flex items-center justify-center">
              <Loader2 size={24} className="text-primary animate-spin" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="py-16 text-center px-4 space-y-3">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
                <MessageSquare size={24} />
              </div>
              <p className="text-xs text-muted-foreground font-semibold">
                No conversations yet.<br />Click <strong>+</strong> to start one.
              </p>
            </div>
          ) : (
            filteredConvs.map((conv) => {
              const partnerName = getPartnerName(conv);
              const isActive = activeConv?.id === conv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConv(conv)}
                  className={`w-full text-left px-5 py-4 transition-all hover:bg-slate-100 dark:hover:bg-slate-800/60 ${isActive ? "bg-primary/5 border-l-4 border-l-primary" : "border-l-4 border-l-transparent"}`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={partnerName} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">{partnerName}</h3>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.last_message_text || "Start a conversation…"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: Chat Area ─────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 ${!activeConv ? "hidden md:flex" : "flex"}`}>
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveConv(null)}
                  className="md:hidden p-1 mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ←
                </button>
                <Avatar name={getPartnerName(activeConv)} />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    {getPartnerName(activeConv)}
                    <VerifiedBadge />
                  </h3>
                  <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active on BuySell
                  </p>
                </div>
              </div>
              <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                <MoreVertical size={18} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-slate-50/40 dark:bg-slate-950/30">
              {loadingMsgs ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={28} className="text-primary animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <MessageSquare size={32} className="text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Secure B2B Channel Open</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Start negotiating, asking questions, or coordinating logistics.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <Avatar name={isMe ? myName : getPartnerName(activeConv)} size="sm" />
                      <div className={`max-w-[70%] space-y-1 ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          isMe
                            ? "bg-primary text-white rounded-br-none shadow-primary/20"
                            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none"
                        }`}>
                          {msg.text}
                        </div>
                        <div className={`flex items-center gap-1 text-[10px] text-slate-400 ${isMe ? "flex-row-reverse" : ""}`}>
                          <Clock size={10} />
                          {formatTime(msg.created_at)}
                          {isMe && (
                            msg.read ? <CheckCheck size={12} className="text-primary" /> : <Check size={12} />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={scrollRef} />
            </div>

            {/* Message Input */}
            <div className="px-5 py-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-end gap-3">
                <div className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all overflow-hidden">
                  <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Write a message… (Enter to send, Shift+Enter for new line)"
                    rows={2}
                    className="w-full bg-transparent px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none resize-none"
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 flex-shrink-0"
                >
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center shadow-xl shadow-primary/10">
              <MessageSquare size={40} className="text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">B2B Messaging Hub</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Select a conversation to negotiate deals, coordinate logistics, and close contracts in real time.
              </p>
            </div>
            <button
              onClick={() => setShowNewConv(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 hover:scale-105 transition-all"
            >
              <Plus size={16} /> Start New Conversation
            </button>
          </div>
        )}
      </div>

      {/* ── New Conversation Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {showNewConv && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-extrabold">New Conversation</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Enter the email of a registered BuySell user.</p>
                </div>
                <button
                  onClick={() => { setShowNewConv(false); setCreateError(""); setNewConvEmail(""); }}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              {createError && (
                <p className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
                  {createError}
                </p>
              )}

              <form onSubmit={handleStartConversation} className="space-y-4">
                <input
                  type="email"
                  required
                  placeholder="supplier@company.com"
                  value={newConvEmail}
                  onChange={(e) => setNewConvEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowNewConv(false); setCreateError(""); setNewConvEmail(""); }}
                    className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingConv || !newConvEmail.trim()}
                    className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {creatingConv ? <Loader2 size={16} className="animate-spin" /> : "Start Chat"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
