"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import Link from "next/link";

const API = "http://localhost:4000";

type SearchResult = {
  type: string;
  title: string;
  subtitle: string;
  url: string;
};

export default function GlobalSearchPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState("ALL");

  useEffect(() => {
    if (!token) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/v1/admin/global-search?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query, token]);

  const filteredResults = filterType === "ALL" 
    ? results 
    : results.filter(r => r.type === filterType);

  return (
    <div className="w-full space-y-6 pt-14 md:pt-0">
      <div className="bg-gray-950 p-6 rounded-3xl text-white shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-black text-white">Enterprise Global Search</h1>
        <p className="mt-1 text-sm text-gray-400">
          Search across Users, Tenants, Roles, Prompts, Social Posts, Billing, and System Audit Logs.
        </p>

        {/* Input Bar */}
        <div className="mt-6 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type anything (e.g., admin, tenant, subscription, security)... [Ctrl+K]"
            className="w-full bg-gray-900 border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-white text-base focus:outline-none focus:border-[#D4AF37] transition-all"
            autoFocus
          />
          <span className="absolute left-4 top-4 text-xl">🔍</span>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2 mt-4 text-xs font-semibold">
          {["ALL", "USER", "TENANT", "ROLE", "AUDIT_LOG"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                filterType === t
                  ? "bg-[#D4AF37] text-gray-950 border-[#D4AF37]"
                  : "bg-gray-900 text-gray-400 border-gray-800 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Results Container */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm min-h-[300px]">
        {loading ? (
          <div className="text-center py-12 text-gray-400 animate-pulse">Searching enterprise catalog...</div>
        ) : filteredResults.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {query.trim() ? "No matching records found." : "No records available."}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {query.trim() ? `Search Results (${filteredResults.length})` : `Recent Platform Items (${filteredResults.length})`}
            </p>

            <div className="divide-y divide-gray-100">
              {filteredResults.map((r, idx) => (
                <Link
                  key={idx}
                  href={r.url}
                  className="flex items-center justify-between py-3.5 hover:bg-gray-50 px-4 rounded-xl transition-all group border-b border-gray-50 last:border-none"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700 uppercase tracking-widest">
                      {r.type}
                    </span>
                    <div>
                      <strong className="text-gray-900 font-semibold text-sm group-hover:text-[#D4AF37] transition-colors">{r.title}</strong>
                      <p className="text-xs text-gray-500 mt-0.5">{r.subtitle}</p>
                    </div>
                  </div>
                  <span className="text-gray-400 group-hover:text-gray-900 font-bold transition-all">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
