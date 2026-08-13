"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";

export default function CrmPage() {
  const { token } = useAuth();
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Opp
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [value, setValue] = useState("");
  const [stageId, setStageId] = useState("");

  const fetchPipelines = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/v1/admin/crm/pipelines`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPipelines(data.pipelines || []);
        if (data.pipelines?.[0]?.stages?.[0]) {
          setStageId(data.pipelines[0].stages[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines();
  }, [token]);

  const handleCreateOpp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !stageId) return;
    try {
      const res = await fetch(`${API}/api/v1/admin/crm/opportunities`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, companyName, value, stageId }),
      });
      if (res.ok) {
        alert("Opportunity created!");
        setTitle("");
        setCompanyName("");
        setValue("");
        fetchPipelines();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const defaultPipeline = pipelines[0];

  return (
    <div className="w-full space-y-6 pt-14 md:pt-0 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-950 p-6 rounded-3xl text-white shadow-xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">CRM & Sales Pipelines</h1>
          <p className="mt-1 text-sm text-gray-400">
            Lead tracking, deal opportunities, stage kanban boards, and customer activity logs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kanban Board */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">{defaultPipeline?.name || "Sales Pipeline"}</h2>

          {loading ? (
            <div className="py-8 text-center text-gray-400">Loading pipeline...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {defaultPipeline?.stages?.map((stage: any) => (
                <div key={stage.id} className="p-3 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                  <div className="flex justify-between items-center font-bold text-xs text-gray-800 border-b pb-2">
                    <span>{stage.name}</span>
                    <span className="bg-gray-200 px-2 py-0.5 rounded-full text-[10px] text-gray-700">{stage.opportunities?.length || 0}</span>
                  </div>
                  <div className="space-y-2">
                    {stage.opportunities?.map((opp: any) => (
                      <div key={opp.id} className="p-3 rounded-xl bg-white border border-gray-200 shadow-2xs space-y-1">
                        <p className="font-bold text-xs text-gray-900">{opp.title}</p>
                        <p className="text-[10px] text-gray-500">{opp.companyName || "Lead"}</p>
                        <p className="text-xs font-black text-[#D4AF37]">${opp.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Opportunity Form */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Add Sales Opportunity</h2>
          <form onSubmit={handleCreateOpp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Deal Title</label>
              <input
                type="text"
                placeholder="e.g. Enterprise License Deal"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Company Name</label>
              <input
                type="text"
                placeholder="e.g. Acme Corp"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Deal Value ($)</label>
              <input
                type="number"
                placeholder="12000"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Target Stage</label>
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1"
              >
                {defaultPipeline?.stages?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-[#D4AF37] text-gray-950 font-bold py-2.5 rounded-xl text-sm hover:bg-amber-400"
            >
              Add Deal Opportunity
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
