"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import {
  Activity,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Shield,
  User,
  Clock,
  Filter,
} from "lucide-react";

interface ActionEntry {
  id: string;
  action: string;
  notes?: string;
  created_at: string;
  actor?: { full_name: string; email: string };
  order_id?: string;
}

function ActionIcon({ action }: { action: string }) {
  if (action === "approved") return <CheckCircle2 size={14} className="text-emerald-400" />;
  if (action === "rejected") return <XCircle size={14} className="text-red-400" />;
  if (action === "verified") return <Shield size={14} className="text-blue-400" />;
  return <Activity size={14} className="text-slate-400" />;
}

export default function AdminActivityPage() {
  const supabase = createClient();
  const [entries, setEntries] = useState<ActionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const fetchActivity = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("approval_actions")
        .select(`
          id, action, notes, created_at, order_id,
          actor:users!approval_actions_actor_id_fkey(full_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(300);
      setEntries((data as any[]) || []);
    } catch (err) {
      console.error("Activity fetch error:", err);
    }
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchActivity();
      setLoading(false);
    };
    init();

    // Realtime
    const channel = supabase
      .channel("admin-activity-log")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "approval_actions" }, fetchActivity)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchActivity, supabase]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchActivity();
    setRefreshing(false);
  };

  const uniqueActions = ["all", ...Array.from(new Set(entries.map((e) => e.action)))];

  const filtered = entries.filter((e) => {
    if (actionFilter !== "all" && e.action !== actionFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.notes?.toLowerCase().includes(q) ||
        (e.actor as any)?.email?.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const todayCount = entries.filter(
    (e) => new Date(e.created_at).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Activity size={22} className="text-primary" /> Platform Activity Log
          </h1>
          <p className="text-slate-500 text-sm font-bold mt-1">
            Append-only audit trail · {entries.length} total actions · {todayCount} today
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto scrollbar-none">
          {uniqueActions.map((a) => (
            <button
              key={a}
              onClick={() => setActionFilter(a)}
              className={`px-3 py-1.5 text-[11px] font-black rounded-xl capitalize whitespace-nowrap transition-all ${
                actionFilter === a ? "bg-primary text-white" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search notes, actor, action…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
        </div>
      </div>

      {/* Timeline feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3">
            <Loader2 size={28} className="text-primary animate-spin" />
            <p className="text-slate-500 text-sm font-bold">Loading audit log…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Activity size={36} className="text-slate-700" />
            <p className="text-slate-500 font-bold">No activity entries found</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-800" />

            <div className="space-y-3">
              {filtered.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.015 }}
                  className="flex items-start gap-4 relative"
                >
                  {/* Timeline dot */}
                  <div className={`relative z-10 w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
                    entry.action === "approved"
                      ? "bg-emerald-950/50 border-emerald-800/40"
                      : entry.action === "rejected"
                      ? "bg-red-950/50 border-red-800/40"
                      : "bg-slate-800 border-slate-700"
                  }`}>
                    <ActionIcon action={entry.action} />
                  </div>

                  {/* Entry content */}
                  <div className="flex-1 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 hover:border-slate-600/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                          entry.action === "approved"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : entry.action === "rejected"
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                        }`}>
                          {entry.action}
                        </span>
                        {(entry.actor as any)?.full_name && (
                          <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                            <User size={10} /> {(entry.actor as any).full_name}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-600 font-bold flex items-center gap-1 whitespace-nowrap">
                        <Clock size={10} />
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>

                    {entry.notes && (
                      <p className="text-xs text-slate-400 leading-relaxed">{entry.notes}</p>
                    )}

                    {(entry.actor as any)?.email && (
                      <p className="text-[10px] text-slate-600 font-bold mt-1.5">{(entry.actor as any).email}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Read-only notice */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-900/50 border border-slate-800 text-xs font-bold text-slate-600">
        <Shield size={14} className="text-slate-600 flex-shrink-0" />
        This is an append-only, read-only audit log. Entries cannot be modified or deleted.
      </div>
    </div>
  );
}
