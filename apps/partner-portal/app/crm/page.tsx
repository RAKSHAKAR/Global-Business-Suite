"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://127.0.0.1:4000";
type Client = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
};

const STAGES = ["NEW", "CONTACTED", "NEGOTIATING", "WON", "LOST"];
const STAGE_COLORS: Record<string, string> = {
  NEW: "bg-blue-50 border-blue-200",
  CONTACTED: "bg-yellow-50 border-yellow-200",
  NEGOTIATING: "bg-purple-50 border-purple-200",
  WON: "bg-green-50 border-green-200",
  LOST: "bg-gray-50 border-gray-200",
};
const STAGE_TEXT: Record<string, string> = {
  NEW: "text-blue-700",
  CONTACTED: "text-yellow-700",
  NEGOTIATING: "text-purple-700",
  WON: "text-green-700",
  LOST: "text-gray-500",
};

export default function CRMPipelinePage() {
  const { token } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("NEW");

  const fetch$ = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const url = `${API}/api/v1/clients?limit=100`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data.data ?? []);

      // Map old statuses to new pipeline stages if needed
      const mapped = arr.map((c: Client) => {
        let st = c.status;
        if (st === "LEAD" || st === "ACTIVE") st = "NEW";
        if (st === "INACTIVE") st = "LOST";
        if (!STAGES.includes(st)) st = "NEW";
        return { ...c, status: st };
      });
      setClients(mapped);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch$();
  }, [token]);

  const openCreate = (defaultStage = "NEW") => {
    setEditing(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setStatus(defaultStage);
    setSaveErr("");
    setIsOpen(true);
  };
  const openEdit = (c: Client) => {
    setEditing(c);
    setFirstName(c.firstName);
    setLastName(c.lastName);
    setEmail(c.email);
    setPhone(c.phone ?? "");
    setStatus(c.status);
    setSaveErr("");
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveErr("");
    try {
      const url = editing
        ? `${API}/api/v1/clients/${editing.id}`
        : `${API}/api/v1/clients`;
      const method = editing ? "PUT" : "POST";
      const body = editing
        ? { firstName, lastName, email, phone, status }
        : { firstName, lastName, email, phone, status };
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setIsOpen(false);
      fetch$();
    } catch (e: any) {
      setSaveErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    try {
      await fetch(`${API}/api/v1/clients/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetch$();
    } catch (e) {
      alert("Failed to delete");
    }
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("clientId");
    if (!id) return;

    // Optimistic UI update
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)),
    );

    // Update backend
    try {
      const client = clients.find((c) => c.id === id);
      if (!client) return;
      const res = await fetch(`${API}/api/v1/clients/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...client, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
    } catch (err) {
      alert("Failed to update stage");
      fetch$(); // Revert on fail
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex flex-col h-full min-h-[85vh]">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage leads and track conversions.
          </p>
        </div>
        <button
          onClick={() => openCreate("NEW")}
          className="bg-[#1A1A1A] hover:bg-[#333] text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors"
        >
          + Add Lead
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 border border-red-100">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 h-full min-h-[500px] items-stretch">
          {STAGES.map((stage) => {
            const stageClients = clients.filter((c) => c.status === stage);
            return (
              <div
                key={stage}
                className="flex-shrink-0 w-80 bg-gray-100/50 rounded-2xl flex flex-col border border-gray-200/60"
                onDrop={(e) => handleDrop(e, stage)}
                onDragOver={onDragOver}
              >
                <div
                  className={`px-4 py-3 border-b border-gray-200/60 flex items-center justify-between rounded-t-2xl ${STAGE_COLORS[stage]}`}
                >
                  <h3
                    className={`font-bold text-sm tracking-wide ${STAGE_TEXT[stage]}`}
                  >
                    {stage}
                  </h3>
                  <span className="bg-white/60 px-2 py-0.5 rounded-full text-xs font-semibold">
                    {stageClients.length}
                  </span>
                </div>

                <div className="p-3 flex-1 overflow-y-auto space-y-3">
                  {stageClients.map((c) => (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("clientId", c.id)
                      }
                      className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-[#D4AF37] hover:shadow-md transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-gray-900">
                          {c.firstName} {c.lastName}
                        </h4>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                          <button
                            onClick={() => openEdit(c)}
                            className="text-[#D4AF37] hover:text-amber-600"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="text-red-400 hover:text-red-600"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 truncate mb-1">
                        {c.email}
                      </p>
                      {c.phone && (
                        <p className="text-xs text-gray-500 truncate mb-2">
                          {c.phone}
                        </p>
                      )}
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}

                  {stageClients.length === 0 && !loading && (
                    <div className="text-center py-8 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                      Drop leads here
                    </div>
                  )}
                  {loading && (
                    <div className="animate-pulse bg-gray-200 h-24 rounded-xl"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? "Edit Lead" : "Add New Lead"}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">
                    First Name *
                  </label>
                  <input
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">
                    Last Name *
                  </label>
                  <input
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">
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
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">
                  Stage
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm bg-white focus:border-[#D4AF37] focus:outline-none"
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {saveErr && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
                  {saveErr}
                </p>
              )}
            </form>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 shrink-0">
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
                className="px-6 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-xl disabled:opacity-50 hover:bg-[#333]"
              >
                {saving ? "Saving..." : editing ? "Save Changes" : "Add Lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
