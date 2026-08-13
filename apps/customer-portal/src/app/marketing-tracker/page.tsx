"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowPathIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import DashboardLayout from "@/components/DashboardLayout";
import { EmptyState, ErrorState, LoadingState } from "@/components/AsyncState";
import { useAuth } from "../AuthContext";
import { apiRequest } from "@/lib/api";
import { formatDate } from "@/lib/format";

type GoogleDashboard = { isConnected: boolean; marketingScore: number; performance: { trend: { date: string; views: number; reviews: number; leads: number }[]; totals: { views: number; reviews: number; leads: number } }; growthActions: { total: number; completed: number; pending: string[] }; sync: { accounts: number; locations: number; lastSyncedAt: string | null } };
type Campaign = { id: string; name: string; channel: string; status: string; scheduledAt: string | null; sentAt: string | null; createdAt: string };

export default function MarketingTrackerPage() {
  const { token } = useAuth();
  const [google, setGoogle] = useState<GoogleDashboard | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return; setLoading(true); setError("");
    try {
      const [googleData, campaignsData] = await Promise.all([
        apiRequest<GoogleDashboard>("/api/v1/google/dashboard", token),
        apiRequest<{ campaigns: Campaign[] }>("/api/v1/crm/marketing/campaigns", token),
      ]);
      setGoogle(googleData); setCampaigns(campaignsData.campaigns || []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Marketing data is unavailable."); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const maxViews = Math.max(...(google?.performance.trend || []).map((day) => day.views), 1);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><ChartBarIcon className="h-7 w-7 text-blue-600" /> Marketing tracker</h1><p className="mt-1 text-sm text-gray-500">Synchronized Google performance and tenant campaign activity without estimated metrics.</p></div><button onClick={() => void load()} className="inline-flex self-start items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700"><ArrowPathIcon className="h-4 w-4" /> Refresh</button></header>
        {loading ? <LoadingState label="Loading marketing activity..." /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loading && !error && google ? <>
          {google.isConnected ? <><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Readiness score" value={`${google.marketingScore}/100`} detail={`${google.growthActions.completed} of ${google.growthActions.total} evidence checks completed`} /><Metric label="Profile views" value={google.performance.totals.views.toLocaleString()} detail="Synchronized 30-day total" /><Metric label="Customer actions" value={google.performance.totals.leads.toLocaleString()} detail="Calls, web, directions, bookings, orders" /><Metric label="Review activity" value={google.performance.totals.reviews.toLocaleString()} detail={`Last sync ${formatDate(google.sync.lastSyncedAt)}`} /></section>
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-gray-900">Profile views trend</h2>{google.performance.trend.length ? <div className="mt-5 flex h-52 items-end gap-1" role="img" aria-label="Daily synchronized Google Business profile views">{google.performance.trend.map((day) => <div key={day.date} title={`${day.date}: ${day.views} views`} className="min-w-1 flex-1 rounded-t bg-blue-500" style={{ height: `${Math.max(3, day.views / maxViews * 100)}%` }} />)}</div> : <div className="mt-4"><EmptyState title="No synchronized insight history" description="Google is connected, but no performance records have been synchronized for this period." /></div>}</section></> : <EmptyState title="Connect Google Business" description="The tracker cannot calculate Google performance until a Business Profile is connected and synchronized." action={<Link href="/gbp" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Open Google setup</Link>} />}

          {google.growthActions.pending.length ? <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-gray-900">Evidence-based next actions</h2><ul className="mt-3 space-y-2">{google.growthActions.pending.map((action) => <li key={action} className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">{action}</li>)}</ul></section> : null}

          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm"><div className="border-b border-gray-200 px-5 py-4"><h2 className="font-bold text-gray-900">Stored campaigns</h2><p className="mt-1 text-xs text-gray-500">Campaign status comes directly from the tenant database.</p></div>{campaigns.length ? <div className="divide-y divide-gray-100">{campaigns.map((campaign) => <article key={campaign.id} className="flex flex-col justify-between gap-2 p-5 sm:flex-row sm:items-center"><div><p className="font-semibold text-gray-900">{campaign.name}</p><p className="text-sm text-gray-500">{campaign.channel} · created {formatDate(campaign.createdAt)}</p></div><span className="self-start rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">{campaign.status}</span></article>)}</div> : <div className="p-5"><EmptyState title="No campaigns" description="No marketing campaign records exist for this tenant." /></div>}</section>
        </> : null}
      </div>
    </DashboardLayout>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-gray-500">{label}</p><p className="mt-2 text-3xl font-bold text-gray-900">{value}</p><p className="mt-1 text-xs text-gray-500">{detail}</p></article>; }
