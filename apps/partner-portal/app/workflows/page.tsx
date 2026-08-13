"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function WorkflowsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<{ automationRules: any[]; approvalRequests: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(`${API}/api/v1/partner/workflows`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || `Workflow request failed with HTTP ${response.status}`);
        return payload;
      })
      .then((payload) => {
        if (!cancelled) setData({
          automationRules: Array.isArray(payload.automationRules) ? payload.automationRules : [],
          approvalRequests: Array.isArray(payload.approvalRequests) ? payload.approvalRequests : [],
        });
      })
      .catch((requestError) => { if (!cancelled) setError(requestError.message || "Workflow data is unavailable."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="min-h-screen w-full space-y-6 bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-white sm:p-6">
      <header className="border-b border-slate-200 pb-4 dark:border-slate-800"><h1 className="text-2xl font-extrabold">Workflows, automations, and approvals</h1><p className="mt-1 text-sm text-slate-500">Persisted tenant rules and currently pending approval requests.</p></header>
      {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</p>}
      {loading ? <p className="text-sm text-slate-500">Loading workflow records…</p> : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><h2 className="font-bold text-amber-700 dark:text-amber-400">Automation rules</h2><span className="text-xs text-slate-500">{data?.automationRules.length || 0} record(s)</span></div>{!data?.automationRules.length ? <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">No automation rules are configured for this tenant.</div> : <div className="space-y-2">{data.automationRules.map((rule) => <article key={rule.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold">{rule.name}</h3><p className="mt-1 text-xs text-slate-500">Trigger: {rule.triggerType} · Action: {rule.actionType}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${rule.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{rule.isActive ? "ACTIVE" : "INACTIVE"}</span></div>{rule.description && <p className="mt-2 text-xs text-slate-500">{rule.description}</p>}<p className="mt-2 text-[11px] text-slate-500">Recorded runs: {rule.runCount} · Last run: {rule.lastRunAt ? new Date(rule.lastRunAt).toLocaleString() : "Never"}</p></article>)}</div>}</section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><h2 className="font-bold text-amber-700 dark:text-amber-400">Pending approval requests</h2><span className="text-xs text-slate-500">{data?.approvalRequests.length || 0} record(s)</span></div>{!data?.approvalRequests.length ? <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">No pending approval requests are recorded for this tenant.</div> : <div className="space-y-2">{data.approvalRequests.map((request) => { const isSocialPost = String(request.resourceType).toLowerCase() === "socialpost"; return <article key={request.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h3 className="text-sm font-bold">{request.workflow?.name || request.resourceType}</h3><p className="mt-1 text-xs text-slate-500">{request.resourceType} · Step {request.currentStep} · Requested {new Date(request.createdAt).toLocaleString()}</p><p className="mt-1 font-mono text-[10px] text-slate-500">Resource: {request.resourceId}</p></div>{isSocialPost ? <Link href="/social" className="whitespace-nowrap rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950">Review in Social</Link> : <span title="No tenant-safe partner action endpoint exists for this resource type" className="text-xs text-slate-500">Review action unavailable</span>}</div></article>; })}</div>}</section>
        </div>
      )}
    </div>
  );
}
