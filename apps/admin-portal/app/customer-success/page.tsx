"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";

export default function CustomerSuccessPage() {
  const { token } = useAuth();
  const [healthScores, setHealthScores] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!token) return;
    try {
      const [resHealth, resPlans] = await Promise.all([
        fetch(`${API}/api/v1/crm/customer-success/health`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/v1/crm/customer-success/plans`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (resHealth.ok) {
        const data = await resHealth.json();
        setHealthScores(data.healthScores || []);
      }
      if (resPlans.ok) {
        const data = await resPlans.json();
        setPlans(data.plans || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleRecalculateHealth = async () => {
    try {
      const res = await fetch(`${API}/api/v1/crm/customer-success/health/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ npsScore: 9.0, csatScore: 4.8, usageScore: 90, supportScore: 95 }),
      });
      if (res.ok) {
        alert("Health score and AI churn risk updated!");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full space-y-6 pt-14 md:pt-0 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-950 p-6 rounded-3xl text-white shadow-xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Customer Success & Health Scores</h1>
          <p className="mt-1 text-sm text-gray-400">
            Account onboarding plans, health matrix, NPS/CSAT feedback, and AI churn risk predictions.
          </p>
        </div>
        <button
          onClick={handleRecalculateHealth}
          className="bg-[#D4AF37] text-gray-950 font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-amber-400 self-start sm:self-auto"
        >
          Recalculate Health Scores
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Health Matrix */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Account Health Scores Matrix</h2>

          {loading ? (
            <div className="py-8 text-center text-gray-400">Loading health scores...</div>
          ) : (
            <div className="space-y-3">
              {healthScores.map((h) => (
                <div key={h.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-gray-900">Account Health Index</span>
                    <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                      h.scoreCategory === "HEALTHY" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}>
                      {h.overallScore}/100 - {h.scoreCategory}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center text-[11px]">
                    <div>
                      <p className="text-gray-400">NPS Rating</p>
                      <p className="font-bold text-gray-800">{h.npsScore || 9.0}/10</p>
                    </div>
                    <div>
                      <p className="text-gray-400">CSAT Score</p>
                      <p className="font-bold text-gray-800">{h.csatScore || 4.8}/5.0</p>
                    </div>
                    <div>
                      <p className="text-gray-400">AI Churn Risk</p>
                      <p className="font-bold text-emerald-600">{h.aiChurnRiskScore || 4.5}%</p>
                    </div>
                  </div>
                  {h.aiChurnReason && (
                    <p className="text-xs text-gray-500 italic bg-white p-2.5 rounded-xl border">
                      🤖 AI Insight: {h.aiChurnReason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Onboarding & Goal Plans */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Onboarding & Success Plans</h2>

          {loading ? (
            <div className="py-8 text-center text-gray-400">Loading plans...</div>
          ) : plans.length === 0 ? (
            <div className="py-8 text-center text-gray-400">No active onboarding plans.</div>
          ) : (
            <div className="space-y-3">
              {plans.map((p) => {
                const milestones = p.milestonesJson ? JSON.parse(p.milestonesJson) : [];
                return (
                  <div key={p.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-gray-900">{p.title}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                        {p.status}
                      </span>
                    </div>
                    <div className="space-y-1 pt-2">
                      <p className="text-xs font-semibold text-gray-700">Milestone Progress:</p>
                      {milestones.map((m: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                          <span className={m.completed ? "text-emerald-500 font-bold" : "text-gray-400"}>
                            {m.completed ? "✓" : "○"}
                          </span>
                          <span>{m.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
