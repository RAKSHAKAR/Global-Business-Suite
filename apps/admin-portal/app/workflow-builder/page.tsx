"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";

export default function WorkflowBuilderPage() {
  const { token } = useAuth();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("REVIEW_CREATED");
  const [actionType, setActionType] = useState("REPLY_REVIEW_AI");

  const fetchRules = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/v1/automation/rules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [token]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      const res = await fetch(`${API}/api/v1/automation/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, triggerType, actionType }),
      });
      if (res.ok) {
        alert("Automation workflow created!");
        setName("");
        fetchRules();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full space-y-6 pt-14 md:pt-0 pb-12">
      <div className="bg-gray-950 p-6 rounded-3xl text-white shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-black text-white">Automation & Workflow Builder</h1>
        <p className="mt-1 text-sm text-gray-400">
          Configure event triggers, automated AI actions, notification dispatches, and background cron workflows.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Rules List */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Active Automation Rules ({rules.length})</h2>

          {loading ? (
            <div className="py-6 text-center text-gray-400">Loading automation workflows...</div>
          ) : rules.length === 0 ? (
            <div className="py-6 text-center text-gray-500">No automation rules created yet.</div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className="p-4 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{rule.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">{rule.triggerType}</span>
                      <span>→</span>
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">{rule.actionType}</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-green-600">● Active ({rule.runCount || 0} runs)</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Rule Form */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Create Workflow</h2>
          <form onSubmit={handleCreateRule} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Workflow Name</label>
              <input
                type="text"
                placeholder="e.g. Auto Review Reply via Gemini AI"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Event Trigger</label>
              <select
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1"
              >
                <option value="REVIEW_CREATED">REVIEW_CREATED (Google/Social Review)</option>
                <option value="REVIEW_RATING_LOW">REVIEW_RATING_LOW (1-2 Stars)</option>
                <option value="NEW_LEAD">NEW_LEAD (Form Submit)</option>
                <option value="SCORE_DROP">SCORE_DROP (Reputation)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Automated Action</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1"
              >
                <option value="REPLY_REVIEW_AI">REPLY_REVIEW_AI (Generate AI Reply)</option>
                <option value="POST_TO_SOCIAL">POST_TO_SOCIAL (Cross-post Social Media)</option>
                <option value="SEND_EMAIL">SEND_EMAIL (Send Notification)</option>
                <option value="CREATE_TICKET">CREATE_TICKET (Support Ticket)</option>
                <option value="WEBHOOK">WEBHOOK (HTTP Post Dispatch)</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-[#D4AF37] text-gray-950 font-bold py-2.5 rounded-xl text-sm hover:bg-amber-400"
            >
              Deploy Automation Rule
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
