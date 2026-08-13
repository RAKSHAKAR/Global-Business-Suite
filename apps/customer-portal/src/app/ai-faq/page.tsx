"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { SparklesIcon, MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../AuthContext";
import { apiRequest } from "@/lib/api";

export default function AiFaqPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !token) return;

    setLoading(true);
    try {
      const data = await apiRequest<{ response?: string }>("/api/v1/customer/ai/assistant", token, {
        method: "POST",
        body: JSON.stringify({ toolType: "FAQ", query: query.trim() }),
      });
      setResults([{ question: query, answer: data.response || "No answer was returned.", citations: [] }]);
    } catch (error) {
      setResults([{ question: query, answer: error instanceof Error ? error.message : "FAQ search is unavailable.", citations: [] }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <SparklesIcon className="w-7 h-7 text-purple-600" /> Instant AI FAQ Search
          </h1>
          <p className="text-sm text-gray-500">Ask any question to instantly search platform knowledge bases with citation support.</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search platform FAQs (e.g. How to change subscription plan?)..."
              className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors text-sm shadow-sm"
          >
            {loading ? "Searching..." : "Search FAQ"}
          </button>
        </form>

        {results.length > 0 && (
          <div className="space-y-4">
            {results.map((res, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                <h3 className="font-bold text-gray-900 text-base">Q: {res.question}</h3>
                <p className="text-sm text-gray-700 leading-relaxed bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                  {res.answer}
                </p>
                <div className="flex items-center gap-2 text-xs text-purple-700 font-mono">
                  <span className="font-bold">Sources:</span>
                  {res.citations.map((c: string, i: number) => (
                    <span key={i} className="bg-purple-100 px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
