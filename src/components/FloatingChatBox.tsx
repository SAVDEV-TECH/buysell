"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setSending(true);
    setMessages(prev => [...prev, {
      id: Math.random().toString(),
      senderId: user.id,
      text: newMessage.trim(),
      createdAt: new Date(),
    }]);

    setNewMessage("");
    setSending(false);
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
        <div 
          className="bg-[#0f172a] text-white p-4 flex items-center justify-between cursor-pointer"
          onClick={() => setIsMinimized(!isMinimized)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm">
              {manufacturerName?.charAt(0) || "S"}
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

        {!isMinimized && (
          <>
            <div className="flex-1 bg-slate-50/50 p-4 overflow-y-auto flex flex-col gap-4">
              {!user ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <p className="text-sm text-muted-foreground">Please log in to chat with {manufacturerName}.</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                  <MessageSquare size={32} className="mb-2" />
                  <p className="text-xs font-bold">Start the conversation</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === user.id;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${isMe ? 'bg-primary text-white' : 'bg-white border border-borderline'}`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={scrollRef} />
            </div>

            {user && (
              <div className="p-3 bg-white border-t border-borderline">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input 
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 text-sm bg-muted/50 rounded-xl outline-none"
                  />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shrink-0"
                  >
                    <Send size={16} />
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
