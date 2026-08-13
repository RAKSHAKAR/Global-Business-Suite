"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";
type Permission = { id: string; resource: string; action: string };
type Role = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  tenantId: string | null;
  createdAt: string;
  permissions?: Permission[];
};

export default function RolesPage() {
  const { token } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [name, setName] = useState("");
  const [description, setDesc] = useState("");

  const fetchRoles = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/v1/roles?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data.data ?? []);
      setRoles(arr);
      setTotal(data?.pagination?.total ?? arr.length);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [token]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDesc("");
    setSaveErr("");
    setIsOpen(true);
  };
  const openEdit = (r: Role) => {
    setEditing(r);
    setName(r.name);
    setDesc(r.description ?? "");
    setSaveErr("");
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveErr("");
    try {
      const url = editing
        ? `${API}/api/v1/roles/${editing.id}`
        : `${API}/api/v1/roles`;
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setIsOpen(false);
      fetchRoles();
    } catch (e: any) {
      setSaveErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this role?")) return;
    try {
      const res = await fetch(`${API}/api/v1/roles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Delete failed");
      }
      fetchRoles();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="w-full space-y-5 pt-14 md:pt-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Roles & Permissions
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} role{total !== 1 ? "s" : ""} configured
          </p>
        </div>
        <button
          onClick={openCreate}
          className="shrink-0 bg-gray-900 hover:bg-gray-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          + New Role
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-white rounded-2xl border border-gray-200 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {roles.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              No roles found.
            </div>
          ) : (
            roles.map((role) => (
              <div
                key={role.id}
                className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl bg-gray-900 text-[#D4AF37] text-sm font-bold
                                    flex items-center justify-center shrink-0"
                    >
                      {role.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">
                          {role.name}
                        </h3>
                        {role.isSystem && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold uppercase tracking-wider">
                            System
                          </span>
                        )}
                        {role.tenantId && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold uppercase tracking-wider">
                            Tenant-Scoped
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5 truncate">
                        {role.description ?? "No description"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
                    <button
                      onClick={() =>
                        setExpanded((e) => (e === role.id ? null : role.id))
                      }
                      className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
                    >
                      {expanded === role.id ? "Hide" : "View"} Permissions
                    </button>
                    {!role.isSystem && (
                      <>
                        <button
                          onClick={() => openEdit(role)}
                          className="px-3 py-1.5 text-xs font-semibold text-[#D4AF37] hover:text-amber-600 uppercase tracking-wider"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(role.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-red-400 hover:text-red-600 uppercase tracking-wider"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {expanded === role.id && (
                  <div className="border-t border-gray-100 px-4 sm:px-6 py-4 bg-gray-50">
                    {!role.permissions || role.permissions.length === 0 ? (
                      <p className="text-sm text-gray-400">
                        No permissions assigned to this role.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {role.permissions.map((p) => (
                          <span
                            key={p.id}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs font-mono text-gray-700"
                          >
                            {p.resource}:{p.action}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? "Edit Role" : "New Role"}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                  Role Name *
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-[#D4AF37] focus:outline-none resize-none"
                />
              </div>
              {saveErr && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {saveErr}
                </p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
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
                      : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
