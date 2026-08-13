"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";
type User = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  tenantId: string | null;
  createdAt: string;
};

export default function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);

  const fetchUsers = async (q = search, pg = page) => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(pg),
        limit: String(limit),
      });
      if (q) params.set("search", q);
      const res = await fetch(`${API}/api/v1/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : (data.data ?? []));
      setTotal(data?.pagination?.total ?? 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token, page]);

  const openCreate = () => {
    setEditing(null);
    setEmail("");
    setFirstName("");
    setLastName("");
    setPassword("");
    setIsActive(true);
    setSaveErr("");
    setIsOpen(true);
  };
  const openEdit = (u: User) => {
    setEditing(u);
    setEmail(u.email);
    setFirstName(u.firstName ?? "");
    setLastName(u.lastName ?? "");
    setPassword("");
    setIsActive(u.isActive);
    setSaveErr("");
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveErr("");
    try {
      const payload: any = { email, firstName, lastName, isActive };
      if (password) payload.password = password;
      const url = editing
        ? `${API}/api/v1/users/${editing.id}`
        : `${API}/api/v1/users`;
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
      fetchUsers();
    } catch (e: any) {
      setSaveErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this user?")) return;
    try {
      const res = await fetch(`${API}/api/v1/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      fetchUsers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="w-full space-y-5 pt-14 md:pt-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Global Users
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} user{total !== 1 ? "s" : ""} across all tenants
          </p>
        </div>
        <button
          onClick={openCreate}
          className="shrink-0 bg-gray-900 hover:bg-gray-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          + New User
        </button>
      </div>

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
          placeholder="Search users…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
            fetchUsers(e.target.value, 1);
          }}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="w-full rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["User", "Email", "Tenant", "Status", "Joined", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 sm:px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 sm:px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-16 text-center text-gray-400"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {(u.firstName ?? u.email).charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 truncate max-w-[120px]">
                          {u.firstName || u.lastName
                            ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                            : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-gray-500 max-w-[180px] truncate">
                      {u.email}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-gray-400 text-xs">
                      {u.tenantId ? "Tenant" : "Global"}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                       ${u.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                      >
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex gap-3">
                        <button
                          onClick={() => openEdit(u)}
                          className="text-xs font-semibold text-[#D4AF37] hover:text-amber-600 uppercase tracking-wider"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages} · {total} total
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b shrink-0">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? "Edit User" : "New User"}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                    First Name
                  </label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                    Last Name
                  </label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                  Email *
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                  {editing
                    ? "New Password (leave blank to keep)"
                    : "Password *"}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!editing}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="uActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="uActive" className="text-sm text-gray-700">
                  Account Active
                </label>
              </div>
              {saveErr && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {saveErr}
                </p>
              )}
            </form>
            <div className="flex justify-end gap-3 px-5 sm:px-6 py-4 border-t bg-gray-50 shrink-0">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-white text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit as any}
                disabled={saving}
                className="px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl disabled:opacity-50 hover:bg-gray-700"
              >
                {saving ? "Saving…" : editing ? "Save Changes" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
