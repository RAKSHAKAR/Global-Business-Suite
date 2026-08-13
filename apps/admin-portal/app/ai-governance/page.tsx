"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";

export default function AIGovernancePage() {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);

    Promise.all([
      fetch(`${API}/api/v1/ai-platform/analytics`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API}/api/v1/ai-platform/governance`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([analyticsData, governanceData]) => {
        setAnalytics(analyticsData);
        setPolicies(Array.isArray(governanceData) ? governanceData : []);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="w-full space-y-6 pt-14 md:pt-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">AI Governance, Safety & Cost Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">Monitor token consumption, latency benchmarks, cost breakdown, PII data masking rules, and budget caps</p>
      </div>

      {loading ? (
        <div className="h-64 bg-white rounded-2xl border border-gray-200 animate-pulse flex items-center justify-center text-gray-400">
          Loading AI Analytics & Safety Governance...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Requests</span>
              <p className="text-2xl font-black text-gray-900 mt-1">{analytics?.totalRequests || 0}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Tokens</span>
              <p className="text-2xl font-black text-purple-700 mt-1">{analytics?.totalTokens ? (analytics.totalTokens / 1000).toFixed(1) + "k" : "0"}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Estimated Cost</span>
              <p className="text-2xl font-black text-green-700 mt-1">${analytics?.totalCostUSD || "0.00"}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Avg Latency</span>
              <p className="text-2xl font-black text-blue-700 mt-1">{analytics?.avgLatencyMs || 0}ms</p>
            </div>
          </div>

          {/* Provider & Model Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">Provider Usage & Cost Breakdown</h2>
              {analytics?.providerBreakdown?.length === 0 ? (
                <p className="text-xs text-gray-400 py-4">No provider logs recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {analytics?.providerBreakdown?.map((p: any) => (
                    <div key={p.providerKey} className="flex justify-between items-center text-xs p-3 bg-gray-50 rounded-xl border border-gray-100 font-mono">
                      <span className="font-bold text-gray-900 uppercase">{p.providerKey}</span>
                      <div className="flex gap-4">
                        <span className="text-gray-500">{p.count} calls</span>
                        <span className="font-bold text-green-700">${p.cost}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">Model Usage Breakdown</h2>
              {analytics?.modelBreakdown?.length === 0 ? (
                <p className="text-xs text-gray-400 py-4">No model logs recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {analytics?.modelBreakdown?.map((m: any) => (
                    <div key={m.modelKey} className="flex justify-between items-center text-xs p-3 bg-gray-50 rounded-xl border border-gray-100 font-mono">
                      <span className="font-bold text-gray-900">{m.modelKey}</span>
                      <div className="flex gap-4">
                        <span className="text-gray-500">{m.count} calls</span>
                        <span className="font-bold text-green-700">${m.cost}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active Governance Policies */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">Active Governance & PII Safety Policies</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl space-y-1">
                <span className="font-bold text-purple-900 uppercase">PII Sensitive Data Masker</span>
                <p className="text-purple-700">Masks SSN, Credit Cards, Emails, and Phone Numbers before sending prompts to external LLMs.</p>
                <span className="inline-block mt-2 font-mono text-[10px] bg-purple-200 text-purple-900 px-2 py-0.5 rounded">STATUS: ACTIVE</span>
              </div>
              <div className="p-4 bg-green-50/60 border border-green-200 rounded-xl space-y-1">
                <span className="font-bold text-green-900 uppercase">Rate Limiter & Token Quota Cap</span>
                <p className="text-green-700">Enforces monthly tenant token limits and prevents API spam & unexpected cost overruns.</p>
                <span className="inline-block mt-2 font-mono text-[10px] bg-green-200 text-green-900 px-2 py-0.5 rounded">STATUS: ACTIVE</span>
              </div>
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1">
                <span className="font-bold text-blue-900 uppercase">Failover Router Monitor</span>
                <p className="text-blue-700">Monitors provider health and automatically routes requests to backup providers upon failure.</p>
                <span className="inline-block mt-2 font-mono text-[10px] bg-blue-200 text-blue-900 px-2 py-0.5 rounded">STATUS: ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
