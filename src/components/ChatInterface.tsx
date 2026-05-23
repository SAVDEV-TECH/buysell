"use client";

import { useState } from "react";
import { Send, Search, MoreVertical, Image as ImageIcon, Paperclip, CheckCircle2, Video } from "lucide-react";
import Link from "next/link";
import { VerifiedBadge } from "@/components/VerifiedBadge";

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  participantName: string;
  participantId: string;
  isVerified: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export default function ChatInterface() {
  const [conversations] = useState<Conversation[]>([
    {
      id: "conv1",
      participantName: "Lagos Tech Manufacturing Ltd.",
      participantId: "mfg1",
      isVerified: true,
      lastMessage: "Yes, we can definitely do custom OEM branding for that quantity.",
      lastMessageTime: "10:45 AM",
      unreadCount: 2,
    },
    {
      id: "conv2",
      participantName: "West African Textiles Co.",
      participantId: "mfg2",
      isVerified: true,
      lastMessage: "I will send over the sample fabric by tomorrow.",
      lastMessageTime: "Yesterday",
      unreadCount: 0,
    },
    {
      id: "conv3",
      participantName: "AgriGrow Processors",
      participantId: "mfg3",
      isVerified: false,
      lastMessage: "Are you looking for FOB or CIF shipping?",
      lastMessageTime: "Mon",
      unreadCount: 0,
    }
  ]);

  const [activeConversation, setActiveConversation] = useState<string>("conv1");
  const [messageInput, setMessageInput] = useState("");

  const mockMessages: Record<string, Message[]> = {
    "conv1": [
      { id: "m1", senderId: "wholesaler", text: "Hello, I am interested in ordering 500 units of your Smart Home Hub. Can you accommodate custom branding?", timestamp: "10:30 AM" },
      { id: "m2", senderId: "mfg1", text: "Hi there! Thanks for reaching out.", timestamp: "10:44 AM" },
      { id: "m3", senderId: "mfg1", text: "Yes, we can definitely do custom OEM branding for that quantity.", timestamp: "10:45 AM" },
    ],
    "conv2": [
      { id: "m4", senderId: "mfg2", text: "I will send over the sample fabric by tomorrow.", timestamp: "Yesterday" },
    ],
    "conv3": [
      { id: "m5", senderId: "mfg3", text: "Are you looking for FOB or CIF shipping?", timestamp: "Mon" },
    ]
  };

  const activeMessages = mockMessages[activeConversation] || [];
  const activeParticipant = conversations.find(c => c.id === activeConversation);

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white border border-border rounded-lg shadow-sm overflow-hidden mt-6">
      
      {/* Sidebar - Conversations List */}
      <div className="w-full md:w-80 border-r border-border flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-border">
          <h2 className="font-bold text-lg mb-4 text-[#0f172a]">Messages</h2>
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
          {conversations.map((conv) => (
            <button 
              key={conv.id}
              onClick={() => setActiveConversation(conv.id)}
              className={`w-full text-left p-4 border-b border-border transition-colors hover:bg-slate-100 ${activeConversation === conv.id ? 'bg-slate-100 border-l-4 border-l-[#0f172a]' : 'border-l-4 border-l-transparent'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-bold text-sm text-[#0f172a] truncate pr-2 flex items-center gap-1">
                  {conv.participantName}
                  {conv.isVerified && <VerifiedBadge />}
                </h3>
                <span className="text-xs text-slate-500 whitespace-nowrap">{conv.lastMessageTime}</span>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500 truncate pr-4">{conv.lastMessage}</p>
                {conv.unreadCount > 0 && (
                  <span className="bg-[#0f172a] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white hidden md:flex">
        {/* Chat Header */}
        {activeParticipant && (
          <div className="p-4 border-b border-border flex justify-between items-center bg-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-800 text-white rounded-full flex items-center justify-center font-bold text-lg">
                {activeParticipant.participantName.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-[#0f172a] flex items-center gap-2">
                  {activeParticipant.participantName}
                  {activeParticipant.isVerified && <VerifiedBadge />}
                </h3>
                <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600 inline-block"></span> Online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link 
                href={`/dashboard/meeting/${activeConversation}`}
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
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
          {activeMessages.map((msg) => {
            const isMe = msg.senderId === "wholesaler";
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm text-sm ${isMe ? 'bg-[#0f172a] text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  {msg.timestamp} {isMe && <CheckCircle2 size={10} className="text-blue-500" />}
                </span>
              </div>
            );
          })}
        </div>

        {/* Message Input */}
        <div className="p-4 bg-white border-t border-border">
          <div className="flex items-end gap-2">
            <div className="flex gap-1 pb-2">
              <button className="p-2 text-slate-400 hover:text-[#0f172a] transition-colors"><Paperclip size={20} /></button>
              <button className="p-2 text-slate-400 hover:text-[#0f172a] transition-colors"><ImageIcon size={20} /></button>
            </div>
            <div className="flex-1 relative bg-slate-50 rounded-lg border border-slate-200 focus-within:border-[#0f172a] transition-colors">
              <textarea 
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Write a message to negotiate terms, request a quote, or ask a question..."
                className="w-full bg-transparent p-3 text-sm focus:outline-none resize-none min-h-[60px] max-h-[120px]"
              />
            </div>
            <button className="h-12 w-12 bg-[#0f172a] text-white rounded-lg flex items-center justify-center hover:bg-[#0f172a]/90 transition-colors shrink-0 mb-1">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
