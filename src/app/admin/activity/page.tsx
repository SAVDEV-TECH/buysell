"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import {
  Activity,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Shield,
  User,
  Clock,
} from "lucide-react";
import BuySellLoader from "@/components/BuySellLoader";

interface ActionEntry {
  id: string;
  action: string;
  notes?: string;
  created_at: string;
  actor?: { full_name: string; email: string };
  order_id?: string;
}

function ActionIcon({ action }: { action: string }) {
  if (action === "approved") return <CheckCircle2 size={14} className="text-emerald-500" />;
  if (action === "rejected") return <XCircle size={14} className="text-red-500" />;
  if (action === "verified") return <Shield size={14} className="text-blue-500" />;
  return <Activity size={14} className="text-primary" />;
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

  if (loading) {
    return <BuySellLoader message="Loading activity audit log..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">Platform Activity Log</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Append-only audit trail · {entries.length} total events · {todayCount} today
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border overflow-x-auto">
          {uniqueActions.map((a) => (
            <button
              key={a}
              onClick={() => setActionFilter(a)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize whitespace-nowrap transition-all ${
                actionFilter === a
                  ? "bg-card text-foreground shadow-sm font-bold border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search notes, actor, action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      {/* Timeline feed */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
            <Activity size={32} className="text-muted-foreground/50" />
            <p className="text-sm font-semibold text-foreground">No activity entries found</p>
            <p className="text-xs text-muted-foreground">Audit events will populate as actions occur on the platform.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3.5 p-3 rounded-lg border border-border bg-background hover:border-primary/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0 mt-0.5">
                  <ActionIcon action={entry.action} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                        entry.action === "approved"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : entry.action === "rejected"
                          ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800"
                          : "bg-muted text-muted-foreground border-border"
                      }`}>
                        {entry.action}
                      </span>
                      {(entry.actor as any)?.full_name && (
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                          <User size={11} className="text-muted-foreground" /> {(entry.actor as any).full_name}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                      <Clock size={11} />
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>

                  {entry.notes && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{entry.notes}</p>
                  )}

                  {(entry.actor as any)?.email && (
                    <p className="text-[10px] text-muted-foreground/70 mt-1">{(entry.actor as any).email}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Footer Notice */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted/60 border border-border text-xs text-muted-foreground">
        <Shield size={14} className="text-primary shrink-0" />
        <span>This is an append-only audit trail. Administrative events are immutable for compliance.</span>
      </div>
    </div>
  );
}
