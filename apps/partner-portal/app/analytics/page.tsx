"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const asCsvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function download(fileName: string, mimeType: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function PartnerAnalyticsPage() {
  const { token } = useAuth();
  const [scorecard, setScorecard] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"SCORECARD" | "PARTNER_BI" | "PREDICTIVE">("SCORECARD");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setMessage("");
      try {
        const [scorecardResponse, dashboardResponse] = await Promise.all([
          fetch(`${API}/api/v1/analytics-engine/scorecards/PARTNER`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/api/v1/analytics-engine/dashboards/PARTNER`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const [scorecardPayload, dashboardPayload] = await Promise.all([
          scorecardResponse.json().catch(() => ({})),
          dashboardResponse.json().catch(() => ({})),
        ]);
        if (!scorecardResponse.ok) throw new Error(scorecardPayload.error || "Partner scorecard is unavailable.");
        if (!dashboardResponse.ok) throw new Error(dashboardPayload.error || "Partner analytics are unavailable.");
        if (!cancelled) {
          setScorecard(scorecardPayload.scorecard);
          setDashboard(dashboardPayload.dashboard);
        }
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Partner analytics are unavailable.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [token]);

  const loadForecast = async () => {
    setForecast(null);
    setMessage("");
    try {
      const response = await fetch(`${API}/api/v1/analytics-engine/predictive/forecast`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ modelType: "MARKETING_ROI" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No persisted forecast is available.");
      setForecast(payload.forecast);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No persisted forecast is available.");
    }
  };

  const exportAnalytics = (format: "CSV" | "JSON") => {
    const exportedAt = new Date().toISOString();
    const payload = { exportedAt, scorecard, dashboard };
    if (format === "JSON") {
      download("partner-analytics.json", "application/json", JSON.stringify(payload, null, 2));
    } else {
      const rows = (dashboard?.kpis || []).map((kpi: any) => [kpi.key, kpi.name, kpi.value, kpi.unit || "", kpi.changePercent ?? ""]);
      const csv = [["key", "name", "value", "unit", "changePercent"], ...rows].map((row) => row.map(asCsvCell).join(",")).join("\n");
      download("partner-analytics.csv", "text/csv;charset=utf-8", csv);
    }
    setMessage(`${format} downloaded from the currently displayed persisted analytics.`);
  };

  const chooseTab = (tab: "SCORECARD" | "PARTNER_BI" | "PREDICTIVE") => {
    setActiveTab(tab);
    setMessage("");
    if (tab === "PREDICTIVE" && !forecast) loadForecast();
  };

  return (
    <div className="w-full space-y-6 pb-12 pt-14 text-slate-900 dark:text-slate-100 md:pt-0">
      <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div><span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-950">Partner analytics</span><h1 className="mt-3 text-2xl font-black sm:text-3xl">Operations and business intelligence</h1><p className="mt-1 text-sm text-slate-400">Tenant-scoped counts, revenue records, reviews, leads, and publishing activity.</p></div>
          <div className="flex flex-wrap gap-2"><button onClick={() => exportAnalytics("CSV")} disabled={!dashboard} className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-40">Download CSV</button><button onClick={() => exportAnalytics("JSON")} disabled={!dashboard} className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold disabled:opacity-40">Download JSON</button><button disabled title="PDF export and scheduled delivery are not configured" className="cursor-not-allowed rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-500">PDF / delivery unavailable</button></div>
        </div>
      </header>

      {message && <div role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{message}</div>}

      <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800" aria-label="Partner analytics views">
        {([['SCORECARD', 'Scorecard'], ['PARTNER_BI', 'Operations'], ['PREDICTIVE', 'Forecasts']] as const).map(([tab, label]) => <button key={tab} onClick={() => chooseTab(tab)} className={`rounded-xl px-4 py-2 text-xs font-bold ${activeTab === tab ? "bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950" : "border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>{label}</button>)}
      </nav>

      {loading && <p className="text-sm text-slate-500">Loading persisted partner metrics…</p>}

      {!loading && activeTab === "SCORECARD" && scorecard && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Managed clients", scorecard.managedClients, `${scorecard.activeClients} active`],
            ["Leads in last 30 days", scorecard.monthlyLeadsGenerated, "From persisted CRM leads"],
            ["Average review rating", scorecard.googleBusinessRating ?? "No data", `${scorecard.recordedReviews} recorded reviews`],
            ["Active campaigns", scorecard.activeCampaigns, "From persisted campaigns"],
          ].map(([label, value, detail]) => <article key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p><p className="mt-2 text-xs text-slate-500">{detail}</p></article>)}
        </section>
      )}

      {!loading && activeTab === "PARTNER_BI" && dashboard && (
        <section className="space-y-5"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">{dashboard.kpis?.map((kpi: any) => <article key={kpi.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-bold uppercase text-slate-500">{kpi.name}</p><p className="mt-2 text-2xl font-black">{kpi.value}{kpi.unit ? ` ${kpi.unit}` : ""}</p><p className="mt-2 text-xs text-slate-500">{kpi.changePercent === null ? "No comparison period" : `${kpi.changePercent}% vs prior period`}</p></article>)}</div><article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="font-black">Data observations</h2><div className="mt-3 space-y-2">{dashboard.aiStrategicInsights?.map((insight: string) => <p key={insight} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-950">{insight}</p>)}</div></article></section>
      )}

      {!loading && activeTab === "PREDICTIVE" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><div><h2 className="text-xl font-black">Persisted marketing forecast</h2><p className="mt-1 text-sm text-slate-500">Shown only when a model pipeline has stored a tenant snapshot.</p></div><button onClick={loadForecast} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold dark:border-slate-700">Refresh</button></div>{forecast && <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-6">{forecast.forecastData?.map((item: any, index: number) => <div key={`${item.date}-${index}`} className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-950"><p className="text-xs text-slate-500">{item.date}</p><p className="mt-1 font-black">{item.predictedValue}</p></div>)}</div>}</section>
      )}
    </div>
  );
}
