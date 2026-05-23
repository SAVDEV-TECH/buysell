"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  Timestamp,
  doc,
  setDoc,
  limit
} from "firebase/firestore";
import { 
  Send, 
  Search, 
  MoreVertical, 
  Paperclip, 
  Image as ImageIcon,
  MessageSquare,
  Loader2,
  CheckCircle2,
  Video
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useNotifications } from "@/context/NotificationContext";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export default function MessagesPage() {
  const { user, role } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const searchParams = useSearchParams();
  const initChatId = searchParams.get("chatId");
  const { sendNotification } = useNotifications();

  // Fetch all chats for the user
  useEffect(() => {
    if (!user || !role) return;
    
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedChats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort in-memory
      fetchedChats.sort((a: any, b: any) => (b.lastMessageAt?.seconds || 0) - (a.lastMessageAt?.seconds || 0));
      setChats(fetchedChats);
      
      if (initChatId && !activeChat) {
         const found = fetchedChats.find(c => c.id === initChatId);
         if (found) setActiveChat(found);
      }
      
      setLoading(false);
    }, (error) => {
      console.error("Error fetching chats:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, role, initChatId, activeChat]);

  // Fetch messages for the active chat
  useEffect(() => {
    if (!activeChat) return;

    const q = query(
      collection(db, "messages"),
      where("chatId", "==", activeChat.id),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort in-memory
      fetchedMessages.sort((a: any, b: any) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setMessages(fetchedMessages);
      // Scroll to bottom
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }, (err) => {
      console.error("Error in message listener:", err);
    });

    return () => unsubscribe();
  }, [activeChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeChat) return;

    setSending(true);
    try {
      const msgData = {
        chatId: activeChat.id,
        senderId: user.uid,
        text: newMessage.trim(),
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, "messages"), msgData);
      
      // Update the chat with the last message
      await setDoc(doc(db, "chats", activeChat.id), {
        lastMessage: newMessage.trim(),
        lastMessageAt: Timestamp.now(),
        lastSenderId: user.uid
      }, { merge: true });

      const partnerId = activeChat.participants.find((id: string) => id !== user.uid);
      if (partnerId) {
         await sendNotification(
            partnerId,
            "New Message",
            `${user.displayName || 'Someone'} sent you a message.`,
            "MESSAGE",
            `/dashboard/messages?chatId=${activeChat.id}`
         );
      }

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const getChatPartnerName = (chat: any) => {
    const partnerName = chat.participantNames?.[user?.uid === chat.participants[0] ? chat.participants[1] : chat.participants[0]];
    return partnerName || "Verified Manufacturer";
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
         <Loader2 size={48} className="text-[#0f172a] animate-spin mb-4" />
         <p className="text-slate-500 font-medium">Loading conversations...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-[#0f172a] mb-2 tracking-tight">Messaging Hub</h1>
        <p className="text-slate-500 font-medium">Communicate directly with factories to negotiate bulk pricing, shipping terms, and OEM branding.</p>
      </div>

      <div className="flex h-[calc(100vh-220px)] bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        {/* Sidebar - Chat List */}
        <div className={`w-full md:w-80 border-r border-slate-200 flex flex-col bg-slate-50/50 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search messages..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0f172a] transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {chats.length === 0 ? (
              <div className="py-20 text-center text-slate-500 italic text-sm">No conversations found.</div>
            ) : (
              chats.map((chat) => (
                <button 
                  key={chat.id}
                  onClick={() => setActiveChat(chat)}
                  className={`w-full text-left p-4 border-b border-slate-200 transition-colors hover:bg-slate-100 ${activeChat?.id === chat.id ? 'bg-slate-100 border-l-4 border-l-[#0f172a]' : 'border-l-4 border-l-transparent'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-sm text-[#0f172a] truncate pr-2 flex items-center gap-1">
                      {getChatPartnerName(chat)}
                      <VerifiedBadge />
                    </h3>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      {chat.lastMessageAt ? chat.lastMessageAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-500 truncate pr-4">{chat.lastMessage || "Start a conversation..."}</p>
                    {chat.unreadCount > 0 && chat.lastSenderId !== user?.uid && (
                      <span className="bg-[#0f172a] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className={`flex-1 flex flex-col bg-white relative ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
          {activeChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-800 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    {getChatPartnerName(activeChat).charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#0f172a] flex items-center gap-2">
                      {getChatPartnerName(activeChat)}
                      <VerifiedBadge />
                    </h3>
                    <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-600 inline-block"></span> Online
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link 
                    href={`/dashboard/meeting/${activeChat.id}`}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors font-bold text-xs border border-indigo-100"
                    title="Start Virtual Meeting"
                  >
                    <Video size={16} /> <span className="hidden sm:inline">Virtual Meeting</span>
                  </Link>
                  <button className="p-2 text-slate-400 hover:text-[#0f172a] hover:bg-slate-100 rounded-md transition-colors">
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                {messages.length === 0 ? (
                  <div className="text-center text-slate-500 text-sm mt-10">
                    This is the beginning of your conversation with {getChatPartnerName(activeChat)}.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === user?.uid;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm text-sm ${isMe ? 'bg-[#0f172a] text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                          {isMe && <CheckCircle2 size={10} className="text-blue-500" />}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={scrollRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 bg-white border-t border-slate-200 sticky bottom-0">
                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                  <div className="flex gap-1 pb-2">
                    <button type="button" className="p-2 text-slate-400 hover:text-[#0f172a] transition-colors"><Paperclip size={20} /></button>
                    <button type="button" className="p-2 text-slate-400 hover:text-[#0f172a] transition-colors"><ImageIcon size={20} /></button>
                  </div>
                  <div className="flex-1 relative bg-slate-50 rounded-lg border border-slate-200 focus-within:border-[#0f172a] transition-colors">
                    <textarea 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      placeholder="Write a message to negotiate terms, request a quote, or ask a question..."
                      className="w-full bg-transparent p-3 text-sm focus:outline-none resize-none min-h-[60px] max-h-[120px]"
                    />
                  </div>
                  <button 
                    disabled={!newMessage.trim() || sending}
                    type="submit" 
                    className="h-12 w-12 bg-[#0f172a] text-white rounded-lg flex items-center justify-center hover:bg-[#0f172a]/90 transition-colors shrink-0 mb-1 disabled:opacity-50"
                  >
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
              <div className="w-24 h-24 bg-slate-50 rounded-full border border-slate-200 flex items-center justify-center mb-6">
                <MessageSquare size={40} className="text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-[#0f172a] mb-2">Your Messages</h3>
              <p className="text-slate-500 max-w-sm text-sm">Select a conversation from the sidebar to communicate securely with manufacturers and wholesalers.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
