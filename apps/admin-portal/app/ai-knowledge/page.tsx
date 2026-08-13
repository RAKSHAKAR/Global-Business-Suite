"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";

export default function AIKnowledgePage() {
  const { token } = useAuth();
  const [bases, setBases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("FAQ");
  const [creating, setCreating] = useState(false);

  // Doc Upload state
  const [selectedKb, setSelectedKb] = useState<any | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");
  const [indexing, setIndexing] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchBases = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/ai-knowledge/bases`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBases(data);
        if (data.length > 0 && !selectedKb) setSelectedKb(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBases();
  }, [token]);

  const handleCreateKb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setCreating(true);
    try {
      const res = await fetch(`${API}/api/v1/ai-knowledge/bases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description, category }),
      });
      if (res.ok) {
        setTitle("");
        setDescription("");
        fetchBases();
      }
    } catch (e) {
      alert("Failed to create Knowledge Base");
    } finally {
      setCreating(false);
    }
  };

  const handleIndexDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKb || !docTitle || !docContent) return;
    setIndexing(true);
    try {
      const res = await fetch(`${API}/api/v1/ai-knowledge/documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          knowledgeBaseId: selectedKb.id,
          title: docTitle,
          content: docContent,
        }),
      });
      if (res.ok) {
        setDocTitle("");
        setDocContent("");
        alert("Document successfully processed and indexed into Vector DB!");
        fetchBases();
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIndexing(false);
    }
  };

  const handleSemanticSearch = async () => {
    if (!searchQuery) return;
    setSearching(true);
    try {
      const res = await fetch(`${API}/api/v1/ai-knowledge/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          knowledgeBaseId: selectedKb?.id,
          query: searchQuery,
        }),
      });
      const data = await res.json();
      setSearchResults(data.chunks || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="w-full space-y-6 pt-14 md:pt-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Knowledge Base & RAG Vector Engine</h1>
        <p className="mt-1 text-sm text-gray-500">Upload business documents, index embeddings, and perform hybrid semantic vector searches</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Knowledge Base Create & List */}
        <div className="space-y-6">
          <form onSubmit={handleCreateKb} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">Create Knowledge Base</h2>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (e.g. Company Policy Manual)"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={creating}
              className="w-full py-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {creating ? "Creating..." : "+ Add Knowledge Base"}
            </button>
          </form>

          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-2 py-1">Knowledge Repositories</h2>
            {bases.map((kb) => (
              <button
                key={kb.id}
                onClick={() => setSelectedKb(kb)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1 ${
                  selectedKb?.id === kb.id ? "bg-purple-50 border-purple-300 shadow-sm" : "bg-gray-50/50 border-gray-100 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-gray-900">{kb.title}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{kb.category}</span>
                </div>
                <p className="text-xs text-gray-500">{kb.documents?.length || 0} Documents Indexing</p>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Knowledge Base Detail & Upload */}
        <div className="lg:col-span-2 space-y-6">
          {selectedKb ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
              <div className="border-b pb-4">
                <h2 className="text-xl font-bold text-gray-900">{selectedKb.title}</h2>
                <p className="text-xs text-gray-500">{selectedKb.description || "Multi-tenant vector repository"}</p>
              </div>

              {/* Upload Document Form */}
              <form onSubmit={handleIndexDocument} className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">Index New Document into RAG Vector Store</h3>
                <input
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Document Title (e.g. Terms of Service v2.pdf)"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm bg-white focus:border-purple-500 focus:outline-none"
                />
                <textarea
                  required
                  rows={4}
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  placeholder="Paste document body text to chunk and vectorize..."
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm bg-white focus:border-purple-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={indexing}
                  className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {indexing ? "Chunking & Vectorizing..." : "Process & Vectorize Document"}
                </button>
              </form>

              {/* Semantic Search Test Bench */}
              <div className="border-t pt-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">RAG Semantic Cosine Search Sandbox</h3>
                <div className="flex gap-2">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter query string (e.g. refund policy rules)..."
                    className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    onClick={handleSemanticSearch}
                    disabled={searching}
                    className="px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                  >
                    {searching ? "Searching..." : "Vector Search"}
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {searchResults.map((c, idx) => (
                      <div key={idx} className="p-3.5 bg-purple-50/60 border border-purple-100 rounded-xl text-xs space-y-1">
                        <div className="flex justify-between font-bold text-purple-900">
                          <span>Source: {c.documentTitle}</span>
                          <span>Similarity Score: {(c.score * 100).toFixed(1)}%</span>
                        </div>
                        <p className="text-gray-800">{c.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-64 bg-white rounded-2xl border border-gray-200 flex items-center justify-center text-gray-400">
              Select or create a Knowledge Base to view documents
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
