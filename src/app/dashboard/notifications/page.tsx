"use client";

import { useNotifications } from "@/context/NotificationContext";
import { Bell, ShoppingBag, MessageSquare, Zap, Clock, CheckCircle2, Trash2, ChevronRight, Ban } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function NotificationsPage() {
  const { notifications, markAsRead, unreadCount } = useNotifications();

  const getIcon = (type: string) => {
    switch (type) {
      case "ORDER": return <ShoppingBag size={20} className="text-blue-500" />;
      case "MESSAGE": return <MessageSquare size={20} className="text-purple-500" />;
      case "PROMO": return <Zap size={20} className="text-orange-500" />;
      default: return <Bell size={20} className="text-primary" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
             NOTIFICATIONS {unreadCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{unreadCount}</span>}
          </h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px] mt-2">Platform Protocol Alerts & Event Logs</p>
        </div>
        <button className="text-xs font-black uppercase tracking-widest text-primary hover:underline transition-all">Mark All As Read</button>
      </div>

      <div className="glass rounded-[3rem] border border-borderline overflow-hidden min-h-[600px]">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 text-center space-y-4">
             <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center text-muted-foreground/30">
                <Ban size={40} />
             </div>
             <p className="font-bold text-muted-foreground">No active notification nodes found.</p>
          </div>
        ) : (
          <div className="divide-y divide-borderline/30">
            {notifications.map((notif, i) => (
              <motion.div 
                key={notif.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`p-8 hover:bg-muted/10 transition-all flex items-start gap-6 relative group ${!notif.read ? 'bg-primary/[0.02]' : ''}`}
                onClick={() => markAsRead(notif.id)}
              >
                {!notif.read && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                )}
                
                <div className={`p-4 rounded-2xl ${
                  notif.type === 'ORDER' ? 'bg-blue-500/10' : 
                  notif.type === 'MESSAGE' ? 'bg-purple-500/10' : 
                  notif.type === 'PROMO' ? 'bg-orange-500/10' : 'bg-primary/10'
                }`}>
                  {getIcon(notif.type)}
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className={`font-black text-lg ${!notif.read ? 'text-primary' : 'text-foreground'}`}>{notif.title}</h3>
                    <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-tighter">
                      <Clock size={12} /> {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">{notif.message}</p>
                  
                  {notif.link && (
                    <Link 
                      href={notif.link}
                      className="inline-flex items-center gap-2 py-2 px-4 bg-muted/50 dark:bg-slate-800/50 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                    >
                      Protocol Link <ChevronRight size={14} />
                    </Link>
                  )}
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                   <button className="p-2 text-muted-foreground hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                   </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="p-10 bg-slate-900 rounded-[3rem] text-white flex items-center justify-between overflow-hidden relative group">
         <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 transition-transform group-hover:scale-125">
            <CheckCircle2 size={120} />
         </div>
         <div className="relative z-10">
            <h4 className="text-xl font-black mb-2">System Status</h4>
            <p className="text-white/50 text-xs font-bold font-mono tracking-tighter">ALL-DASHBOARD-STREAMS: NOMINAL-VERIFIED</p>
         </div>
         <div className="flex gap-2 relative z-10">
            {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: `${i*0.2}s` }} />)}
         </div>
      </div>
    </div>
  );
}
