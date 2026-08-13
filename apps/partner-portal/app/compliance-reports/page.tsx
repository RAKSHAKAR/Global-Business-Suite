"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

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

export default function PartnerComplianceReportsPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(`${API}/api/v1/partner/compliance/audit-logs?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || `Audit request failed with HTTP ${response.status}`);
        return payload;
      })
      .then((payload) => { if (!cancelled) setLogs(Array.isArray(payload.data) ? payload.data : []); })
      .catch((error) => { if (!cancelled) setMessage(error.message || "Tenant audit data is unavailable."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const exportLogs = (format: "CSV" | "JSON") => {
    if (format === "JSON") {
      download("partner-audit-logs.json", "application/json", JSON.stringify({ exportedAt: new Date().toISOString(), data: logs }, null, 2));
    } else {
      const rows = [["id", "timestamp", "userId", "action", "resource", "resourceId", "ipAddress"], ...logs.map((log) => [log.id, log.createdAt, log.userId, log.action, log.resource, log.resourceId, log.ipAddress])];
      download("partner-audit-logs.csv", "text/csv;charset=utf-8", rows.map((row: unknown[]) => row.map(csvCell).join(",")).join("\n"));
    }
    setMessage(`${format} audit export downloaded with ${logs.length} tenant record(s).`);
  };

  return (
    <div className="w-full space-y-6 p-4 text-slate-900 dark:text-slate-100 sm:p-6">
      <header><h1 className="text-2xl font-black sm:text-3xl">Audit logs and compliance reports</h1><p className="mt-2 text-sm text-slate-500">The most recent tenant-scoped audit records persisted by the platform.</p></header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-black">Export available audit records</h2><p className="mt-1 text-sm text-slate-500">CSV and JSON are generated in your browser from the records shown below.</p>
        <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => exportLogs("CSV")} disabled={loading} className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-40">Download CSV</button><button onClick={() => exportLogs("JSON")} disabled={loading} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold disabled:opacity-40 dark:border-slate-700">Download JSON</button><button disabled title="Certified PDF generation is not implemented" className="cursor-not-allowed rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-400 dark:bg-slate-800">PDF unavailable</button><button disabled title="XLSX generation is not implemented" className="cursor-not-allowed rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-400 dark:bg-slate-800">XLSX unavailable</button></div>
      </section>

      {message && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{message}</p>}

      <section><h2 className="mb-3 text-lg font-black">Recent activity audit trail</h2>{loading ? <p className="text-sm text-slate-500">Loading tenant audit records…</p> : logs.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">No tenant audit records are available.</div> : <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800"><table className="min-w-[760px] w-full border-collapse bg-white text-left text-sm dark:bg-slate-900"><thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-950"><tr><th className="p-3">User ID</th><th className="p-3">Action</th><th className="p-3">Resource</th><th className="p-3">Resource ID</th><th className="p-3">IP address</th><th className="p-3">Timestamp</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-3 font-mono text-xs">{log.userId || "System"}</td><td className="p-3 font-bold text-amber-700 dark:text-amber-400">{log.action}</td><td className="p-3">{log.resource}</td><td className="p-3 font-mono text-xs text-slate-500">{log.resourceId || "—"}</td><td className="p-3 font-mono text-xs text-slate-500">{log.ipAddress || "Not recorded"}</td><td className="p-3 whitespace-nowrap text-slate-500">{new Date(log.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>}</section>
    </div>
  );
}
