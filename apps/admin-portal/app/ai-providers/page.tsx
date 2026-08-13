"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";
type AiModel = { modelKey: string; name: string };
type Provider = {
  id: string;
  name: string;
  providerKey: string;
  isActive: boolean;
  createdAt: string;
  models?: AiModel[];
  apiKey?: string;
};
const PROVIDER_ICONS: Record<string, string> = {
  GOOGLE: "🔵",
  OPENAI: "🟢",
  ANTHROPIC: "🟣",
  MISTRAL: "🟡",
  COHERE: "🟠",
};
const PROVIDER_OPTIONS = ["GOOGLE", "OPENAI", "ANTHROPIC", "MISTRAL", "COHERE"];

export default function AIProvidersPage() {
  const { token } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [name, setName] = useState("");
  const [providerKey, setProviderKey] = useState("GOOGLE");
  const [apiKey, setApiKey] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState({ type: "", text: "" });

  // Tenant Assignment & Quota Modal state
  const [tenantModalProvider, setTenantModalProvider] =
    useState<Provider | null>(null);
  const [tenantAssignments, setTenantAssignments] = useState<any[]>([]);
  const [tenantLoading, setTenantLoading] = useState(false);
  const [tenantSaving, setTenantSaving] = useState(false);

  const fetchProviders = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/v1/ai-providers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProviders(Array.isArray(data) ? data : (data.data ?? []));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchProviders();
  }, [token]);

  const openTenantAccess = async (provider: Provider) => {
    setTenantModalProvider(provider);
    setTenantLoading(true);
    try {
      const res = await fetch(
        `${API}/api/v1/tenant-ai/provider/${provider.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("Failed to load tenant assignments");
      const data = await res.json();
      setTenantAssignments(data.assignments || []);
    } catch (e: any) {
      alert(e.message);
      setTenantModalProvider(null);
    } finally {
      setTenantLoading(false);
    }
  };

  const saveTenantAssignments = async () => {
    if (!tenantModalProvider) return;
    setTenantSaving(true);
    try {
      const res = await fetch(
        `${API}/api/v1/tenant-ai/bulk-provider/${tenantModalProvider.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ assignments: tenantAssignments }),
        },
      );
      if (!res.ok) throw new Error("Failed to save assignments");
      setTenantModalProvider(null);
      alert("Tenant access and quotas saved successfully!");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setTenantSaving(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setName("");
    setProviderKey("GOOGLE");
    setApiKey("");
    setIsActive(true);
    setSaveErr("");
    setTestMsg({ type: "", text: "" });
    setIsOpen(true);
  };
  const openEdit = (p: Provider) => {
    setEditing(p);
    setName(p.name);
    setProviderKey(p.providerKey);
    setApiKey(p.apiKey || "");
    setIsActive(p.isActive);
    setSaveErr("");
    setTestMsg({ type: "", text: "" });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveErr("");
    try {
      const payload: any = { name, providerKey, isActive };
      if (apiKey) payload.apiKey = apiKey;
      const url = editing
        ? `${API}/api/v1/ai-providers/${editing.id}`
        : `${API}/api/v1/ai-providers`;
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setIsOpen(false);
      fetchProviders();
    } catch (e: any) {
      setSaveErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestMsg({ type: "", text: "" });
    try {
      const payload: any = { providerKey };
      if (apiKey) payload.apiKey = apiKey;
      if (editing) payload.providerId = editing.id;

      const res = await fetch(`${API}/api/v1/ai-providers/test-connection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection test failed");
      setTestMsg({ type: "success", text: data.message });
    } catch (e: any) {
      setTestMsg({ type: "error", text: e.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async (id: string) => {
    setSyncing(id);
    try {
      const res = await fetch(`${API}/api/v1/ai-providers/${id}/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      alert(data.message);
      fetchProviders();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this AI provider?")) return;
    try {
      await fetch(`${API}/api/v1/ai-providers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchProviders();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="w-full space-y-5 pt-14 md:pt-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            AI Engines
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure language model providers and API keys
          </p>
        </div>
        <button
          onClick={openCreate}
          className="shrink-0 bg-gray-900 hover:bg-gray-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          + Add Provider
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-40 bg-white rounded-2xl border border-gray-200 animate-pulse"
            />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border-2 border-dashed border-gray-200 bg-white">
          <p className="text-4xl mb-3">🤖</p>
          <p className="text-gray-500 font-medium">
            No AI providers configured yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {providers.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">
                    {PROVIDER_ICONS[p.providerKey] ?? "🤖"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.providerKey}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    {p.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-2 max-h-24 overflow-y-auto">
                <p className="text-xs text-gray-500 mb-0.5 flex justify-between">
                  <span>Models Synced</span>
                  <span className="font-bold">{p.models?.length || 0}</span>
                </p>
                <p className="text-sm font-mono text-gray-800">
                  {p.models?.length
                    ? p.models.map((m) => m.name).join(", ")
                    : "Click sync to fetch models"}
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSync(p.id)}
                    disabled={syncing === p.id}
                    className="flex-1 py-2 text-xs font-semibold text-blue-600 border border-blue-200
                               hover:bg-blue-50 rounded-xl uppercase tracking-wider transition-colors disabled:opacity-50"
                  >
                    {syncing === p.id ? "Syncing..." : "Sync"}
                  </button>
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 py-2 text-xs font-semibold text-[#D4AF37] border border-[#D4AF37]/30
                               hover:bg-amber-50 rounded-xl uppercase tracking-wider transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="flex-1 py-2 text-xs font-semibold text-red-400 border border-red-200
                               hover:bg-red-50 rounded-xl uppercase tracking-wider transition-colors"
                  >
                    Remove
                  </button>
                </div>
                <button
                  onClick={() => openTenantAccess(p)}
                  className="w-full py-2 text-xs font-semibold text-purple-700 border border-purple-200
                             hover:bg-purple-50 rounded-xl uppercase tracking-wider transition-colors flex items-center justify-center gap-1"
                >
                  <span>⚙️ Assign Tenants & Limits</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Provider Add/Edit Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b shrink-0">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? "Edit Provider" : "Add AI Provider"}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                  Display Name *
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Google Gemini Pro"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                    Provider
                  </label>
                  <select
                    value={providerKey}
                    onChange={(e) => setProviderKey(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm bg-white focus:border-[#D4AF37] focus:outline-none"
                  >
                    {PROVIDER_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                  API Key {!editing && "*"}
                </label>
                <input
                  type={apiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    editing
                      ? "Leave blank to keep existing key"
                      : "Enter your API key"
                  }
                  required={!editing}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-[#D4AF37] focus:outline-none font-mono"
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing}
                  className="px-4 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {testing ? "Testing..." : "Test Connection"}
                </button>
              </div>
              {testMsg.text && (
                <p
                  className={`text-sm rounded-xl px-3 py-2 ${testMsg.type === "success" ? "text-green-700 bg-green-50 border border-green-200" : "text-red-700 bg-red-50 border border-red-200"}`}
                >
                  {testMsg.text}
                </p>
              )}
              {saveErr && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-200">
                  {saveErr}
                </p>
              )}
            </form>
            <div className="flex justify-end gap-3 px-5 sm:px-6 py-4 border-t bg-gray-50 shrink-0">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit as any}
                disabled={saving}
                className="px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl disabled:opacity-50 hover:bg-gray-700"
              >
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Provider"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tenant Access & Quotas Modal */}
      {tenantModalProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full sm:max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Tenant Access & Quotas
                </h2>
                <p className="text-xs text-gray-500">
                  Configure access and monthly generation limits for{" "}
                  <span className="font-semibold text-purple-700">
                    {tenantModalProvider.name}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setTenantModalProvider(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {tenantLoading ? (
                <div className="p-8 text-center text-gray-400 animate-pulse">
                  Loading tenant assignments...
                </div>
              ) : tenantAssignments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No tenants found.
                </div>
              ) : (
                <div className="space-y-3">
                  {tenantAssignments.map((t, idx) => (
                    <div
                      key={t.tenantId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={t.isActive}
                          onChange={(e) => {
                            const updated = [...tenantAssignments];
                            updated[idx].isActive = e.target.checked;
                            setTenantAssignments(updated);
                          }}
                          className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {t.tenantName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {t.tenantDomain}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pl-8 sm:pl-0">
                        <div className="text-right">
                          <label className="block text-[10px] font-bold uppercase text-gray-400">
                            Monthly Limit (0 = Unlimited)
                          </label>
                          <div className="flex items-center gap-2 mt-0.5">
                            <input
                              type="number"
                              min="0"
                              value={t.quotaMonthly}
                              onChange={(e) => {
                                const updated = [...tenantAssignments];
                                updated[idx].quotaMonthly =
                                  parseInt(e.target.value) || 0;
                                setTenantAssignments(updated);
                              }}
                              className="w-24 px-2.5 py-1 text-xs border border-gray-200 rounded-lg text-gray-800 font-mono focus:border-purple-500 focus:outline-none"
                            />
                            <span className="text-xs text-gray-400">
                              used: {t.usageCurrent}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 shrink-0">
              <p className="text-xs text-gray-400">
                Unchecked tenants will not see this AI engine in their portal.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setTenantModalProvider(null)}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTenantAssignments}
                  disabled={tenantSaving}
                  className="px-6 py-2 bg-purple-700 hover:bg-purple-800 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
                >
                  {tenantSaving ? "Saving..." : "Save Tenant Assignments"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
