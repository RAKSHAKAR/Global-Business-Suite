"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../AuthContext";
import DashboardLayout from "@/components/DashboardLayout";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";

export default function CustomerGbpPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<"overview" | "reviews" | "insights">("overview");
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLoc, setSelectedLoc] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState<string | null>(null);
  const [replying, setReplying] = useState<string | null>(null);

  const apiFetch = useCallback(async (path: string, opts?: RequestInit) => {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(opts?.headers || {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    apiFetch("/api/v1/gbp/locations").then((d) => {
      setLocations(d.data || []);
      if (d.data?.length > 0) setSelectedLoc(d.data[0]);
    }).catch(console.error);
  }, [token]);

  useEffect(() => {
    if (!token || !selectedLoc) return;
    setLoading(true);
    const endpoints: Record<string, string> = {
      overview: `/api/v1/gbp/multi-location/summary`,
      reviews: `/api/v1/gbp/locations/${selectedLoc.id}/reviews`,
      insights: `/api/v1/gbp/locations/${selectedLoc.id}/insights?days=30`,
    };
    apiFetch(endpoints[tab]).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [tab, selectedLoc, token]);

  const generateAiReply = async (reviewId: string) => {
    setGenerating(reviewId);
    try {
      const r = await apiFetch(`/api/v1/gbp/locations/${selectedLoc.id}/reviews/${reviewId}/ai-reply`, {
        method: "POST", body: JSON.stringify({ tone: "friendly" }),
      });
      setReplyText((prev) => ({ ...prev, [reviewId]: r.suggestedReply }));
    } catch (e) { console.error(e); } finally { setGenerating(null); }
  };

  const submitReply = async (reviewId: string) => {
    if (!replyText[reviewId]?.trim()) return;
    setReplying(reviewId);
    try {
      await apiFetch(`/api/v1/gbp/locations/${selectedLoc.id}/reviews/${reviewId}/reply`, {
        method: "POST", body: JSON.stringify({ replyComment: replyText[reviewId] }),
      });
      setReplyText((prev) => { const n = { ...prev }; delete n[reviewId]; return n; });
    } catch (e) { console.error(e); } finally { setReplying(null); }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🏪 Google Business Profile</h1>
            <p className="text-sm text-gray-400 mt-0.5">{locations.length} location{locations.length !== 1 ? "s" : ""}</p>
          </div>
          {locations.length > 1 && (
            <select value={selectedLoc?.id || ""} onChange={(e) => setSelectedLoc(locations.find((l) => l.id === e.target.value))}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2">
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name || l.locationName}</option>)}
            </select>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 pb-px">
          {(["overview", "reviews", "insights"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium capitalize transition-colors
                ${tab === t ? "bg-white border border-b-white border-gray-200 text-gray-900 -mb-px" : "text-gray-500 hover:text-gray-700"}`}>
              {t === "overview" ? "🏠 Overview" : t === "reviews" ? "⭐ Reviews" : "📊 Insights"}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border" />)}</div>
        ) : (
          <>
            {/* Overview */}
            {tab === "overview" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Avg Rating", value: data?.totals?.avgRating?.toFixed(1) || "–", icon: "⭐" },
                    { label: "Total Reviews", value: data?.totals?.totalReviews || 0, icon: "💬" },
                    { label: "Response Rate", value: `${Math.round(data?.totals?.avgResponseRate || 0)}%`, icon: "📨" },
                    { label: "Locations", value: data?.locationCount || 0, icon: "📍" },
                  ].map((s) => (
                    <div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-5">
                      <div className="text-2xl mb-2">{s.icon}</div>
                      <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                      <div className="text-sm text-gray-400">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Your Locations</h3>
                  <div className="space-y-3">
                    {(data?.locations || locations).map((loc: any) => (
                      <div key={loc.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <div className="font-medium text-gray-900">{loc.name || loc.title || loc.locationName}</div>
                          <div className="text-sm text-gray-400">{loc.address || ""}</div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-yellow-500 font-semibold">⭐ {(loc.avgRating || 0).toFixed(1)}</span>
                          <span className="text-gray-400">{loc.reviewCount} reviews</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Reviews */}
            {tab === "reviews" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Total", value: data?.stats?.total || 0 },
                    { label: "Responded", value: data?.stats?.responded || 0 },
                    { label: "Response Rate", value: `${data?.stats?.responseRate || 0}%` },
                    { label: "Avg Rating", value: `${data?.stats?.avgRating || 0} ⭐` },
                  ].map((s) => (
                    <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                      <div className="text-xl font-bold text-gray-900">{s.value}</div>
                      <div className="text-xs text-gray-400">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {(data?.data || []).map((review: any) => (
                    <div key={review.id} className="bg-white border border-gray-200 rounded-2xl p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">{review.reviewerName || "Anonymous"}</div>
                          <div className="flex mt-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <span key={s} className={`text-lg ${s <= review.starRating ? "text-yellow-400" : "text-gray-200"}`}>★</span>
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">{review.createTime ? new Date(review.createTime).toLocaleDateString() : ""}</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-2">{review.comment || "No comment"}</p>
                      {review.replyComment ? (
                        <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm">
                          <span className="font-semibold text-blue-700">Your Reply: </span>{review.replyComment}
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2">
                          <textarea rows={2} value={replyText[review.id] || ""} onChange={(e) => setReplyText((p) => ({ ...p, [review.id]: e.target.value }))}
                            placeholder="Write a reply…"
                            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300" />
                          <div className="flex gap-2">
                            <button onClick={() => generateAiReply(review.id)} disabled={generating === review.id}
                              className="text-xs px-3 py-1.5 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50">
                              {generating === review.id ? "Generating…" : "✨ AI Reply"}
                            </button>
                            <button onClick={() => submitReply(review.id)} disabled={replying === review.id || !replyText[review.id]}
                              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                              {replying === review.id ? "Posting…" : "Post Reply"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {!(data?.data?.length) && <div className="text-center py-10 text-gray-400">No reviews yet.</div>}
                </div>
              </div>
            )}

            {/* Insights */}
            {tab === "insights" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: "Impressions", value: data?.totals?.businessImpressions || 0, icon: "👁️" },
                    { label: "Calls", value: data?.totals?.callClicks || 0, icon: "📞" },
                    { label: "Website", value: data?.totals?.websiteClicks || 0, icon: "🌐" },
                    { label: "Directions", value: data?.totals?.directionRequests || 0, icon: "🗺️" },
                    { label: "Photo Views", value: data?.totals?.photoViewCount || 0, icon: "📸" },
                  ].map((s) => (
                    <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                      <div className="text-xl mb-1">{s.icon}</div>
                      <div className="text-xl font-bold text-gray-900">{s.value?.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Daily Impressions</h3>
                  <div className="flex items-end gap-1 h-20">
                    {(data?.data || []).slice(-30).map((d: any, i: number) => {
                      const max = Math.max(...(data?.data || []).map((x: any) => x.businessImpressions), 1);
                      const h = Math.max(4, (d.businessImpressions / max) * 100);
                      return <div key={i} className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors" style={{ height: `${h}%` }} />;
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1"><span>30d ago</span><span>Today</span></div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
