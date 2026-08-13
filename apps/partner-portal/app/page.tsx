"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface WidgetItem {
  id: string;
  visible: boolean;
  order: number;
}

interface DashboardMetrics {
  tenantId: string;
  tenant: { name: string; isActive: boolean; createdAt: string };
  totalCustomers: number;
  activeCustomers: number;
  totalSocialPosts: number;
  publishedSocialPosts: number;
  aiContentsCount: number;
  locationsCount: number;
  connectedPlatformCount: number;
  connectedPlatforms: string[];
  avgRating: number | null;
  reviewsCount: number;
  pendingTasks: number;
  campaignsCount: number;
  openTicketsCount: number;
  paidRevenueLast30DaysUSD: number;
  paidRevenuePrevious30DaysUSD: number;
  revenueGrowthPercent: number | null;
  subscription: null | {
    status: string;
    billingCycle: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    autoRenew: boolean;
    plan: { name: string; price: number; currency: string; interval: string; maxAiUsage: number };
  };
  activityTrend: Array<{ date: string; publishedPosts: number; newLeads: number }>;
  generatedAt: string;
  dataSource: "DATABASE";
}

const defaultWidgets: WidgetItem[] = [
  { id: "business_overview", visible: true, order: 1 },
  { id: "gbp_overview", visible: true, order: 2 },
  { id: "social_overview", visible: true, order: 3 },
  { id: "reviews_widget", visible: true, order: 4 },
  { id: "ai_usage", visible: true, order: 5 },
  { id: "leads_widget", visible: true, order: 6 },
  { id: "customers_widget", visible: true, order: 7 },
  { id: "tasks_widget", visible: true, order: 8 },
  { id: "calendar_widget", visible: true, order: 9 },
  { id: "revenue_widget", visible: true, order: 10 },
  { id: "subscription_widget", visible: true, order: 11 },
  { id: "notifications_widget", visible: true, order: 12 },
  { id: "campaigns_widget", visible: true, order: 13 },
  { id: "metrics_widget", visible: true, order: 14 },
  { id: "reports_widget", visible: true, order: 15 },
  { id: "pending_approvals", visible: true, order: 16 },
];

const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function MetricCard({ label, value, detail, icon }: { label: string; value: string; detail: React.ReactNode; icon: string }) {
  return (
    <article className="flex min-h-36 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</span><span aria-hidden="true" className="text-lg">{icon}</span></div>
      <div className="mt-3"><p className="text-2xl font-black text-slate-950 dark:text-white">{value}</p><div className="mt-1 text-xs font-semibold text-slate-500">{detail}</div></div>
    </article>
  );
}

