"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function saveFile(fileName: string, mimeType: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { token } = useAuth();
  const [reportsData, setReportsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState("BUSINESS");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setMessage("");
    fetch(`${API}/api/v1/partner/reports?type=${encodeURIComponent(activeType)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || `Reports request failed with HTTP ${response.status}`);
        return payload;
      })
      .then((payload) => { if (!cancelled) setReportsData(payload); })
      .catch((error) => { if (!cancelled) { setReportsData(null); setMessage(error.message || "Reports are unavailable."); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, activeType]);

  const handleExport = (format: "CSV" | "JSON") => {
    const suites = reportsData?.suites || [];
    if (format === "JSON") {
      saveFile("partner-reports.json", "application/json", JSON.stringify(reportsData, null, 2));
    } else {
      const rows = [["id", "title", "metric", "detail"], ...suites.map((suite: any) => [suite.id, suite.title, suite.metric, suite.detail])];
      saveFile("partner-reports.csv", "text/csv;charset=utf-8", rows.map((row: unknown[]) => row.map(csvCell).join(",")).join("\n"));
    }
    setMessage(`${format} downloaded from the persisted report summary.`);
  };

  return (
    <div className="min-h-screen w-full space-y-6 p-4 text-slate-900 dark:text-slate-100 sm:p-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
        <div><h1 className="text-2xl font-extrabold">Reports and analytics</h1><p className="mt-1 text-sm text-slate-500">Tenant-backed business, revenue, CRM, Google, social, AI, review, marketing, and task summaries.</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={() => handleExport("CSV")} disabled={!reportsData} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900">Download CSV</button><button onClick={() => handleExport("JSON")} disabled={!reportsData} className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-40">Download JSON</button><button disabled title="PDF generation is not implemented" className="cursor-not-allowed rounded-xl bg-slate-200 px-3 py-2 text-xs font-bold text-slate-400 dark:bg-slate-800">PDF unavailable</button></div>
      </header>

      {message && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{message}</p>}
      {loading ? <p className="text-sm text-slate-500">Loading persisted report data…</p> : !reportsData ? <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">Report data is unavailable.</p> : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reportsData.suites?.map((suite: any) => (
            <button key={suite.id} onClick={() => setActiveType(suite.id.toUpperCase())} className={`space-y-2 rounded-2xl border p-5 text-left transition ${activeType === suite.id.toUpperCase() ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20" : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"}`}>
              <h2 className="text-sm font-bold">{suite.title}</h2><p className="text-xl font-black">{suite.metric}</p><p className="text-xs text-slate-500">{suite.detail}</p>
            </button>
          ))}
        </div>
      )}
      {reportsData && <p className="text-xs text-slate-500">Last queried {new Date(reportsData.generatedAt).toLocaleString()} · {reportsData.scheduled?.length || 0} persisted scheduled report definition(s)</p>}
    </div>
  );
}
