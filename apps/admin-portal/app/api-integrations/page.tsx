"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";

export default function ApiIntegrationsPage() {
  const { token } = useAuth();
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [keyName, setKeyName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [generatedRawKey, setGeneratedRawKey] = useState<string | null>(null);

  const fetchData = async () => {
    if (!token) return;
    try {
      const [kRes, wRes] = await Promise.all([
        fetch(`${API}/api/v1/admin/integrations/api-keys`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/v1/admin/integrations/webhooks`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (kRes.ok) setApiKeys((await kRes.json()).apiKeys || []);
      if (wRes.ok) setWebhooks((await wRes.json()).webhooks || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName) return;
    try {
      const res = await fetch(`${API}/api/v1/admin/integrations/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: keyName, rateLimit: 1000 }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedRawKey(data.rawKey);
        setKeyName("");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl) return;
    try {
      const res = await fetch(`${API}/api/v1/admin/integrations/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUrl, events: ["*"] }),
      });
      if (res.ok) {
        alert("Webhook subscription created!");
        setTargetUrl("");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full space-y-6 pt-14 md:pt-0 pb-12">
      <div className="bg-gray-950 p-6 rounded-3xl text-white shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-black text-white">API Keys & Webhooks Gateway</h1>
        <p className="mt-1 text-sm text-gray-400">
          Manage developer API keys, rate limit tiers, event webhooks, and third-party integrations.
        </p>
      </div>

      {generatedRawKey && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-[#D4AF37] text-gray-900 space-y-2">
          <p className="font-bold text-sm text-amber-900">⚠️ Save your new API Key now. It will not be shown again!</p>

          <code className="block bg-white p-3 rounded-xl border border-amber-300 font-mono text-xs select-all text-amber-950 font-bold">
            {generatedRawKey}
          </code>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Keys */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Active API Keys ({apiKeys.length})</h2>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {apiKeys.map((k) => (
              <div key={k.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-gray-900">{k.name}</p>
                  <code className="text-gray-500">{k.prefix}...</code>
                </div>
                <span className="font-semibold text-blue-600">{k.rateLimit} req/hr</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleCreateApiKey} className="flex gap-2">
            <input
              type="text"
              placeholder="API Key Identifier Name"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="flex-1 border rounded-xl px-3 py-2 text-xs"
              required
            />
            <button type="submit" className="bg-gray-900 text-white font-bold px-4 py-2 rounded-xl text-xs">
              Generate Key
            </button>
          </form>
        </div>

        {/* Webhooks */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Webhook Subscriptions ({webhooks.length})</h2>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {webhooks.map((w) => (
              <div key={w.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-between text-xs">
                <div className="truncate pr-2">
                  <p className="font-bold text-gray-900 truncate">{w.targetUrl}</p>
                  <span className="text-gray-500">Secret: {w.secret.substring(0, 10)}...</span>
                </div>
                <span className="text-green-600 font-bold">● Active</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleCreateWebhook} className="flex gap-2">
            <input
              type="url"
              placeholder="https://your-domain.com/webhook"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="flex-1 border rounded-xl px-3 py-2 text-xs"
              required
            />
            <button type="submit" className="bg-[#D4AF37] text-gray-950 font-bold px-4 py-2 rounded-xl text-xs">
              Subscribe
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
