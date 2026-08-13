"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";

type PromptTemplate = {
  id: string;
  key: string;
  title: string;
  systemPrompt: string;
  userPrompt: string;
  version: number;
  modelKey: string;
  updatedAt: string;
};

export default function AiPromptsPage() {
  const { token } = useAuth();
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<PromptTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const [key, setKey] = useState("");
  const [title, setTitle] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [modelKey, setModelKey] = useState("gemini-1.5-pro");

  const fetchPrompts = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/v1/admin/prompts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPrompts(data.prompts || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, [token]);

  const openCreate = () => {
    setEditing(null);
    setKey("");
    setTitle("");
    setSystemPrompt("You are an AI assistant for Global Business Suite.");
    setUserPrompt("");
    setModelKey("gemini-1.5-pro");
    setIsOpen(true);
  };

  const openEdit = (p: PromptTemplate) => {
    setEditing(p);
    setKey(p.key);
    setTitle(p.title);
    setSystemPrompt(p.systemPrompt);
    setUserPrompt(p.userPrompt);
    setModelKey(p.modelKey);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/prompts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          key,
          title,
          systemPrompt,
          userPrompt,
          modelKey,
        }),
      });
      if (!res.ok) throw new Error("Failed to save prompt template");
      setIsOpen(false);
      fetchPrompts();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6 pt-14 md:pt-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            AI Prompt Templates & Versioning Studio
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Centralized prompt versioning, system instructions, and LLM model bindings
          </p>
        </div>
        <button
          onClick={openCreate}
          className="shrink-0 bg-gray-900 hover:bg-gray-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          + New Prompt Template
        </button>
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
          {prompts.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-200">
              No prompt templates configured.
            </div>
          ) : (
            prompts.map((p) => (
              <div key={p.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 text-lg">{p.title}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 border text-gray-600">
                      {p.key}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold uppercase">
                      v{p.version}
                    </span>
                  </div>
                  <button
                    onClick={() => openEdit(p)}
                    className="text-xs font-semibold text-[#D4AF37] hover:underline uppercase"
                  >
                    Edit & Update Version
                  </button>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs font-mono text-gray-700">
                  <p className="font-semibold text-gray-500 mb-1">SYSTEM PROMPT:</p>
                  <p>{p.systemPrompt}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                  <span>Assigned Model: <strong className="text-gray-800">{p.modelKey}</strong></span>
                  <span>Last Updated: {new Date(p.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">{editing ? `Update ${editing.key} (Increments Version)` : "New Prompt Template"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Template Key *</label>
                  <input required disabled={!!editing} value={key} onChange={(e) => setKey(e.target.value)} placeholder="CAPTION_GENERATOR" className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Title *</label>
                  <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Social Caption Prompt" className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Assigned LLM Model</label>
                <select value={modelKey} onChange={(e) => setModelKey(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="gemini-1.5-pro">Google Gemini 1.5 Pro</option>
                  <option value="gpt-4o">OpenAI GPT-4o</option>
                  <option value="claude-3-sonnet">Anthropic Claude 3 Sonnet</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">System Prompt Instructions *</label>
                <textarea rows={3} required value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">User Prompt Template</label>
                <textarea rows={2} value={userPrompt} onChange={(e) => setUserPrompt(e.target.value)} placeholder="Generate caption for {{topic}}" className="w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 border rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-gray-900 text-white font-medium text-sm rounded-xl hover:bg-gray-800 disabled:opacity-50">{saving ? "Saving..." : editing ? "Save & Increment Version" : "Create Prompt"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
