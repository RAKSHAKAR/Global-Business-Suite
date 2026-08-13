"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";

type Tenant = {
  id: string;
  name: string;
  domain: string | null;
  subdomain: string | null;
  isActive: boolean;
  primaryColor: string | null;
  createdAt: string;
};

export default function TenantsPage() {
  const { token } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Modal
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  // Form
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#D4AF37");
  const [isActive, setIsActive] = useState(true);

  // Tenant AI Modal state
  const [aiModalTenant, setAiModalTenant] = useState<Tenant | null>(null);
  const [tenantAiConfigs, setTenantAiConfigs] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);

  const fetchTenants = async (q = search, pg = page) => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(pg),
        limit: String(limit),
      });
      if (q) params.set("search", q);
      const res = await fetch(`${API}/api/v1/tenants?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTenants(Array.isArray(data) ? data : (data.data ?? []));
      setTotal(data?.pagination?.total ?? 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [token, page]);

  const openTenantAi = async (tenant: Tenant) => {
    setAiModalTenant(tenant);
    setAiLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/tenant-ai/${tenant.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load AI configs for tenant");
      const data = await res.json();
      setTenantAiConfigs(Array.isArray(data) ? data : []);
    } catch (e: any) {
      alert(e.message);
      setAiModalTenant(null);
    } finally {
      setAiLoading(false);
    }
  };

  const saveTenantAi = async () => {
    if (!aiModalTenant) return;
    setAiSaving(true);
    try {
      const res = await fetch(
        `${API}/api/v1/tenant-ai/bulk-tenant/${aiModalTenant.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ configs: tenantAiConfigs }),
        },
      );
      if (!res.ok) throw new Error("Failed to save AI configuration");
      setAiModalTenant(null);
      alert("AI engine access and quotas updated successfully!");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setAiSaving(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDomain("");
    setSubdomain("");
    setPrimaryColor("#D4AF37");
    setIsActive(true);
    setSaveErr("");
    setIsOpen(true);
  };
  const openEdit = (t: Tenant) => {
    setEditing(t);
    setName(t.name);
    setDomain(t.domain ?? "");
    setSubdomain(t.subdomain ?? "");
    setPrimaryColor(t.primaryColor ?? "#D4AF37");
    setIsActive(t.isActive);
    setSaveErr("");
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveErr("");
    try {
      const url = editing
        ? `${API}/api/v1/tenants/${editing.id}`
        : `${API}/api/v1/tenants`;
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          domain: domain || null,
          subdomain: subdomain || null,
          primaryColor,
          isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setIsOpen(false);
      fetchTenants();
    } catch (e: any) {
      setSaveErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tenant and all its data?")) return;
    try {
      const res = await fetch(`${API}/api/v1/tenants/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      fetchTenants();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="w-full space-y-5 pt-14 md:pt-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Tenants
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} tenant{total !== 1 ? "s" : ""} on this platform
          </p>
        </div>
        <button
          onClick={openCreate}
          className="shrink-0 bg-gray-900 hover:bg-gray-700 text-white px-5 py-2.5 rounded-xl
                     text-sm font-medium tracking-wide transition-colors"
        >
          + New Tenant
        </button>
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-sm">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"
          />
        </svg>
        <input
          type="text"
          placeholder="Search tenants…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
            fetchTenants(e.target.value, 1);
          }}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm
                     focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="w-full rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {[
                  "Tenant",
                  "Domain",
                  "Subdomain",
                  "Status",
                  "Created",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 sm:px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 sm:px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : tenants.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-16 text-center text-gray-400"
                  >
                    No tenants found. Create your first one.
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: t.primaryColor ?? "#D4AF37" }}
                        >
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 truncate max-w-[140px]">
                          {t.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-gray-500 max-w-[160px] truncate">
                      {t.domain ?? "—"}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-gray-500">
                      {t.subdomain ?? "—"}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                       ${t.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                      >
                        {t.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openTenantAi(t)}
                          className="text-xs font-semibold text-purple-600 hover:text-purple-800 uppercase tracking-wider"
                        >
                          AI Engines
                        </button>
                        <button
                          onClick={() => openEdit(t)}
                          className="text-xs font-semibold text-[#D4AF37] hover:text-amber-600 uppercase tracking-wider"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="text-xs font-semibold text-red-400 hover:text-red-600 uppercase tracking-wider"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages} · {total} total
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                }}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => {
                  setPage((p) => Math.min(totalPages, p + 1));
                }}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tenant Create/Edit Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <div
            className="w-full sm:max-w-lg bg-white sm:rounded-2xl shadow-2xl overflow-hidden
                          rounded-t-2xl max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? "Edit Tenant" : "New Tenant"}
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
                  Name *
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm
                             focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                    Domain
                  </label>
                  <input
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="client.example.com"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm
                               focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                    Subdomain
                  </label>
                  <input
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value)}
                    placeholder="client"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm
                               focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                    Brand Color
                  </label>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-16 rounded-lg border border-gray-200 cursor-pointer"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-5">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
              {saveErr && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-200">
                  {saveErr}
                </p>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl disabled:opacity-50 hover:bg-gray-700"
                >
                  {saving
                    ? "Saving…"
                    : editing
                      ? "Save Changes"
                      : "Create Tenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tenant AI Access & Quotas Modal */}
      {aiModalTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full sm:max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  AI Engines & Monthly Quotas
                </h2>
                <p className="text-xs text-gray-500">
                  Manage AI provider access and monthly generation limits for{" "}
                  <span className="font-semibold text-purple-700">
                    {aiModalTenant.name}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setAiModalTenant(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {aiLoading ? (
                <div className="p-8 text-center text-gray-400 animate-pulse">
                  Loading AI engine configurations...
                </div>
              ) : tenantAiConfigs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No AI providers found. Please add AI providers in Admin Portal
                  first.
                </div>
              ) : (
                <div className="space-y-3">
                  {tenantAiConfigs.map((c, idx) => (
                    <div
                      key={c.providerId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={c.isActive}
                          onChange={(e) => {
                            const updated = [...tenantAiConfigs];
                            updated[idx].isActive = e.target.checked;
                            setTenantAiConfigs(updated);
                          }}
                          className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 text-sm">
                              {c.providerName}
                            </p>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${c.providerIsActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}
                            >
                              {c.providerIsActive
                                ? "Global Active"
                                : "Global Inactive"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {c.modelCount} synced model(s)
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
                              value={c.quotaMonthly}
                              onChange={(e) => {
                                const updated = [...tenantAiConfigs];
                                updated[idx].quotaMonthly =
                                  parseInt(e.target.value) || 0;
                                setTenantAiConfigs(updated);
                              }}
                              className="w-24 px-2.5 py-1 text-xs border border-gray-200 rounded-lg text-gray-800 font-mono focus:border-purple-500 focus:outline-none"
                            />
                            <span className="text-xs text-gray-400">
                              used: {c.usageCurrent}
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
                Unchecked AI engines will be hidden from this tenant’s portal.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setAiModalTenant(null)}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTenantAi}
                  disabled={aiSaving}
                  className="px-6 py-2 bg-purple-700 hover:bg-purple-800 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
                >
                  {aiSaving ? "Saving..." : "Save AI Assignments"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
