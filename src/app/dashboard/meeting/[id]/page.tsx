"use client";

import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { JitsiMeeting } from "@jitsi/react-sdk";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function MeetingRoom() {
  const { id } = useParams() as { id: string };
  const { user, profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  if (!user) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-black mb-2">Authentication Required</h2>
        <p className="text-muted-foreground mb-6">You must be logged in to access this meeting room.</p>
        <Link href="/login" className="px-6 py-3 bg-primary text-white rounded-2xl font-bold">
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-950 text-white rounded-[2rem] overflow-hidden relative shadow-2xl border border-border mt-6">
      <div className="flex items-center justify-between p-4 bg-card border-b border-border/20 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={16} /> 
            <span className="text-sm font-bold hidden sm:inline">Leave Room</span>
          </button>
          <div>
            <h1 className="font-bold text-sm tracking-wide">Secure B2B Virtual Room</h1>
            <p className="text-[10px] text-white/50 uppercase tracking-widest">End-to-End Encrypted</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-emerald-500">Live Server Active</span>
        </div>
      </div>

      <div className="flex-1 bg-black relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-0">
            <Loader2 size={48} className="text-primary animate-spin mb-4" />
            <p className="text-sm font-bold text-white/70 uppercase tracking-widest animate-pulse">Initializing Secure Channel...</p>
          </div>
        )}
        
        <JitsiMeeting
          domain="meet.jit.si"
          roomName={`buysell-b2b-secure-room-${id}`}
          configOverwrite={{
            startWithAudioMuted: true,
            disableModeratorIndicator: true,
            startScreenSharing: true,
            enableEmailInStats: false,
            prejoinPageEnabled: true
          }}
          interfaceConfigOverwrite={{
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            SHOW_JITSI_WATERMARK: false,
          }}
          userInfo={{
            displayName: profile?.full_name || user.email?.split("@")[0] || "Wholesaler",
            email: user.email || ""
          }}
          onApiReady={(externalApi) => {
            setLoading(false);
            externalApi.addListener("videoConferenceLeft", () => {
              router.push("/dashboard/messages");
            });
          }}
          getIFrameRef={(iframeRef) => {
            iframeRef.style.height = '100%';
            iframeRef.style.width = '100%';
            iframeRef.style.border = 'none';
          }}
        />
      </div>
    </div>
  );
}