export default function Dashboard() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [message, setMessage] = useState("");
  const [layoutModalOpen, setLayoutModalOpen] = useState(false);
  const [widgets, setWidgets] = useState<WidgetItem[]>(defaultWidgets);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const loadDashboard = async () => {
      setLoading(true);
      setMessage("");
      try {
        const [metricsResponse, layoutResponse] = await Promise.all([
          fetch(`${API}/api/v1/partner/dashboard-metrics`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/api/v1/partner/dashboard-layout`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const [metricsPayload, layoutPayload] = await Promise.all([
          metricsResponse.json().catch(() => ({})),
          layoutResponse.json().catch(() => ({})),
        ]);
        if (!metricsResponse.ok) throw new Error(metricsPayload.error || `Dashboard request failed with HTTP ${metricsResponse.status}`);
        if (!layoutResponse.ok) throw new Error(layoutPayload.error || `Layout request failed with HTTP ${layoutResponse.status}`);
        if (cancelled) return;
        setMetrics(metricsPayload as DashboardMetrics);
        if (layoutPayload.layoutJson) {
          try {
            const parsed = JSON.parse(layoutPayload.layoutJson);
            if (Array.isArray(parsed) && parsed.length > 0) setWidgets(parsed);
          } catch {
            setMessage("The saved widget layout is invalid; the standard layout is being used.");
          }
        }
      } catch (error) {
        if (!cancelled) {
          setMetrics(null);
          setMessage(error instanceof Error ? error.message : "Partner dashboard data is unavailable.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadDashboard();
    return () => { cancelled = true; };
  }, [token]);

  const handleSaveLayout = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API}/api/v1/partner/dashboard-layout`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ layoutJson: JSON.stringify(widgets) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Layout save failed with HTTP ${response.status}`);
      setLayoutModalOpen(false);
      setMessage("Dashboard layout saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Dashboard layout could not be saved.");
    }
  };

  const exportCSV = () => {
    if (!metrics) return;
    const rows = [
      ["Metric", "Value"],
      ["Tenant", metrics.tenant.name],
      ["Tenant active", metrics.tenant.isActive],
      ["Paid revenue last 30 days USD", metrics.paidRevenueLast30DaysUSD],
      ["Paid revenue previous 30 days USD", metrics.paidRevenuePrevious30DaysUSD],
      ["Revenue change percent", metrics.revenueGrowthPercent],
      ["Active customers", metrics.activeCustomers],
      ["Total customers", metrics.totalCustomers],
      ["Published social posts", metrics.publishedSocialPosts],
      ["Total social posts", metrics.totalSocialPosts],
      ["Connected social platforms", metrics.connectedPlatformCount],
      ["AI content records", metrics.aiContentsCount],
      ["Average review rating", metrics.avgRating],
      ["Recorded reviews", metrics.reviewsCount],
      ["Pending tasks", metrics.pendingTasks],
      ["Open support tickets", metrics.openTicketsCount],
    ];
    const contents = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `partner-dashboard-${metrics.generatedAt.slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage("CSV downloaded from the currently displayed tenant records.");
  };

  const isVisible = (id: string) => widgets.find((item) => item.id === id)?.visible ?? true;
  const revenueDetail = metrics && metrics.revenueGrowthPercent !== null
    ? `${metrics.revenueGrowthPercent >= 0 ? "+" : ""}${metrics.revenueGrowthPercent}% vs previous 30 days`
    : "Prior-period comparison unavailable";

  return (
    <div className="min-h-screen w-full space-y-6 bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-white sm:p-6 lg:space-y-8">
      <header className="flex flex-col items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-center">
        <div><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-extrabold sm:text-3xl">Partner Enterprise Workspace</h1><span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Tenant data</span></div><p className="mt-1 text-sm text-slate-500">Authenticated business, publishing, CRM, billing, and activity records.</p></div>
        <div className="flex flex-wrap gap-3"><button onClick={() => setLayoutModalOpen(true)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">Customize layout</button><button onClick={exportCSV} disabled={!metrics} className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40">Export CSV</button></div>
      </header>

      {message && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{message}</p>}

      {loading ? <div className="grid animate-pulse grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-36 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />)}</div> : !metrics ? <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700">Authenticated tenant dashboard metrics are unavailable.</div> : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {isVisible("business_overview") && <MetricCard label="Business overview" value={metrics.tenant.name} icon="🏢" detail={<>Status: <span className={metrics.tenant.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>{metrics.tenant.isActive ? "Active" : "Inactive"}</span></>} />}
          {isVisible("gbp_overview") && <MetricCard label="Google Business" value={`${metrics.locationsCount} locations`} icon="🏪" detail={<Link href="/business-profile" className="text-amber-700 underline dark:text-amber-400">Open connected locations</Link>} />}
          {isVisible("social_overview") && <MetricCard label="Social publishing" value={`${metrics.publishedSocialPosts} published`} icon="📣" detail={`${metrics.connectedPlatformCount} active connected platform(s)`} />}
          {isVisible("reviews_widget") && <MetricCard label="Reviews" value={metrics.avgRating === null ? "No rating data" : `${metrics.avgRating} / 5`} icon="⭐" detail={`${metrics.reviewsCount} persisted review(s)`} />}
          {isVisible("revenue_widget") && <MetricCard label="Paid revenue · 30 days" value={`$${metrics.paidRevenueLast30DaysUSD.toLocaleString()}`} icon="💰" detail={revenueDetail} />}
          {isVisible("customers_widget") && <MetricCard label="Customers" value={`${metrics.activeCustomers} active`} icon="🤝" detail={`${metrics.totalCustomers} total customer record(s)`} />}
          {isVisible("ai_usage") && <MetricCard label="AI content records" value={`${metrics.aiContentsCount}`} icon="✦" detail={metrics.subscription ? `Plan AI limit: ${metrics.subscription.plan.maxAiUsage < 0 ? "No numeric cap" : metrics.subscription.plan.maxAiUsage.toLocaleString()}` : "Plan limit unavailable"} />}
          {isVisible("tasks_widget") && <MetricCard label="Pending tasks" value={`${metrics.pendingTasks}`} icon="📋" detail={`${metrics.openTicketsCount} open support ticket(s)`} />}

          {isVisible("subscription_widget") && <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:col-span-2"><h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Subscription and plan</h2>{metrics.subscription ? <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-lg font-bold">{metrics.subscription.plan.name}</p><p className="mt-1 text-xs text-slate-500">{metrics.subscription.status} · {metrics.subscription.autoRenew ? "Auto-renew enabled" : "Auto-renew disabled"} · Current period ends {new Date(metrics.subscription.currentPeriodEnd).toLocaleDateString()}</p></div><Link href="/subscription" className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">Manage subscription →</Link></div> : <div className="mt-3 flex items-center justify-between gap-4"><p className="text-sm text-slate-500">No subscription record is available for this tenant.</p><Link href="/subscription" className="text-xs font-bold text-amber-700 underline dark:text-amber-400">View plans</Link></div>}</article>}

          {isVisible("metrics_widget") && <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:col-span-2 lg:col-span-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-bold">Recorded seven-day activity</h2><p className="text-xs text-slate-500">Published social posts and newly created CRM leads</p></div><span className="text-xs text-slate-500">Updated {new Date(metrics.generatedAt).toLocaleString()}</span></div><div className="mt-4 h-64 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={metrics.activityTrend}><CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.25} /><XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} stroke="#64748b" /><Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#fff" }} /><Line type="monotone" dataKey="publishedPosts" name="Published posts" stroke="#D4AF37" strokeWidth={3} /><Line type="monotone" dataKey="newLeads" name="New leads" stroke="#22c55e" strokeWidth={3} /></LineChart></ResponsiveContainer></div></article>}
        </div>
      )}

      {layoutModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="layout-title"><div className="w-full max-w-xl space-y-4 rounded-2xl border border-slate-700 bg-slate-950 p-6 text-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-800 pb-3"><h2 id="layout-title" className="text-lg font-bold">Configure dashboard widgets</h2><button onClick={() => setLayoutModalOpen(false)} aria-label="Close layout settings" className="text-slate-400 hover:text-white">×</button></div><div className="max-h-80 space-y-2 overflow-y-auto py-2">{widgets.map((widget) => <div key={widget.id} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 p-3"><span className="text-sm font-semibold capitalize">{widget.id.replace(/_/g, " ")}</span><label className="relative inline-flex cursor-pointer items-center"><span className="sr-only">Show {widget.id.replace(/_/g, " ")}</span><input type="checkbox" checked={widget.visible} onChange={(event) => setWidgets((current) => current.map((item) => item.id === widget.id ? { ...item, visible: event.target.checked } : item))} className="peer sr-only" /><span className="h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-400 peer-checked:after:translate-x-full" /></label></div>)}</div><div className="flex justify-end gap-3 border-t border-slate-800 pt-4"><button onClick={() => setLayoutModalOpen(false)} className="rounded-xl border border-slate-700 px-5 py-2 text-sm font-bold">Cancel</button><button onClick={handleSaveLayout} className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-bold text-slate-950">Save layout</button></div></div></div>}
    </div>
  );
}
