"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { ChartBarIcon, ArrowDownTrayIcon, TrophyIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../AuthContext";
import { apiRequest } from "@/lib/api";

export default function ReportsPage() {
  const { token } = useAuth();
  const [scorecard, setScorecard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    apiRequest<any>("/api/v1/analytics-engine/scorecards/CUSTOMER", token)
      .then((d) => {
        if (d.success) setScorecard(d.scorecard);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  const handleDownloadReport = () => {
    if (!scorecard) return;
    const rows = Object.entries(scorecard).map(([metric, value]) => [
      metric,
      typeof value === "object" ? JSON.stringify(value) : String(value ?? ""),
    ]);
    const csv = [["Metric", "Value"], ...rows]
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "customer-scorecard.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900 p-6 rounded-3xl text-white shadow-xl">
          <div>
            <span className="bg-indigo-500 text-white font-extrabold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
              Customer Self-Service BI
            </span>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2 mt-2">
              <ChartBarIcon className="w-7 h-7 text-indigo-400" /> Customer Executive Scorecard & Reports
            </h1>
            <p className="text-sm text-gray-400">View orders, appointments, active services, loyalty tier, and download official statement reports.</p>
          </div>
          <div className="flex gap-2">
            <button
              disabled
              title="PDF export is not configured"
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs flex items-center gap-1 opacity-50 cursor-not-allowed"
            >
              <ArrowDownTrayIcon className="w-4 h-4" /> Download PDF Report
            </button>
            <button
              onClick={handleDownloadReport}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl font-bold text-xs flex items-center gap-1"
            >
              Export CSV
            </button>
          </div>
        </div>

        {scorecard && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase">
                <span>Loyalty Tier</span>
                <TrophyIcon className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-600">{scorecard.loyaltyTier}</p>
              <p className="text-xs text-gray-500">{scorecard.loyaltyPoints} Points Earned</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase">
                <span>Completed Orders</span>
                <ShieldCheckIcon className="w-5 h-5 text-indigo-500" />
              </div>
              <p className="text-2xl font-black text-gray-900">{scorecard.totalOrdersCount}</p>
              <p className="text-xs text-green-600 font-semibold">100% On-Time Delivery</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
              <span className="text-xs font-bold text-gray-400 uppercase">Completed Appointments</span>
              <p className="text-2xl font-black text-indigo-600">{scorecard.completedAppointmentsCount}</p>
              <p className="text-xs text-indigo-600 font-semibold">Active Service Schedule</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
              <span className="text-xs font-bold text-gray-400 uppercase">Satisfaction Rating</span>
              <p className="text-2xl font-black text-emerald-600">{scorecard.satisfactionScore}</p>
              <p className="text-xs text-emerald-600 font-semibold">Grade: {scorecard.scorecardGrade}</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
