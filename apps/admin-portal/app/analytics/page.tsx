"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const DASHBOARDS = [
  { key: "EXECUTIVE", label: "Executive" },
  { key: "SYSTEM", label: "System" },
  { key: "ADMIN", label: "Admin" },
  { key: "PARTNER", label: "Partner" },
  { key: "CUSTOMER", label: "Customer" },
  { key: "FINANCE", label: "Finance" },
  { key: "CRM", label: "CRM" },
  { key: "AI", label: "AI usage" },
  { key: "GBP", label: "Google Business" },
  { key: "SOCIAL", label: "Social" },
  { key: "MARKETING", label: "Marketing" },
  { key: "SUPPORT", label: "Support" },
  { key: "SECURITY", label: "Security" },
];

const REPORT_CATEGORIES = ["USERS", "SUBSCRIPTIONS", "REVENUE", "LEADS", "REVIEWS", "SOCIAL", "SUPPORT", "AI", "AUDIT"];

type ViewMode = "DASHBOARD" | "REPORTS" | "PREDICTIVE" | "CUSTOM_SQL" | "BI_INTEGRATION";
type Notice = { tone: "success" | "error" | "info"; text: string } | null;

async function readJson(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed with HTTP ${response.status}`);
  return payload;
}

function downloadPayload(fileName: string, mimeType: string, payload: string) {
  const url = URL.createObjectURL(new Blob([payload], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function EnterpriseAnalyticsPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("EXECUTIVE");
  const [viewMode, setViewMode] = useState<ViewMode>("DASHBOARD");
  const [dashboard, setDashboard] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [forecastMessage, setForecastMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [reportTitle, setReportTitle] = useState("");
  const [reportCategory, setReportCategory] = useState("REVENUE");

  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setNotice(null);
    try {
      const payload = await readJson(await fetch(`${API}/api/v1/analytics-engine/dashboards/${activeTab}`, {
        headers: authHeaders(),
      }));
      setDashboard(payload.dashboard);
    } catch (error) {
      setDashboard(null);
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Dashboard data is unavailable." });
    } finally {
      setLoading(false);
    }
  }, [activeTab, authHeaders, token]);

  const loadReports = useCallback(async () => {
    if (!token) return;
    try {
      const payload = await readJson(await fetch(`${API}/api/v1/analytics-engine/reports`, { headers: authHeaders() }));
      setReports(Array.isArray(payload.reports) ? payload.reports : []);
    } catch (error) {
      setReports([]);
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Reports are unavailable." });
    }
  }, [authHeaders, token]);

  const loadIntegrations = useCallback(async () => {
    if (!token) return;
    try {
      const payload = await readJson(await fetch(`${API}/api/v1/analytics-engine/bi-integrations`, { headers: authHeaders() }));
      setIntegrations(Array.isArray(payload.integrations) ? payload.integrations : []);
    } catch (error) {
      setIntegrations([]);
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "BI integrations are unavailable." });
    }
  }, [authHeaders, token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!token) return;
    loadReports();
    loadIntegrations();
  }, [loadIntegrations, loadReports, token]);

  const loadForecast = async () => {
    setForecast(null);
    setForecastMessage("");
    try {
      const payload = await readJson(await fetch(`${API}/api/v1/analytics-engine/predictive/forecast`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ modelType: "REVENUE_ARR" }),
      }));
      setForecast(payload.forecast);
    } catch (error) {
      setForecastMessage(error instanceof Error ? error.message : "No persisted forecast is available.");
    }
  };

  const createReport = async () => {
    if (!reportTitle.trim()) {
      setNotice({ tone: "error", text: "Enter a report title." });
      return;
    }
    try {
      await readJson(await fetch(`${API}/api/v1/analytics-engine/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ title: reportTitle.trim(), category: reportCategory, reportType: "TABLE" }),
      }));
      setReportTitle("");
      setNotice({ tone: "success", text: "Report definition saved. It will export persisted tenant records only." });
      await loadReports();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Report creation failed." });
    }
  };

  const exportReport = async (reportId: string, format: "CSV" | "JSON") => {
    try {
      const payload = await readJson(await fetch(`${API}/api/v1/analytics-engine/reports/${reportId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ format }),
      }));
      const exported = payload.exportResult;
      downloadPayload(exported.fileName, exported.mimeType, exported.payload);
      setNotice({ tone: "success", text: `${format} export downloaded with ${exported.rowCount} persisted row(s).` });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Export failed." });
    }
  };

  const syncIntegration = async (integrationId: string) => {
    try {
      const payload = await readJson(await fetch(`${API}/api/v1/analytics-engine/bi-integrations/${integrationId}/sync`, {
        method: "POST",
        headers: authHeaders(),
      }));
      setNotice({ tone: "success", text: `Provider confirmed ${payload.result.recordsProcessed} synchronized record(s).` });
      await loadIntegrations();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "BI synchronization failed." });
    }
  };

  const selectView = (mode: ViewMode) => {
    setViewMode(mode);
    setNotice(null);
    if (mode === "PREDICTIVE" && !forecast && !forecastMessage) loadForecast();
  };

  return (
    <div className="w-full space-y-5 pb-12 pt-14 text-slate-900 dark:text-slate-100 md:pt-0">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-white shadow-xl sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-950">Analytics control center</span>
            <h1 className="mt-3 text-2xl font-black sm:text-3xl">Enterprise analytics and tenant reporting</h1>
            <p className="mt-1 text-sm text-slate-400">All displayed values come from persisted records. Unconfigured forecasts, delivery providers, and warehouse syncs are reported as unavailable.</p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Analytics views">
            {([
              ["DASHBOARD", "Dashboards"],
              ["REPORTS", "Reports"],
              ["PREDICTIVE", "Forecasts"],
              ["CUSTOM_SQL", "Custom SQL"],
              ["BI_INTEGRATION", "BI integrations"],
            ] as Array<[ViewMode, string]>).map(([mode, label]) => (
              <button key={mode} onClick={() => selectView(mode)} className={`rounded-xl px-4 py-2 text-xs font-bold transition ${viewMode === mode ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-200 hover:bg-slate-700"}`}>
                {label}
              </button>
            ))}
            <button disabled title="Configure ANALYTICS_REPORT_DELIVERY_WEBHOOK_URL to enable report delivery" className="cursor-not-allowed rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-500">
              Delivery not configured
            </button>
          </div>
        </div>
      </section>

      {notice && (
        <div role="status" className={`rounded-2xl border px-4 py-3 text-sm ${notice.tone === "error" ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" : notice.tone === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-blue-300 bg-blue-50 text-blue-800"}`}>
          {notice.text}
        </div>
      )}

      {viewMode === "DASHBOARD" && (
        <section className="space-y-5">
          <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-3 dark:border-slate-800">
            {DASHBOARDS.map((item) => (
              <button key={item.key} onClick={() => setActiveTab(item.key)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold ${activeTab === item.key ? "bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950" : "border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>
                {item.label}
              </button>
            ))}
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">Loading persisted metrics…</p>
          ) : dashboard ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {dashboard.kpis?.map((kpi: any) => (
                  <article key={kpi.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{kpi.name}</p>
                    <p className="mt-2 text-2xl font-black">{kpi.unit === "USD" ? `$${Number(kpi.value).toLocaleString()}` : `${kpi.value}${kpi.unit ? ` ${kpi.unit}` : ""}`}</p>
                    <p className="mt-2 text-xs text-slate-500">{kpi.changePercent === null ? "Historical comparison unavailable" : `${kpi.changePercent >= 0 ? "+" : ""}${kpi.changePercent}% vs prior period`}</p>
                  </article>
                ))}
              </div>
              <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-black">Data observations</h2>
                    <span className="text-xs text-slate-500">Updated {new Date(dashboard.lastRefreshedAt).toLocaleString()}</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {dashboard.aiStrategicInsights?.map((insight: string) => <p key={insight} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-950">{insight}</p>)}
                  </div>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="font-black">Data coverage</h2>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-3"><dt>Users</dt><dd className="font-bold">{dashboard.summaryMetrics?.totalUsers ?? 0}</dd></div>
                    <div className="flex justify-between gap-3"><dt>Invoices</dt><dd className="font-bold">{dashboard.summaryMetrics?.totalInvoices ?? 0}</dd></div>
                    <div className="flex justify-between gap-3"><dt>Social posts</dt><dd className="font-bold">{dashboard.summaryMetrics?.totalSocialPosts ?? 0}</dd></div>
                    <div className="flex justify-between gap-3"><dt>Audit entries</dt><dd className="font-bold">{dashboard.summaryMetrics?.auditLogCount ?? 0}</dd></div>
                  </dl>
                  <p className="mt-4 text-xs text-slate-500">SLA and uptime are not shown because no monitoring provider is connected to this data set.</p>
                </article>
              </div>
            </>
          ) : <p className="text-sm text-slate-500">No dashboard data is available.</p>}
        </section>
      )}

      {viewMode === "REPORTS" && (
        <section className="space-y-5">
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[1fr_220px_auto] md:items-end">
            <label className="text-sm font-bold">Report title<input value={reportTitle} onChange={(event) => setReportTitle(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 font-normal dark:border-slate-700" placeholder="Monthly revenue records" /></label>
            <label className="text-sm font-bold">Data category<select value={reportCategory} onChange={(event) => setReportCategory(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal dark:border-slate-700 dark:bg-slate-950">{REPORT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
            <button onClick={createReport} className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950">Save report</button>
          </div>
          {reports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">No report definitions exist for this tenant.</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {reports.map((report) => (
                <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-4"><div><h2 className="font-black">{report.title}</h2><p className="mt-1 text-xs text-slate-500">{report.category} · {report.reportType}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold dark:bg-slate-800">{report.isSystemReport ? "SYSTEM" : "TENANT"}</span></div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => exportReport(report.id, "CSV")} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white dark:bg-slate-700">Download CSV</button>
                    <button onClick={() => exportReport(report.id, "JSON")} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold dark:border-slate-700">Download JSON</button>
                    <button disabled title="PDF export is not implemented" className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-400 dark:border-slate-800">PDF unavailable</button>
                    <button disabled title="XLSX export is not implemented" className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-400 dark:border-slate-800">XLSX unavailable</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {viewMode === "PREDICTIVE" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-black">Persisted predictive snapshots</h2><p className="mt-1 text-sm text-slate-500">Forecasts appear only after a model pipeline stores a snapshot.</p></div><button onClick={loadForecast} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold dark:border-slate-700">Refresh</button></div>
          {forecastMessage && <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{forecastMessage}</p>}
          {forecast && <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{forecast.forecastData?.map((item: any, index: number) => <div key={`${item.date}-${index}`} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950"><p className="text-xs text-slate-500">{item.date}</p><p className="mt-1 text-xl font-black">{item.predictedValue}</p></div>)}</div>}
        </section>
      )}

      {viewMode === "CUSTOM_SQL" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-black">Custom SQL is disabled</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">Direct SQL cannot safely guarantee tenant isolation with the current report schema. Use a category-backed report above. The API returns HTTP 501 instead of sample rows.</p>
          <button disabled className="mt-5 cursor-not-allowed rounded-xl bg-slate-200 px-4 py-2 text-sm font-bold text-slate-500 dark:bg-slate-800">Execution unavailable</button>
        </section>
      )}

      {viewMode === "BI_INTEGRATION" && (
        <section className="space-y-5">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200"><p className="font-bold">Authenticated OData-shaped count feed</p><code className="mt-1 block break-all text-xs">{API}/api/v1/analytics-engine/bi-integrations/odata/feed</code></div>
          {integrations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700"><h2 className="font-black">No BI integrations configured</h2><p className="mt-2 text-sm text-slate-500">No default connectors are shown. Create a persisted connector through the API, then configure BI_SYNC_WEBHOOK_URL before synchronization.</p></div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{integrations.map((integration) => <article key={integration.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex justify-between gap-3"><span className="rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-bold text-white">{integration.platformType}</span><span className="text-xs font-bold">{integration.status}</span></div><h2 className="mt-3 font-black">{integration.name}</h2><dl className="mt-3 space-y-1 text-xs text-slate-500"><div className="flex justify-between"><dt>Frequency</dt><dd>{integration.syncFrequency}</dd></div><div className="flex justify-between"><dt>Exported records</dt><dd>{integration.recordsExported}</dd></div><div className="flex justify-between"><dt>Last sync</dt><dd>{integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString() : "Never"}</dd></div></dl><button onClick={() => syncIntegration(integration.id)} className="mt-4 w-full rounded-xl bg-slate-900 py-2 text-xs font-bold text-white dark:bg-slate-700">Request provider sync</button></article>)}</div>
          )}
        </section>
      )}
    </div>
  );
}
