"use client";

import React, { useState, useEffect } from "react";

interface AuditLogItem {
  id: string;
  tenantId?: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("saas_admin_token");
      const query = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(actionFilter ? { action: actionFilter } : {}),
      });
      const res = await fetch(
        `http://localhost:4000/api/v1/audit-logs?${query}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (data.data) {
        setLogs(data.data);
        if (data.pagination) {
          setTotalPages(data.pagination.pages || 1);
        }
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const handleExportCsv = () => {
    window.open("http://localhost:4000/api/v1/audit-logs/export", "_blank");
  };

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Centralized Audit Logs
            </h1>
            <p className="text-sm text-gray-400">
              Real-time audit log viewer capturing all security events, logins,
              role changes, and API transactions across all applications.
            </p>
          </div>
          <button
            onClick={handleExportCsv}
            className="bg-[#D4AF37] hover:bg-[#b5942f] text-gray-950 font-bold px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 cursor-pointer"
          >
            📥 Export CSV Spreadsheet
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-4 bg-gray-900 border border-gray-800 p-4 rounded-xl">
          <input
            type="text"
            placeholder="Filter by Action (e.g. USER_LOGIN)..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm w-72 focus:outline-none focus:border-[#D4AF37]"
          />
        </div>

        {/* Audit Log Data Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-gray-950 text-xs uppercase text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Resource</th>
                  <th className="px-6 py-3">User ID</th>
                  <th className="px-6 py-3">Tenant ID</th>
                  <th className="px-6 py-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      Loading audit log events...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      No audit log records found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono text-xs text-gray-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-900/50 text-blue-300 border border-blue-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-white">
                        {log.resource}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-400">
                        {log.userId || "System"}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-400">
                        {log.tenantId || "Global"}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-400">
                        {log.ipAddress || "::1"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-between items-center px-6 py-4 bg-gray-950 border-t border-gray-800">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs font-bold text-gray-400 hover:text-white disabled:opacity-40"
            >
              ← Previous
            </button>
            <span className="text-xs text-gray-500 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="text-xs font-bold text-gray-400 hover:text-white disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
