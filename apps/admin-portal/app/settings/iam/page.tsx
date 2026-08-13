"use client";

import React, { useState, useEffect } from "react";

interface OAuthProvider {
  id: string;
  provider: string;
  isEnabled: boolean;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  callbackUrl: string;
  scopes: string[];
}

interface SecurityPolicy {
  maxFailedLoginAttempts: number;
  lockoutDurationMinutes: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecialChar: boolean;
  passwordHistoryLimit: number;
  passwordMaxAgeDays: number;
  sessionIdleTimeoutMinutes: number;
  sessionAbsoluteTimeoutHours: number;
  otpLength: number;
  otpExpiryMinutes: number;
}

export default function AdminIamSettingsPage() {
  const [activeTab, setActiveTab] = useState<"PROVIDERS" | "POLICY">("PROVIDERS");
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [policy, setPolicy] = useState<SecurityPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [editingProvider, setEditingProvider] = useState<OAuthProvider | null>(null);

  const getApiUrl = (path: string) => `http://localhost:4000${path}`;

  const fetchIamData = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("saas_admin_token");
      const headers = { Authorization: `Bearer ${token}` };

      const [provRes, polRes] = await Promise.all([
        fetch(getApiUrl("/api/v1/iam/admin/providers"), { headers }),
        fetch(getApiUrl("/api/v1/iam/admin/policy"), { headers }),
      ]);

      const provData = await provRes.json();
      const polData = await polRes.json();

      if (provData.providers) setProviders(provData.providers);
      if (polData.policy) setPolicy(polData.policy);
    } catch (err) {
      setError("Failed to load IAM configuration data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIamData();
  }, []);

  const handleSaveProvider = async (p: OAuthProvider) => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const token = localStorage.getItem("saas_admin_token");
      const res = await fetch(getApiUrl("/api/v1/iam/admin/providers"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(p),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(`OAuth Provider ${p.provider} updated successfully!`);
        setEditingProvider(null);
        fetchIamData();
      } else {
        setError(data.error || "Failed to update provider.");
      }
    } catch (err) {
      setError("Network error updating provider.");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!policy) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const token = localStorage.getItem("saas_admin_token");
      const res = await fetch(getApiUrl("/api/v1/iam/admin/policy"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(policy),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("IAM Security Policy saved successfully!");
      } else {
        setError(data.error || "Failed to save policy.");
      }
    } catch (err) {
      setError("Network error saving policy.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-[#FDFBF7] min-h-screen">
      <div className="flex justify-between items-center border-b pb-5 border-slate-200">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">
            IAM & Authentication Administration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure OAuth Providers, Password Policies, Session Timeouts & MFA Security Settings
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("PROVIDERS")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "PROVIDERS"
                ? "bg-[#1A1A1A] text-white shadow-md"
                : "bg-white border text-slate-700 hover:bg-slate-50"
            }`}
          >
            🔑 OAuth Providers
          </button>
          <button
            onClick={() => setActiveTab("POLICY")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "POLICY"
                ? "bg-[#1A1A1A] text-white shadow-md"
                : "bg-white border text-slate-700 hover:bg-slate-50"
            }`}
          >
            🛡️ Security Policy
          </button>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold rounded-2xl">
          ✅ {message}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-2xl">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-3xl border border-slate-200">
          Loading IAM Governance configuration...
        </div>
      ) : activeTab === "PROVIDERS" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((p) => (
              <div
                key={p.provider}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-lg text-slate-900">
                      {p.provider}
                    </span>
                    <span
                      className={`px-3 py-1 text-xs font-bold rounded-full ${
                        p.isEnabled
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}
                    >
                      {p.isEnabled ? "ENABLED" : "DISABLED"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Client ID:{" "}
                    <span className="font-mono text-slate-700">
                      {p.clientId || "Not configured"}
                    </span>
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <button
                    onClick={() =>
                      handleSaveProvider({ ...p, isEnabled: !p.isEnabled })
                    }
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                      p.isEnabled
                        ? "border-red-200 text-red-600 hover:bg-red-50"
                        : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                    }`}
                  >
                    {p.isEnabled ? "Disable" : "Enable"}
                  </button>

                  <button
                    onClick={() => setEditingProvider(p)}
                    className="px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-black transition-all"
                  >
                    Configure →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {editingProvider && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white max-w-lg w-full p-8 rounded-3xl shadow-2xl border border-slate-200 space-y-6">
                <h3 className="text-xl font-bold text-slate-900">
                  Configure OAuth Provider: {editingProvider.provider}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Client ID
                    </label>
                    <input
                      type="text"
                      value={editingProvider.clientId}
                      onChange={(e) =>
                        setEditingProvider({
                          ...editingProvider,
                          clientId: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-xl text-sm font-mono focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Client Secret
                    </label>
                    <input
                      type="password"
                      value={editingProvider.clientSecret}
                      onChange={(e) =>
                        setEditingProvider({
                          ...editingProvider,
                          clientSecret: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-xl text-sm font-mono focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Redirect URI
                    </label>
                    <input
                      type="text"
                      value={editingProvider.redirectUri}
                      onChange={(e) =>
                        setEditingProvider({
                          ...editingProvider,
                          redirectUri: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-xl text-sm font-mono focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => setEditingProvider(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveProvider(editingProvider)}
                    disabled={saving}
                    className="px-5 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-black disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Settings"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        policy && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-900 border-b pb-4">
              Enterprise Security & Password Policy Settings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Minimum Password Length
                </label>
                <input
                  type="number"
                  value={policy.passwordMinLength}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      passwordMinLength: parseInt(e.target.value) || 8,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-xl text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Max Failed Login Attempts (Lockout)
                </label>
                <input
                  type="number"
                  value={policy.maxFailedLoginAttempts}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      maxFailedLoginAttempts: parseInt(e.target.value) || 5,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-xl text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lockout Duration (Minutes)
                </label>
                <input
                  type="number"
                  value={policy.lockoutDurationMinutes}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      lockoutDurationMinutes: parseInt(e.target.value) || 30,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-xl text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password History Limit (Prevent Reuse)
                </label>
                <input
                  type="number"
                  value={policy.passwordHistoryLimit}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      passwordHistoryLimit: parseInt(e.target.value) || 5,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-xl text-sm font-bold"
                />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <h3 className="text-sm font-bold text-slate-900">
                Password Character Complexity Rules
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={policy.passwordRequireUppercase}
                    onChange={(e) =>
                      setPolicy({
                        ...policy,
                        passwordRequireUppercase: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
                  />
                  Require Uppercase (A-Z)
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={policy.passwordRequireNumbers}
                    onChange={(e) =>
                      setPolicy({
                        ...policy,
                        passwordRequireNumbers: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
                  />
                  Require Numbers (0-9)
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={policy.passwordRequireSpecialChar}
                    onChange={(e) =>
                      setPolicy({
                        ...policy,
                        passwordRequireSpecialChar: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
                  />
                  Require Special Chars (!@#$)
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={handleSavePolicy}
                disabled={saving}
                className="px-6 py-3 bg-slate-900 hover:bg-black text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
              >
                {saving ? "Saving Policy..." : "Save Security Policy"}
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
