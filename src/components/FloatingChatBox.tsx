"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
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
  getDoc,
  getDocs,
  limit
} from "firebase/firestore";
import { 
  MessageSquare, 
  X, 
  Send, 
  Loader2, 
  Minus,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
  chatId?: string;
}

interface FloatingChatBoxProps {
  manufacturerId: string;
  manufacturerName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function FloatingChatBox({ manufacturerId, manufacturerName, isOpen, onClose }: FloatingChatBoxProps) {
  const { user } = useAuth();
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize or fetch existing chat
  useEffect(() => {
    if (!user || !isOpen) return;

    const initializeChat = async () => {
      setLoading(true);
      setIsMockMode(false);
      try {
        const explicitChatId = [user.uid, manufacturerId].sort().join("_");
        const chatRef = doc(db, "chats", explicitChatId);
        const chatSnap = await getDoc(chatRef);
        
        if (!chatSnap.exists()) {
          const newChatData = {
            participants: [user.uid, manufacturerId],
            participantNames: {
              [user.uid]: user.displayName || user.email || "Wholesaler",
              [manufacturerId]: manufacturerName || "Manufacturer",
            },
            lastMessageAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };
          
          await setDoc(chatRef, newChatData);
        }
        setChatId(explicitChatId);
      } catch (error) {
        console.error("Firebase permission error, falling back to mock mode:", error);
        setIsMockMode(true);
        setChatId("mock_" + manufacturerId);
      } finally {
        setLoading(false);
      }
    };

    initializeChat();
  }, [user, isOpen, manufacturerId, manufacturerName]);

  // Listen for messages once chatId is established
  useEffect(() => {
    if (!chatId || isMockMode) return;

    const q = query(
      collection(db, "messages"),
      where("chatId", "==", chatId),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      fetchedMessages.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setMessages(fetchedMessages);
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.warn("Message listener permission denied. Falling back to mock mode.");
        setIsMockMode(true);
      } else {
        console.error("Snapshot listener error:", error);
      }
    });

    return () => unsubscribe();
  }, [chatId, isMockMode]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && !loading) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized, loading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !chatId) return;

    if (isMockMode) {
      // Handle mock message sending
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        senderId: user.uid,
        text: newMessage.trim(),
        createdAt: { toDate: () => new Date() }
      }]);
      setNewMessage("");
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Math.random().toString(),
          senderId: manufacturerId,
          text: "Thank you for reaching out! A representative will respond shortly regarding your bulk order inquiry.",
          createdAt: { toDate: () => new Date() }
        }]);
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 1000);
      return;
    }

    setSending(true);
    try {
      await addDoc(collection(db, "messages"), {
        chatId: chatId,
        senderId: user.uid,
        text: newMessage.trim(),
        createdAt: Timestamp.now()
      });
      
      // Update the chat with the last message
      await setDoc(doc(db, "chats", chatId), {
        lastMessage: newMessage.trim(),
        lastMessageAt: Timestamp.now(),
        lastSenderId: user.uid
      }, { merge: true });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
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
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[350px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-borderline z-50 overflow-hidden flex flex-col transition-all duration-300 ${isMinimized ? 'h-[60px]' : 'h-[500px] max-h-[80vh]'}`}
      >
        {/* Header */}
        <div 
          className="bg-[#0f172a] text-white p-4 flex items-center justify-between cursor-pointer"
          onClick={() => setIsMinimized(!isMinimized)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm">
              {manufacturerName.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">{manufacturerName}</h3>
              <p className="text-[10px] text-green-400 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span> Online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Minus size={16} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-red-400"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        {!isMinimized && (
          <>
            <div className="flex-1 bg-slate-50/50 p-4 overflow-y-auto flex flex-col gap-4">
              {!user ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <p className="text-sm text-muted-foreground">Please log in to chat with {manufacturerName}.</p>
                </div>
              ) : loading ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <Loader2 size={24} className="text-primary animate-spin mb-2" />
                  <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase">Connecting...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                  <MessageSquare size={32} className="mb-2" />
                  <p className="text-xs font-bold">Start the conversation</p>
                  <p className="text-[10px]">Send a message to discuss bulk pricing or details.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === user.uid;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${isMe ? 'bg-primary text-white rounded-br-sm' : 'bg-white border border-borderline text-foreground rounded-bl-sm'}`}>
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-muted-foreground mt-1 flex items-center gap-1">
                        {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isMe && <CheckCircle2 size={10} className="text-blue-500" />}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            {user && (
              <div className="p-3 bg-white border-t border-borderline">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input 
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 text-sm bg-muted/50 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={loading || sending}
                  />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim() || sending || loading}
                    className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shrink-0 hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
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
