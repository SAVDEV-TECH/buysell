"use client";

import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  MoreVertical,
  Mail,
  Loader2,
  X,
  CheckCircle2,
  Trash2,
  Edit,
  UserCheck,
  AlertCircle,
  Building2,
  Clock,
  Send,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  created_at: string;
}

interface TeamInvitation {
  id: string;
  email: string;
  role: string;
  status: "pending" | "accepted" | "expired";
  token: string;
  created_at: string;
  expires_at: string;
}

const ROLES = [
  { id: "admin", label: "Admin / Co-Owner", desc: "Full access to settings, finances, products, orders & team management." },
  { id: "procurement_manager", label: "Procurement Manager", desc: "Can post RFQs, review quotes, place orders, & manage purchases." },
  { id: "sales_manager", label: "Sales Manager", desc: "Can manage product listings, pricing tiers, & update order shipments." },
  { id: "accountant", label: "Accountant", desc: "Access to business analytics, commercial invoices, & payout withdrawals." },
];

export default function TeamPage() {
  const { user, profile, organizationId } = useAuth();
  const { sendNotification } = useNotifications();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("procurement_manager");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [newRole, setNewRole] = useState("");
  const [updatingMember, setUpdatingMember] = useState(false);

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // ─── Fetch Team & Invitations ────────────────────────────────────────────────
  const fetchTeamData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch active team members belonging to this org
      let membersQuery = supabase
        .from("users")
        .select("id, email, full_name, role, avatar_url, created_at");

      if (organizationId) {
        membersQuery = membersQuery.eq("organization_id", organizationId);
      } else {
        membersQuery = membersQuery.eq("id", user.id);
      }

      const { data: membersData } = await membersQuery;
      setMembers((membersData as TeamMember[]) || []);

      // 2. Fetch pending invitations for this org
      if (organizationId) {
        const { data: inviteData } = await supabase
          .from("team_invitations")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false });

        setInvitations((inviteData as TeamInvitation[]) || []);
      }
    } catch (err) {
      console.warn("[Team] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, organizationId, supabase]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  // ─── Realtime Subscriptions ──────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("team-realtime-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, fetchTeamData)
      .on("postgres_changes", { event: "*", schema: "public", table: "team_invitations" }, fetchTeamData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchTeamData]);

  // ─── Handle Invite Member ────────────────────────────────────────────────────
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !organizationId || !inviteEmail.trim()) return;
    setInviting(true);
    setInviteError("");
    setInviteSuccess("");

    try {
      const emailClean = inviteEmail.trim().toLowerCase();

      // Check if user is already a member
      if (members.some((m) => m.email.toLowerCase() === emailClean)) {
        setInviteError("This user is already a member of your organization.");
        return;
      }

      // Check if target user exists in database
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, email, organization_id")
        .eq("email", emailClean)
        .maybeSingle();

      if (existingUser) {
        // Update target user's organization_id & role directly
        await supabase
          .from("users")
          .update({
            organization_id: organizationId,
            role: inviteRole,
          })
          .eq("id", existingUser.id);

        await sendNotification(
          existingUser.id,
          "🏢 Added to Organization Team",
          `You have been added to the organization team as ${inviteRole}.`,
          "SYSTEM",
          "/dashboard"
        );

        setInviteSuccess(`User ${emailClean} added to team!`);
      } else {
        // Create a team invitation record
        const { error: inviteErr } = await supabase
          .from("team_invitations")
          .insert({
            organization_id: organizationId,
            email: emailClean,
            role: inviteRole,
            invited_by: user.id,
            status: "pending",
          });

        if (inviteErr) throw inviteErr;
        setInviteSuccess(`Invitation sent to ${emailClean}!`);
      }

      setInviteEmail("");
      fetchTeamData();
      setTimeout(() => setShowInviteModal(false), 1500);
    } catch (err: any) {
      console.error("Error sending invite:", err);
      setInviteError(err.message || "Failed to send invitation.");
    } finally {
      setInviting(false);
    }
  };

  // ─── Handle Role Update ──────────────────────────────────────────────────────
  const handleUpdateRole = async () => {
    if (!editingMember || !newRole) return;
    setUpdatingMember(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ role: newRole })
        .eq("id", editingMember.id);

      if (error) throw error;

      setEditingMember(null);
      fetchTeamData();
    } catch (err: any) {
      alert("Failed to update role: " + err.message);
    } finally {
      setUpdatingMember(false);
    }
  };

  // ─── Handle Remove Member ───────────────────────────────────────────────────
  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member from the organization?")) return;
    try {
      await supabase
        .from("users")
        .update({ organization_id: null })
        .eq("id", memberId);

      fetchTeamData();
    } catch (err: any) {
      alert("Failed to remove member: " + err.message);
    }
  };

  // ─── Handle Revoke Invitation ────────────────────────────────────────────────
  const handleCancelInvite = async (inviteId: string) => {
    try {
      await supabase.from("team_invitations").delete().eq("id", inviteId);
      fetchTeamData();
    } catch (err: any) {
      console.error("Error canceling invite:", err);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Team & Role Permissions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage organization staff members, assign role permissions, & send team invites
          </p>
        </div>

        <button
          onClick={() => { setShowInviteModal(true); setInviteError(""); setInviteSuccess(""); }}
          className="flex items-center gap-2 px-6 py-3.5 bg-primary text-white rounded-2xl font-bold text-sm shadow-xl shadow-primary/25 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all"
        >
          <UserPlus size={18} /> Invite Team Member
        </button>
      </div>

      {/* ── Main Layout: Team List (2 cols) + Role Guide (1 col) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Active Members & Invitations (2 cols) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Active Members Card */}
          <div className="glass rounded-3xl p-6 lg:p-8 border border-borderline space-y-6">
            <div className="flex justify-between items-center border-b border-borderline pb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users size={18} className="text-primary" /> Active Team Members ({members.length})
              </h3>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                Live Organization Sync
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-primary" /> Syncing team roster…
              </div>
            ) : members.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground italic">No team members found.</div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => {
                  const isSelf = member.id === user?.id;
                  return (
                    <div
                      key={member.id}
                      className="group flex items-center justify-between p-4 rounded-2xl border border-borderline bg-white dark:bg-slate-900 hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-primary/20 flex-shrink-0">
                          {(member.full_name || member.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                            {member.full_name || "Staff Member"}
                            {isSelf && <span className="text-[10px] text-primary font-black uppercase">(You)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground font-medium">{member.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl border border-primary/20">
                          {member.role || "member"}
                        </span>

                        {!isSelf && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditingMember(member); setNewRole(member.role); }}
                              title="Edit Role"
                              className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              title="Remove Member"
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Invitations Card */}
          {invitations.length > 0 && (
            <div className="glass rounded-3xl p-6 border border-borderline space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Clock size={16} className="text-amber-500" /> Pending Invitations ({invitations.length})
              </h3>

              <div className="space-y-2">
                {invitations.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <Mail size={16} className="text-amber-500" />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{invite.email}</p>
                        <p className="text-[10px] text-muted-foreground">Role: {invite.role} · Expires in 7 days</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCancelInvite(invite.id)}
                      className="text-xs font-bold text-red-500 hover:underline"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Role Permissions Guide (1 col) */}
        <div className="lg:col-span-1">
          <div className="glass rounded-3xl p-6 lg:p-8 border border-borderline space-y-6 sticky top-6">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Shield size={18} className="text-primary" /> Role Permissions Matrix
            </h3>

            <div className="space-y-4">
              {ROLES.map((role) => (
                <div key={role.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-primary" /> {role.label}
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {role.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── Invite Member Modal ── */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black">Invite Team Member</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Add staff members to your B2B organization.</p>
                </div>
                <button onClick={() => setShowInviteModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl">
                  <X size={18} />
                </button>
              </div>

              {inviteError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-600 rounded-xl text-xs font-bold">
                  {inviteError}
                </div>
              )}

              {inviteSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 text-emerald-600 rounded-xl text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> {inviteSuccess}
                </div>
              )}

              <form onSubmit={handleSendInvite} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Assign Permission Role *</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/40 bg-transparent"
                  >
                    {ROLES.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail.trim()}
                    className="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {inviting ? <Loader2 size={16} className="animate-spin" /> : "Send Invitation"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit Member Role Modal ── */}
      <AnimatePresence>
        {editingMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black">Edit Member Role</h3>
                <button onClick={() => setEditingMember(null)} className="p-1 text-slate-400">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                Update permissions for <strong>{editingMember.full_name || editingMember.email}</strong>.
              </p>

              <div>
                <label className="text-xs font-bold block mb-1">New Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-primary/40 bg-transparent"
                >
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="flex-1 py-3 border rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateRole}
                  disabled={updatingMember}
                  className="flex-1 py-3 bg-primary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  {updatingMember ? <Loader2 size={16} className="animate-spin" /> : "Save Role"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
