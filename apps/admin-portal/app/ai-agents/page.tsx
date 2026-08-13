"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";

export default function AIAgentsPage() {
  const { token } = useAuth();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [testPrompt, setTestPrompt] = useState("");
  const [testResult, setTestResult] = useState<any | null>(null);
  const [executing, setExecuting] = useState(false);

  const fetchAgents = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/ai-agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
        if (data.length > 0) setSelectedAgent(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [token]);

  const handleExecuteAgent = async () => {
    if (!selectedAgent || !testPrompt) return;
    setExecuting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API}/api/v1/ai-agents/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentKey: selectedAgent.key,
          userPrompt: testPrompt,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e: any) {
      setTestResult({ error: e.message });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="w-full space-y-6 pt-14 md:pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">AI Agents Control Center</h1>
          <p className="mt-1 text-sm text-gray-500">Configure and test the 16 GBS specialized enterprise domain agents</p>
        </div>
      </div>

      {loading ? (
        <div className="h-64 bg-white rounded-2xl border border-gray-200 animate-pulse flex items-center justify-center text-gray-400">
          Loading AI Agents catalog...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agent Selection List */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2 max-h-[700px] overflow-y-auto">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-2 py-1">Enterprise Agents ({agents.length})</h2>
            {agents.map((ag) => (
              <button
                key={ag.key}
                onClick={() => {
                  setSelectedAgent(ag);
                  setTestResult(null);
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1 ${
                  selectedAgent?.key === ag.key
                    ? "bg-purple-50 border-purple-300 shadow-sm"
                    : "bg-gray-50/50 border-gray-100 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-gray-900">{ag.name}</span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                    {ag.type}
                  </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{ag.description || ag.key}</p>
              </button>
            ))}
          </div>

          {/* Selected Agent Playground */}
          {selectedAgent && (
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedAgent.name}</h2>
                  <p className="text-xs font-mono text-gray-400">{selectedAgent.key}</p>
                </div>
                <span className="text-xs font-bold px-3 py-1 bg-green-100 text-green-700 rounded-full">ACTIVE</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">System Prompt</label>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs text-gray-800 font-mono max-h-36 overflow-y-auto">
                  {selectedAgent.systemPrompt || "Default Enterprise Agent System Prompt"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Agent Test Bench</label>
                <textarea
                  rows={3}
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  placeholder={`Send a request to ${selectedAgent.name}...`}
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-purple-500 focus:outline-none"
                />
                <button
                  onClick={handleExecuteAgent}
                  disabled={executing || !testPrompt}
                  className="mt-2 px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {executing ? "Running Agent..." : "Execute Agent"}
                </button>
              </div>

              {testResult && (
                <div className="mt-4 border-t pt-4 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Agent Output Response</h3>
                  {testResult.error ? (
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs">{testResult.error}</div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl text-sm text-gray-900 whitespace-pre-wrap">
                        {testResult.content}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs font-mono text-gray-500">
                        <span>Tokens: {testResult.totalTokens}</span>
                        <span>Latency: {testResult.latencyMs}ms</span>
                        <span>Cost: ${testResult.estimatedCost}</span>
                        <span>Failover: {testResult.isFailoverUsed ? "Yes" : "No"}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
