"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  ShieldCheck,
  Mail,
  Calendar,
  RefreshCw,
  Loader2,
  Bell,
  X,
} from "lucide-react";
import BuySellLoader from "@/components/BuySellLoader";

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

  const verifyUserOrg = async (userRecord: UserRecord) => {
    try {
      let orgId = userRecord.organization_id;

      if (!orgId) {
        const { data: newOrg, error: createErr } = await supabase
          .from("organizations")
          .insert({
            company_name: userRecord.full_name ? `${userRecord.full_name}'s Enterprise` : `Enterprise (${userRecord.email})`,
            verification_level: "verified",
            is_verified: true,
            is_active: true,
            owner_id: userRecord.id,
          })
          .select("id")
          .single();

        if (createErr || !newOrg) throw (createErr || new Error("Failed to create organization"));
        orgId = newOrg.id;

        await supabase
          .from("users")
          .update({ organization_id: orgId })
          .eq("id", userRecord.id);
      } else {
        await supabase
          .from("organizations")
          .update({
            verification_level: "verified",
            is_verified: true,
            is_active: true,
          })
          .eq("id", orgId);
      }

      await supabase.from("notifications").insert({
        user_id: userRecord.id,
        title: "🎉 Account & Business Verification Approved!",
        message: "Your account and business profile have been approved by admin. You can now list products, receive orders, and access payouts.",
        type: "VERIFICATION",
        link: "/dashboard",
        read: false,
      });

      await supabase.from("approval_actions").insert({
        actor_id: adminUser?.id,
        action: "approved",
        notes: `Direct verification of user ${userRecord.email} / org ${orgId}`,
      }).maybeSingle();

      alert(`Successfully verified account for ${userRecord.full_name || userRecord.email}!`);
      fetchUsers();
    } catch (err: any) {
      console.error("Error verifying org:", err);
      alert("Failed to verify user: " + (err.message || err));
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

  const roleStyles: Record<string, string> = {
    super_admin: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    procurement_manager: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    supplier: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    buyer: "bg-muted text-muted-foreground border-border",
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

  if (loading) {
    return <BuySellLoader message="Loading registered users..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users size={20} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">User Management</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {users.length.toLocaleString()} total platform accounts registered
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
          {(["all", "supplier", "buyer", "super_admin", "procurement_manager"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
                roleFilter === r
                  ? "bg-card text-foreground shadow-sm font-bold border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r === "all" ? "All" : r.replace("_", " ")}
              <span className={`px-1.5 py-0.2 rounded text-[10px] ${roleFilter === r ? "bg-primary/10 text-primary font-bold" : "bg-card text-muted-foreground"}`}>
                {roleCounts[r]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {u.full_name?.[0] || "?"}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{u.full_name || "—"}</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Mail size={10} /> {u.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value as RoleType)}
                      disabled={u.id === adminUser?.id}
                      className={`px-2 py-1 rounded border text-[11px] font-semibold cursor-pointer outline-none transition-all disabled:opacity-60 bg-card ${roleStyles[u.role] || roleStyles.buyer}`}
                    >
                      <option value="buyer">Buyer</option>
                      <option value="supplier">Supplier</option>
                      <option value="procurement_manager">Procurement Manager</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </td>

                  <td className="px-4 py-3">
                    {(u.org as any)?.company_name ? (
                      <div>
                        <p className="font-semibold text-foreground">{(u.org as any).company_name}</p>
                        <span className={`text-[10px] font-bold uppercase ${
                          (u.org as any).verification_level === "verified" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                        }`}>
                          {(u.org as any).verification_level}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">Individual account</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {new Date(u.created_at).toLocaleDateString()}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(u.org as any)?.verification_level === "verified" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck size={13} /> Verified
                        </span>
                      ) : (
                        <button
                          onClick={() => verifyUserOrg(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold hover:bg-emerald-100 transition-colors"
                        >
                          <ShieldCheck size={12} /> Verify
                        </button>
                      )}

                      <button
                        onClick={() => setNotifModal(u)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] font-semibold transition-colors"
                      >
                        <Bell size={11} /> Notify
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notification Modal */}
      <AnimatePresence>
        {notifModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-xl space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Bell size={16} className="text-primary" /> Send Notification
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">To: {notifModal.full_name} ({notifModal.email})</p>
                </div>
                <button onClick={() => setNotifModal(null)} className="p-1 text-muted-foreground hover:text-foreground rounded">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Notification title..."
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
                <textarea
                  rows={3}
                  placeholder="Message body..."
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={sendNotification}
                  disabled={!notifTitle.trim() || !notifMessage.trim() || sendingNotif}
                  className="flex-1 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
                >
                  {sendingNotif ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
                  Send Message
                </button>
                <button
                  onClick={() => setNotifModal(null)}
                  className="px-4 py-2 border border-border bg-card text-muted-foreground hover:text-foreground rounded-lg font-semibold text-xs hover:bg-muted transition-colors"
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
