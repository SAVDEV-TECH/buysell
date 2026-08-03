"use client";

import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  KeyboardEvent,
  ChangeEvent,
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
  Paperclip,
  FileText,
  DollarSign,
  ShieldCheck,
  Download,
  ExternalLink,
  Tag,
  Mail,
  Bell,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import Link from "next/link";
import ErrorBoundary from "@/components/ErrorBoundary";

interface QuoteData {
  title: string;
  unit_price: number;
  currency: string;
  moq: number;
  incoterms: string;
  status: "pending" | "accepted" | "rejected";
}

interface DBProfile {
  id?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
}

interface DBConversation {
  id: string;
  participant_a: string;
  participant_b: string;
  last_message_text: string | null;
  last_message_at: string | null;
  created_at: string;
  participant_a_profile?: DBProfile | null;
  participant_b_profile?: DBProfile | null;
}

interface DBMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  read: boolean;
  created_at: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  quote_data?: QuoteData | null;
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
    <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center text-white font-extrabold flex-shrink-0 shadow-sm`}>
      {name ? name[0].toUpperCase() : <User size={16} />}
    </div>
  );
}

export default function MessagesPage() {
  const { user, profile } = useAuth();
  const { sendNotification } = useNotifications();
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
  const [newConvQuery, setNewConvQuery] = useState("");
  const [creatingConv, setCreatingConv] = useState(false);
  const [createError, setCreateError] = useState("");

  // Attachments & Quote Modal state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteTitle, setQuoteTitle] = useState("");
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteMoq, setQuoteMoq] = useState("100");
  const [quoteIncoterms, setQuoteIncoterms] = useState("FOB");
  const [submittingQuote, setSubmittingQuote] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Fetch Conversations ────────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConvs(true);
    try {
      let rawList: any[] = [];

      // 1. Primary fetch with joins
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          participant_a_profile:users!conversations_participant_a_fkey(full_name, avatar_url, email),
          participant_b_profile:users!conversations_participant_b_fkey(full_name, avatar_url, email)
        `)
        .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (error || !data || data.length === 0) {
        // Fallback: simple select without explicit foreign key alias
        const fallback = await supabase
          .from("conversations")
          .select("*")
          .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
          .order("last_message_at", { ascending: false, nullsFirst: false });

        rawList = fallback.data || [];
      } else {
        rawList = data;
      }

      // 2. Fetch missing partner profiles safely
      const partnerIds = Array.from(new Set(
        rawList.map((c) => (c.participant_a === user.id ? c.participant_b : c.participant_a)).filter(Boolean)
      ));

      const profilesMap: Record<string, any> = {};
      if (partnerIds.length > 0) {
        const { data: usersData } = await supabase
          .from("users")
          .select("id, full_name, avatar_url, email")
          .in("id", partnerIds);

        (usersData || []).forEach((u) => {
          profilesMap[u.id] = u;
        });
      }

      // 3. Attach profiles
      const formatted: DBConversation[] = rawList.map((c) => {
        const partnerId = c.participant_a === user.id ? c.participant_b : c.participant_a;
        const profileObj = profilesMap[partnerId] || {
          full_name: partnerId?.slice(0, 8) || "B2B Partner",
          email: "partner@buysell.com",
          avatar_url: null,
        };

        return {
          ...c,
          participant_a_profile: c.participant_a_profile || (c.participant_a === user.id ? profile : profileObj),
          participant_b_profile: c.participant_b_profile || (c.participant_b === user.id ? profile : profileObj),
        };
      });

      setConversations(formatted);

      // Auto-select first conversation if none selected
      if (!activeConv && formatted.length > 0) {
        setActiveConv(formatted[0]);
      }
    } catch (err) {
      console.error("[Messages] Resilient fetch error:", err);
    } finally {
      setLoadingConvs(false);
    }
  }, [user, profile, supabase, activeConv]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // ─── Realtime Subscription: Conversations list ──────────────────────────────
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("global-conversations-realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "conversations",
      }, fetchConversations)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, supabase, fetchConversations]);

  // ─── Fetch Messages for Active Conversation ─────────────────────────────────
  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    try {
      // Primary: Server API route to bypass client RLS hiccups
      const res = await fetch(`/api/messages?conversationId=${convId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setMessages(json.data as DBMessage[]);
          return;
        }
      }

      // Fallback: Client-side Supabase query
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
    if (!activeConv || !user) return;
    const channel = supabase
      .channel(`realtime-msg-${activeConv.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${activeConv.id}`,
      }, (payload) => {
        const newMsg = payload.new as DBMessage;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Trigger notification toast if message is from counterpart
        if (newMsg.sender_id !== user.id) {
          sendNotification(
            user.id,
            "💬 New Trade Message Received",
            newMsg.text || "You received a new document attachment or quotation.",
            "MESSAGE",
            `/dashboard/messages`
          );
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConv, user, supabase, sendNotification]);

  // ─── Auto Scroll to Bottom ───────────────────────────────────────────────────
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Send Message ────────────────────────────────────────────────────────────
  const handleSendMessage = async (attachmentUrl?: string, attachmentName?: string, quote?: QuoteData) => {
    if ((!newMessage.trim() && !attachmentUrl && !quote) || !user || !activeConv || sending) return;
    const text = newMessage.trim() || (quote ? `Formal Offer: ${quote.title}` : `Attached Document: ${attachmentName}`);
    setNewMessage("");
    setSending(true);

    const partnerId = activeConv.participant_a === user.id ? activeConv.participant_b : activeConv.participant_a;
    const optimisticId = `opt-${Date.now()}`;

    // Optimistic insert
    const optimistic: DBMessage = {
      id: optimisticId,
      conversation_id: activeConv.id,
      sender_id: user.id,
      text,
      read: false,
      attachment_url: attachmentUrl || null,
      attachment_name: attachmentName || null,
      quote_data: quote || null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      // 1. Build insert payload
      const insertPayload: Record<string, any> = {
        conversation_id: activeConv.id,
        sender_id: user.id,
        text,
        read: false,
      };

      if (attachmentUrl) insertPayload.attachment_url = attachmentUrl;
      if (attachmentName) insertPayload.attachment_name = attachmentName;
      if (quote) insertPayload.quote_data = quote;

      // Primary insert
      const { error: insertErr } = await supabase.from("messages").insert(insertPayload);

      if (insertErr) {
        console.warn("[Messages] Primary column insert failed, trying plain text fallback:", insertErr.message);

        let fallbackText = text;
        if (quote) {
          fallbackText = `[OFFER] ${quote.title} - $${quote.unit_price}/unit (MOQ: ${quote.moq}, ${quote.incoterms})`;
        } else if (attachmentName) {
          fallbackText = `[ATTACHMENT] ${attachmentName}: ${attachmentUrl || ""}`;
        }

        const { error: fallbackErr } = await supabase.from("messages").insert({
          conversation_id: activeConv.id,
          sender_id: user.id,
          text: fallbackText,
          read: false,
        });

        if (fallbackErr) {
          console.error("[Messages] Fallback insert failed:", fallbackErr);
          setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
          alert("Message delivery failed: " + fallbackErr.message);
          return;
        }
      }

      // 2. Non-blocking update of conversation timestamp
      const { error: convErr } = await supabase.from("conversations").update({
        last_message_text: text,
        last_message_at: new Date().toISOString(),
      }).eq("id", activeConv.id);

      if (convErr) {
        console.warn("[Messages] Non-critical conversation timestamp update failed:", convErr.message);
      }

      // 3. Notify partner
      if (partnerId) {
        await sendNotification(
          partnerId,
          `💬 New Message from ${profile?.full_name || user.email}`,
          text,
          "MESSAGE",
          `/dashboard/messages`
        ).catch((e) => console.warn("[Messages] Push notification failed:", e));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Messages] Send error:", msg);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      alert("Error sending message: " + msg);
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

  // ─── File Attachment Upload ──────────────────────────────────────────────────
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConv || !user) return;

    setUploadingFile(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `chat-attachments/${activeConv.id}/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (uploadErr) {
        const fallbackUrl = URL.createObjectURL(file);
        await handleSendMessage(fallbackUrl, file.name);
      } else {
        const { data: publicUrlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);
        await handleSendMessage(publicUrlData.publicUrl, file.name);
      }
    } catch (err) {
      console.error("[Messages] Upload error:", err);
      alert("Could not upload attachment. Sending as text filename reference.");
      await handleSendMessage(undefined, file.name);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ─── Create Quotation Offer ─────────────────────────────────────────────────
  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteTitle || !quotePrice || !activeConv || !user) return;

    setSubmittingQuote(true);
    const quote: QuoteData = {
      title: quoteTitle,
      unit_price: Number(quotePrice),
      currency: "USD",
      moq: Number(quoteMoq) || 100,
      incoterms: quoteIncoterms,
      status: "pending",
    };

    try {
      await handleSendMessage(undefined, undefined, quote);
      setShowQuoteModal(false);
      setQuoteTitle("");
      setQuotePrice("");
    } catch (err) {
      console.error("[Messages] Quote error:", err);
    } finally {
      setSubmittingQuote(false);
    }
  };

  // ─── Start New Conversation ──────────────────────────────────────────────────
  const handleStartConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newConvQuery.trim()) return;
    setCreatingConv(true);
    setCreateError("");

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientQuery: newConvQuery.trim() }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        const rawErr = json.error || json.message || "Failed to initialize conversation channel.";
        const displayMsg = typeof rawErr === "string" ? rawErr : (rawErr?.message ? String(rawErr.message) : JSON.stringify(rawErr));
        setCreateError(displayMsg);
        return;
      }

      const conv = json.data?.conversation;
      if (conv) {
        await fetchConversations();
        setActiveConv(conv as DBConversation);
        setShowNewConv(false);
        setNewConvQuery("");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "Network or server error starting conversation.";
      setCreateError(msg);
    } finally {
      setCreatingConv(false);
    }
  };

  // ─── Profile Resolution Helpers ─────────────────────────────────────────────
  const getPartnerName = (conv: DBConversation): string => {
    if (!user) return "Counterpart";
    const partnerProfile = conv.participant_a === user.id ? conv.participant_b_profile : conv.participant_a_profile;
    return partnerProfile?.full_name || partnerProfile?.email || "B2B Partner";
  };

  const getPartnerEmail = (conv: DBConversation): string => {
    if (!user) return "";
    const partnerProfile = conv.participant_a === user.id ? conv.participant_b_profile : conv.participant_a_profile;
    return partnerProfile?.email || "";
  };

  const filteredConvs = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      getPartnerName(c).toLowerCase().includes(q) ||
      getPartnerEmail(c).toLowerCase().includes(q)
    );
  });

  const myName = profile?.full_name || user?.email || "You";

  return (
    <ErrorBoundary>
      <div className="flex h-[calc(100vh-130px)] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">

        {/* ── Left Sidebar: Conversation List ──────────────────────────────── */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900 flex-shrink-0 ${activeConv ? "hidden md:flex" : "flex"}`}>
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Trade Messages</h1>
              <p className="text-xs text-muted-foreground">{conversations.length} active channels</p>
            </div>
            <button
              onClick={() => setShowNewConv(true)}
              title="Start new conversation"
              className="w-9 h-9 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

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
                const partnerEmail = getPartnerEmail(conv);
                const isActive = activeConv?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setActiveConv(conv);
                      fetchMessages(conv.id);
                    }}
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
                        {partnerEmail && (
                          <p className="text-[10px] text-primary/70 font-semibold truncate mb-1">
                            {partnerEmail}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.last_message_text || "Start negotiating…"}
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
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setActiveConv(null)}
                    className="md:hidden p-1 mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    ←
                  </button>
                  <Avatar name={getPartnerName(activeConv)} />
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                      {getPartnerName(activeConv)}
                      <VerifiedBadge showText />
                    </h3>
                    {getPartnerEmail(activeConv) && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-medium truncate flex items-center gap-1">
                        <Mail size={11} className="text-primary" /> {getPartnerEmail(activeConv)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowQuoteModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-black hover:bg-emerald-500/20 transition-all shadow-sm"
                  >
                    <Tag size={14} /> Counter-Offer Quote
                  </button>
                </div>
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
                      <h4 className="font-bold text-slate-900 dark:text-white">Secure B2B Trade Channel</h4>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        Discuss specs, share pro-forma invoices, or generate formal counter-offers directly in this thread.
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
                        <div className={`max-w-[75%] space-y-2 ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                          
                          {/* Rich Quote Offer Card */}
                          {msg.quote_data && (
                            <div className="p-4 bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-3xl border border-blue-500/30 shadow-xl space-y-3 w-72">
                              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                <span className="text-[9px] font-mono font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                                  <Tag size={11} /> FORMAL B2B QUOTE OFFER
                                </span>
                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-black rounded-full uppercase">
                                  {msg.quote_data.incoterms}
                                </span>
                              </div>

                              <div>
                                <h4 className="font-black text-sm text-white line-clamp-1">{msg.quote_data.title}</h4>
                                <p className="text-2xl font-black text-cyan-400 mt-1">
                                  ${msg.quote_data.unit_price.toLocaleString()} <span className="text-xs text-white/60 font-bold">/ unit</span>
                                </p>
                                <p className="text-[10px] text-white/70 mt-0.5">MOQ: {msg.quote_data.moq} units</p>
                              </div>

                              <Link
                                href="/checkout"
                                className="w-full py-2.5 bg-cyan-400 text-slate-950 rounded-xl font-black text-xs hover:bg-cyan-300 transition-all flex items-center justify-center gap-1 shadow-md"
                              >
                                Accept & Pay Escrow <ExternalLink size={12} />
                              </Link>
                            </div>
                          )}

                          {/* File Attachment Card */}
                          {msg.attachment_name && (
                            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3 text-xs">
                              <FileText size={18} className="text-primary flex-shrink-0" />
                              <span className="font-bold text-slate-900 dark:text-white truncate max-w-[160px]">
                                {msg.attachment_name}
                              </span>
                              {msg.attachment_url && (
                                <a
                                  href={msg.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all ml-auto"
                                >
                                  <Download size={14} />
                                </a>
                              )}
                            </div>
                          )}

                          {/* Text Bubble */}
                          {msg.text && (
                            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                              isMe
                                ? "bg-primary text-white rounded-br-none shadow-primary/20"
                                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none"
                            }`}>
                              {msg.text}
                            </div>
                          )}

                          {/* Timestamp & Read Status */}
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
              <div className="px-5 py-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-end gap-3">

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xlsx"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    title="Attach File or Document"
                    className="w-10 h-10 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center text-slate-500 hover:text-primary hover:border-primary/40 transition-all mb-1 flex-shrink-0"
                  >
                    {uploadingFile ? <Loader2 size={16} className="animate-spin text-primary" /> : <Paperclip size={18} />}
                  </button>

                  <div className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all overflow-hidden">
                    <textarea
                      ref={textareaRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Write a trade message… (Enter to send, Shift+Enter for new line)"
                      rows={2}
                      className="w-full bg-transparent px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none resize-none"
                    />
                  </div>

                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!newMessage.trim() || sending}
                    className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 flex-shrink-0 mb-1"
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
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">B2B Trade Messaging Hub</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Select a partner to negotiate pricing, share documents, or issue binding counter-offer quotes.
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

        {/* ── Counter-Offer Quote Modal ────────────────────────────────────────── */}
        <AnimatePresence>
          {showQuoteModal && (
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
                <div className="flex justify-between items-center border-b pb-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Issue Counter-Offer Quote</h3>
                    <p className="text-xs text-muted-foreground">Send a binding quotation directly in the chat thread.</p>
                  </div>
                  <button onClick={() => setShowQuoteModal(false)} className="p-1 text-slate-400">
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreateQuote} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold block mb-1">Product / Contract Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 50MT Raw Cashew Nuts (50kg bags)"
                      value={quoteTitle}
                      onChange={(e) => setQuoteTitle(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold block mb-1">Unit Price ($ USD) *</label>
                      <input
                        type="number"
                        required
                        placeholder="1200"
                        value={quotePrice}
                        onChange={(e) => setQuotePrice(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">MOQ (Units) *</label>
                      <input
                        type="number"
                        required
                        value={quoteMoq}
                        onChange={(e) => setQuoteMoq(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-1">Delivery Incoterms</label>
                    <select
                      value={quoteIncoterms}
                      onChange={(e) => setQuoteIncoterms(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-primary/40 bg-white dark:bg-slate-950 font-bold"
                    >
                      <option value="FOB">FOB — Free On Board (Port Departure)</option>
                      <option value="CIF">CIF — Cost, Insurance & Freight</option>
                      <option value="EXW">EXW — Ex Works (Warehouse Origin)</option>
                      <option value="DDP">DDP — Delivered Duty Paid</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowQuoteModal(false)}
                      className="flex-1 py-3 border rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingQuote || !quoteTitle || !quotePrice}
                      className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                      {submittingQuote ? <Loader2 size={16} className="animate-spin" /> : "Send Counter Offer"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                    <h3 className="text-lg font-extrabold">New B2B Conversation</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Enter email address or user name to connect.</p>
                  </div>
                  <button
                    onClick={() => { setShowNewConv(false); setCreateError(""); setNewConvQuery(""); }}
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
                  <div>
                    <label className="text-xs font-bold block mb-1">Partner Email or Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ssamuel106@uniport.edu.ng or Samuel"
                      value={newConvQuery}
                      onChange={(e) => setNewConvQuery(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setShowNewConv(false); setCreateError(""); setNewConvQuery(""); }}
                      className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingConv || !newConvQuery.trim()}
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
    </ErrorBoundary>
  );
}
