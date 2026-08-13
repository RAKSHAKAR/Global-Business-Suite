"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function TeamPage() {
  const { token } = useAuth();
  const [team, setTeam] = useState<any[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("PARTNER_MEMBER");

  const loadTeam = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/v1/partner/team`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Team request failed with HTTP ${response.status}`);
      setTeam(Array.isArray(payload.team) ? payload.team : []);
      setPendingInvitations(Array.isArray(payload.pendingInvitations) ? payload.pendingInvitations : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Team records are unavailable.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !token) return;
    setInviting(true);
    setMessage("");
    setManualCode("");
    try {
      const response = await fetch(`${API}/api/v1/partner/team/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 502) throw new Error(payload.error || `Invitation request failed with HTTP ${response.status}`);
      setMessage(payload.message || (payload.deliveryStatus === "FAILED" ? "Invitation was saved, but delivery failed." : "Invitation saved."));
      if (payload.deliveryStatus !== "DELIVERED" && payload.invitationToken) setManualCode(payload.invitationToken);
      setInviteEmail("");
      await loadTeam();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invitation could not be created.");
    } finally {
      setInviting(false);
    }
  };

  const copyManualCode = async () => {
    try {
      await navigator.clipboard.writeText(manualCode);
      setMessage("Manual invitation code copied. Share it only through a secure channel.");
    } catch {
      setMessage("The code could not be copied automatically. Select and copy it manually.");
    }
  };

  return (
    <div className="min-h-screen w-full space-y-6 bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-white sm:p-6">
      <header className="border-b border-slate-200 pb-4 dark:border-slate-800"><h1 className="text-2xl font-extrabold">Team management and roles</h1><p className="mt-1 text-sm text-slate-500">Tenant members and persisted invitation records. Delivery status reflects the configured provider response.</p></header>

      {message && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{message}</p>}
      {manualCode && <section className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200"><h2 className="text-sm font-bold">Manual invitation code</h2><p className="mt-1 text-xs">Automatic delivery was not confirmed. Role assignment remains pending registration and administrator review.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-white p-2 text-xs dark:bg-slate-950">{manualCode}</code><button onClick={copyManualCode} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white">Copy securely</button></div></section>}

      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><input type="email" placeholder="employee@partner.com" aria-label="Team member email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} className="min-w-[220px] flex-1 rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" /><select aria-label="Team member role" value={inviteRole} onChange={(event) => setInviteRole(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="PARTNER_ADMIN">Partner Admin</option><option value="PARTNER_MANAGER">Partner Manager</option><option value="PARTNER_MEMBER">Partner Member</option></select><button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">{inviting ? "Saving…" : "Create invitation"}</button></section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-4 font-bold text-amber-700 dark:text-amber-400">Team members ({team.length})</h2>{loading ? <p className="text-sm text-slate-500">Loading team records…</p> : team.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">No tenant team members are recorded.</p> : <div className="space-y-2">{team.map((member) => <article key={member.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950"><div className="min-w-0"><p className="truncate text-sm font-bold">{member.email}</p><p className="text-xs text-slate-500">Role: {member.roles?.[0]?.role?.name || "No assigned role"}</p></div><span className={`rounded-md px-2 py-1 text-[10px] font-bold ${member.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{member.isActive ? "ACTIVE" : "SUSPENDED"}</span></article>)}</div>}</section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-4 font-bold text-amber-700 dark:text-amber-400">Pending invitations ({pendingInvitations.length})</h2>{loading ? <p className="text-sm text-slate-500">Loading invitation records…</p> : pendingInvitations.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">No unexpired tenant invitation records are available.</p> : <div className="space-y-2">{pendingInvitations.map((invitation) => <article key={invitation.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold">{invitation.email}</p><p className="mt-1 text-xs text-slate-500">Role requested: {invitation.role || "Not recorded"} · Expires {new Date(invitation.expiresAt).toLocaleString()}</p></div><span className="rounded-md bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{invitation.deliveryStatus}</span></div></article>)}</div>}</section>
      </div>
    </div>
  );
}
