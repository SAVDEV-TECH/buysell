"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  ShieldCheck,
  ShieldOff,
  Clock,
  Mail,
  Calendar,
  RefreshCw,
  Loader2,
  ChevronDown,
  Bell,
  X,
} from "lucide-react";

interface UserRecord {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  organization_id?: string;
  org?: { company_name: string; verification_level: string };
}

type RoleType = "buyer" | "supplier" | "super_admin" | "procurement_manager";

export default function AdminUsersPage() {
  const { user: adminUser, role: adminRole } = useAuth();
  const supabase = createClient();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Notification send modal
  const [notifModal, setNotifModal] = useState<UserRecord | null>(null);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(`
          id, full_name, email, role, created_at, organization_id,
          org:organizations(company_name, verification_level)
        `)
        .order("created_at", { ascending: false })
        .limit(200);

      if (!error) setUsers((data as any[]) || []);
    } catch (err) {
      console.error("Users fetch error:", err);
    }
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchUsers();
      setLoading(false);
    };
    init();
  }, [fetchUsers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const changeRole = async (userId: string, newRole: RoleType) => {
    try {
      await supabase.from("users").update({ role: newRole }).eq("id", userId);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      console.error("Role change error:", err);
    }
  };

  const sendNotification = async () => {
    if (!notifModal || !notifTitle.trim() || !notifMessage.trim()) return;
    setSendingNotif(true);
    try {
      await supabase.from("notifications").insert({
        user_id: notifModal.id,
        title: notifTitle,
        message: notifMessage,
        type: "SYSTEM",
        link: "/dashboard",
        read: false,
      });
      setNotifModal(null);
      setNotifTitle("");
      setNotifMessage("");
    } catch (err) {
      console.error("Notif send error:", err);
    } finally {
      setSendingNotif(false);
    }
  };

  const roleColors: Record<string, string> = {
    super_admin: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    procurement_manager: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    supplier: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    buyer: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };

  const filtered = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    }
    return true;
  });

  const roleCounts = {
    all: users.length,
    buyer: users.filter((u) => u.role === "buyer").length,
    supplier: users.filter((u) => u.role === "supplier").length,
    super_admin: users.filter((u) => u.role === "super_admin").length,
    procurement_manager: users.filter((u) => u.role === "procurement_manager").length,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Users size={22} className="text-primary" /> User Management
          </h1>
          <p className="text-slate-500 text-sm font-bold mt-1">
            {users.length.toLocaleString()} registered accounts
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
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto scrollbar-none">
          {(["all", "supplier", "buyer", "super_admin", "procurement_manager"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 text-[11px] font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                roleFilter === r
                  ? "bg-primary text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {r === "all" ? "All" : r.replace("_", " ")}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${roleFilter === r ? "bg-white/20" : "bg-slate-800"}`}>
                {roleCounts[r]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3">
            <Loader2 size={28} className="text-primary animate-spin" />
            <p className="text-slate-500 text-sm font-bold">Loading users…</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  {["User", "Role", "Organization", "Joined", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                <AnimatePresence>
                  {filtered.map((u, i) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/40 to-violet-600/40 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                            {u.full_name?.[0] || "?"}
                          </div>
                          <div>
                            <p className="text-xs font-black text-white">{u.full_name || "—"}</p>
                            <p className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
                              <Mail size={9} /> {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u.id, e.target.value as RoleType)}
                          disabled={u.id === adminUser?.id}
                          className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-black cursor-pointer outline-none transition-all disabled:cursor-not-allowed ${roleColors[u.role] || roleColors.buyer} bg-transparent`}
                        >
                          <option value="buyer">Buyer</option>
                          <option value="supplier">Supplier</option>
                          <option value="procurement_manager">Procurement Manager</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      </td>

                      <td className="px-5 py-4">
                        {(u.org as any)?.company_name ? (
                          <div>
                            <p className="text-xs font-bold text-slate-300">{(u.org as any).company_name}</p>
                            <span className={`text-[10px] font-black uppercase ${
                              (u.org as any).verification_level === "verified" ? "text-emerald-400" : "text-amber-400"
                            }`}>
                              {(u.org as any).verification_level}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-600 font-bold">No org</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(u.created_at).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() => setNotifModal(u)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[11px] font-bold transition-all border border-slate-700"
                        >
                          <Bell size={11} /> Notify
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Send Notification Modal */}
      <AnimatePresence>
        {notifModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-7 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Bell size={18} className="text-primary" /> Send Notification
                  </h3>
                  <p className="text-xs text-slate-500 font-bold mt-1">To: {notifModal.full_name} ({notifModal.email})</p>
                </div>
                <button onClick={() => setNotifModal(null)} className="p-1 text-slate-500 hover:text-slate-300 rounded-lg">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Notification title…"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-primary/40"
                />
                <textarea
                  rows={3}
                  placeholder="Message body…"
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={sendNotification}
                  disabled={!notifTitle.trim() || !notifMessage.trim() || sendingNotif}
                  className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                >
                  {sendingNotif ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                  Send
                </button>
                <button
                  onClick={() => setNotifModal(null)}
                  className="px-6 py-3 bg-slate-800 text-slate-300 rounded-2xl font-bold text-sm hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
