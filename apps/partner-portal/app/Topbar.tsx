"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";

type SearchResult = {
  type: string;
  title: string;
  subtitle?: string;
  link: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";

/** Global partner command search, mounted by the real portal shell. */
export default function Topbar() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!query.trim() || !token) {
      setResults([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `${API_BASE}/api/v1/partner/global-search?q=${encodeURIComponent(query.trim())}`,
          { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal },
        );
        if (!response.ok) throw new Error(`Search failed (${response.status})`);
        const payload = await response.json();
        setResults(Array.isArray(payload.results) ? payload.results : []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("[partner-search]", error);
          setResults([]);
        }
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, token]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border px-3 text-left text-xs sm:flex lg:max-w-md"
        style={{
          borderColor: "var(--gbs-border-color)",
          background: "var(--gbs-bg-surface)",
          color: "var(--gbs-text-secondary)",
        }}
        aria-label="Open global search"
        aria-haspopup="dialog"
      >
        <span aria-hidden="true">⌕</span>
        <span className="min-w-0 flex-1 truncate">Search customers, posts, reports…</span>
        <kbd className="rounded border px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-20 backdrop-blur-sm"
          onMouseDown={(event) => event.target === event.currentTarget && close()}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="partner-search-title"
            className="w-full max-w-2xl overflow-hidden rounded-xl border shadow-2xl"
            style={{ borderColor: "var(--gbs-border-color)", background: "var(--gbs-bg-surface)" }}
          >
            <h2 id="partner-search-title" className="sr-only">Partner global search</h2>
            <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: "var(--gbs-border-color)" }}>
              <span aria-hidden="true">⌕</span>
              <input
                ref={inputRef}
                type="search"
                aria-label="Search the partner portal"
                placeholder="Search customers, posts, reviews, campaigns, tasks…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--gbs-text-primary)" }}
              />
              <button type="button" onClick={close} className="rounded border px-2 py-1 text-xs" aria-label="Close search">
                Esc
              </button>
            </div>

            <div className="max-h-96 space-y-2 overflow-y-auto p-4" aria-live="polite">
              {searching && <p className="py-4 text-center text-xs">Searching…</p>}
              {!searching && query && results.length === 0 && (
                <p className="py-4 text-center text-xs">No matching results.</p>
              )}
              {results.map((item) => (
                <Link
                  key={`${item.type}:${item.link}:${item.title}`}
                  href={item.link}
                  onClick={close}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  style={{ borderColor: "var(--gbs-border-color)", color: "var(--gbs-text-primary)" }}
                >
                  <span className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase" style={{ color: "var(--gbs-text-brand)" }}>{item.type}</span>
                    <span className="block truncate text-sm font-semibold">{item.title}</span>
                    {item.subtitle && <span className="block truncate text-xs" style={{ color: "var(--gbs-text-secondary)" }}>{item.subtitle}</span>}
                  </span>
                  <span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
