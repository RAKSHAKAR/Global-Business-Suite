"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";

type NotificationTemplate = {
  id: string;
  key: string;
  channel: string;
  subject: string;
  body: string;
  isActive: boolean;
  updatedAt: string;
};

export default function NotificationsPage() {
  const { token } = useAuth();
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const [key, setKey] = useState("");
  const [channel, setChannel] = useState("EMAIL");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const fetchTemplates = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/v1/admin/notification-templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [token]);

  const openEdit = (t: NotificationTemplate) => {
    setEditing(t);
    setKey(t.key);
    setChannel(t.channel);
    setSubject(t.subject);
    setBody(t.body);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/notification-templates`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key, channel, subject, body }),
      });
      if (!res.ok) throw new Error("Failed to save notification template");
      setIsOpen(false);
      fetchTemplates();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6 pt-14 md:pt-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Centralized Notifications Control Center
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage Email, SMS, WhatsApp, and Push Notification templates across event triggers
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-2xl border border-gray-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {templates.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-200">
              No notification templates configured.
            </div>
          ) : (
            templates.map((t) => (
              <div key={t.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 text-lg">{t.subject}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 border text-gray-600">
                      {t.key}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold uppercase">
                      {t.channel}
                    </span>
                  </div>
                  <button
                    onClick={() => openEdit(t)}
                    className="text-xs font-semibold text-[#D4AF37] hover:underline uppercase"
                  >
                    Edit Template
                  </button>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs font-mono text-gray-700">
                  {t.body}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Edit Notification Template ({key})</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Channel</label>
                <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="PUSH">Push Notification</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Subject / Title *</label>
                <input required value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Message Body *</label>
                <textarea rows={4} required value={body} onChange={(e) => setBody(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 border rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-gray-900 text-white font-medium text-sm rounded-xl hover:bg-gray-800 disabled:opacity-50">{saving ? "Saving..." : "Save Template"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
