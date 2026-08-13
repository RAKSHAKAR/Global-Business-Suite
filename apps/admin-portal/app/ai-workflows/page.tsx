"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";

export default function AIWorkflowsPage() {
  const { token } = useAuth();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("EVENT_DRIVEN");
  const [agentKey, setAgentKey] = useState("REVIEW_AGENT");
  const [creating, setCreating] = useState(false);
  const [triggering, setTriggering] = useState<string | null>(null);

  const fetchWorkflows = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/ai-workflows`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [token]);

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch(`${API}/api/v1/ai-workflows`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description,
          triggerType,
          steps: [{ type: "EXECUTE_AGENT", agentKey, prompt: "Automated trigger execution" }],
        }),
      });
      if (res.ok) {
        setName("");
        setDescription("");
        fetchWorkflows();
      }
    } catch (e) {
      alert("Failed to create workflow");
    } finally {
      setCreating(false);
    }
  };

  const handleTrigger = async (id: string) => {
    setTriggering(id);
    try {
      const res = await fetch(`${API}/api/v1/ai-workflows/${id}/trigger`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      alert(`Workflow Output:\n\n${data.result}`);
      fetchWorkflows();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setTriggering(null);
    }
  };

  return (
    <div className="w-full space-y-6 pt-14 md:pt-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">AI Automation Workflows</h1>
        <p className="mt-1 text-sm text-gray-500">Configure event-driven and scheduled AI tasks for automated replies, emails, social posts, and notifications</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow Creation Form */}
        <form onSubmit={handleCreateWorkflow} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">Build AI Workflow</h2>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Workflow Name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Auto Review Reply Pipeline"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe trigger condition"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Trigger Type</label>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm bg-white focus:border-purple-500 focus:outline-none"
            >
              <option value="EVENT_DRIVEN">Event Driven (e.g. review:created, lead:captured)</option>
              <option value="SCHEDULED">Scheduled Cron (Daily / Weekly)</option>
              <option value="MANUAL">Manual Trigger</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Target AI Agent</label>
            <select
              value={agentKey}
              onChange={(e) => setAgentKey(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm bg-white focus:border-purple-500 focus:outline-none"
            >
              <option value="REVIEW_AGENT">Review Management Agent</option>
              <option value="CRM_AGENT">CRM Lead Agent</option>
              <option value="MARKETING_AGENT">Marketing Agent</option>
              <option value="GBP_AGENT">GBP Agent</option>
              <option value="SOCIAL_AGENT">Social Media Agent</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {creating ? "Saving..." : "+ Create AI Workflow"}
          </button>
        </form>

        {/* Workflows List */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="h-64 bg-white rounded-2xl border border-gray-200 animate-pulse flex items-center justify-center text-gray-400">
              Loading AI Workflows...
            </div>
          ) : workflows.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 text-gray-500">
              No AI Workflows created yet. Build your first workflow on the left.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workflows.map((wf) => (
                <div key={wf.id} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900 text-base">{wf.name}</h3>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${wf.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {wf.isActive ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{wf.description || "Automated background workflow"}</p>
                    <div className="mt-3 text-xs font-mono text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 space-y-0.5">
                      <div>Trigger: {wf.triggerType}</div>
                      <div>Runs Total: {wf.runCount}</div>
                      <div>Last Run: {wf.lastRunAt ? new Date(wf.lastRunAt).toLocaleString() : "Never"}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleTrigger(wf.id)}
                    disabled={triggering === wf.id}
                    className="w-full py-2 bg-gray-900 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
                  >
                    {triggering === wf.id ? "Executing Pipeline..." : "⚡ Run Workflow Now"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
