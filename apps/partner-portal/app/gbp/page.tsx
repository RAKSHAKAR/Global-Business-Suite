"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../AuthContext";
import { useRouter, usePathname } from "next/navigation";

const API = "http://127.0.0.1:4000";

const GBP_TABS = [
  { id: "overview", label: "Overview", icon: "🏠" },
  { id: "reviews", label: "Reviews", icon: "⭐" },
  { id: "posts", label: "GBP Posts", icon: "📝" },
  { id: "products", label: "Products", icon: "🛍️" },
  { id: "services", label: "Services", icon: "🔧" },
  { id: "media", label: "Media", icon: "🖼️" },
  { id: "qa", label: "Q&A", icon: "❓" },
  { id: "messages", label: "Messages", icon: "💬" },
  { id: "insights", label: "Insights", icon: "📊" },
  { id: "automation", label: "Automation", icon: "⚡" },
];

const STAR_COLORS = ["", "bg-red-100 text-red-700", "bg-orange-100 text-orange-700", "bg-yellow-100 text-yellow-700", "bg-lime-100 text-lime-700", "bg-green-100 text-green-700"];

export default function GbpPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const apiFetch = useCallback(
    async (path: string, opts?: RequestInit) => {
      const res = await fetch(`${API}${path}`, {
        ...opts,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(opts?.headers || {}) },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    [token],
  );

  useEffect(() => {
    if (!token) return;
    apiFetch("/api/v1/gbp/locations").then((d) => {
      setLocations(d.data || []);
      if (d.data?.length > 0) setSelectedLocation(d.data[0]);
    }).catch(console.error);
  }, [token]);

  useEffect(() => {
    if (!token || !selectedLocation) return;
    setLoading(true);
    const endpoints: Record<string, string> = {
      overview: `/api/v1/gbp/multi-location/summary`,
      reviews: `/api/v1/gbp/locations/${selectedLocation.id}/reviews`,
      posts: `/api/v1/gbp/locations/${selectedLocation.id}/posts`,
      products: `/api/v1/gbp/locations/${selectedLocation.id}/products`,
      services: `/api/v1/gbp/locations/${selectedLocation.id}/services`,
      media: `/api/v1/gbp/locations/${selectedLocation.id}/media`,
      qa: `/api/v1/gbp/locations/${selectedLocation.id}/questions`,
      messages: `/api/v1/gbp/locations/${selectedLocation.id}/messages`,
      insights: `/api/v1/gbp/locations/${selectedLocation.id}/insights?days=30`,
      automation: `/api/v1/automation`,
    };
    apiFetch(endpoints[activeTab]).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [activeTab, selectedLocation, token]);

  const triggerSync = async () => {
    setSyncing(true);
    try {
      await apiFetch("/api/v1/gbp/sync", { method: "POST" });
      const d = await apiFetch("/api/v1/gbp/locations");
      setLocations(d.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-blue-600">🏪</span> Google Business Profile
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{locations.length} location{locations.length !== 1 ? "s" : ""} connected</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Location Selector */}
            {locations.length > 1 && (
              <select
                value={selectedLocation?.id || ""}
                onChange={(e) => setSelectedLocation(locations.find((l) => l.id === e.target.value))}
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name || l.locationName || l.googleLocationId}</option>
                ))}
              </select>
            )}
            <button
              onClick={triggerSync}
              disabled={syncing}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {syncing ? "⟳ Syncing…" : "🔄 Sync GBP"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 overflow-x-auto">
          {GBP_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : (
          <>
            {activeTab === "overview" && <GbpOverview data={data} locations={locations} />}
            {activeTab === "reviews" && <GbpReviews data={data} locationId={selectedLocation?.id} apiFetch={apiFetch} onRefresh={() => setActiveTab("reviews")} />}
            {activeTab === "posts" && <GbpPosts data={data} locationId={selectedLocation?.id} apiFetch={apiFetch} />}
            {activeTab === "products" && <GbpProducts data={data} locationId={selectedLocation?.id} apiFetch={apiFetch} />}
            {activeTab === "services" && <GbpServices data={data} locationId={selectedLocation?.id} apiFetch={apiFetch} />}
            {activeTab === "media" && <GbpMedia data={data} locationId={selectedLocation?.id} apiFetch={apiFetch} />}
            {activeTab === "qa" && <GbpQA data={data} locationId={selectedLocation?.id} apiFetch={apiFetch} />}
            {activeTab === "messages" && <GbpMessages data={data} locationId={selectedLocation?.id} apiFetch={apiFetch} />}
            {activeTab === "insights" && <GbpInsights data={data} />}
            {activeTab === "automation" && <GbpAutomation data={data} apiFetch={apiFetch} />}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function GbpOverview({ data, locations }: { data: any; locations: any[] }) {
  const totals = data?.totals || {};
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Avg Rating", value: totals.avgRating?.toFixed(1) || "–", icon: "⭐", color: "bg-yellow-50 border-yellow-200" },
          { label: "Total Reviews", value: totals.totalReviews || 0, icon: "💬", color: "bg-blue-50 border-blue-200" },
          { label: "Response Rate", value: `${Math.round(totals.avgResponseRate || 0)}%`, icon: "📨", color: "bg-green-50 border-green-200" },
          { label: "Locations", value: data?.locationCount || 0, icon: "📍", color: "bg-purple-50 border-purple-200" },
        ].map((stat) => (
          <div key={stat.label} className={`bg-white border rounded-2xl p-5 ${stat.color}`}>
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-800">All Locations</div>
        <div className="divide-y divide-gray-50">
          {(data?.locations || locations).map((loc: any) => (
            <div key={loc.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="font-medium text-gray-900">{loc.name || loc.title || loc.locationName}</div>
                <div className="text-sm text-gray-400">{loc.address || "No address"}</div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-yellow-600 font-semibold">⭐ {(loc.avgRating || 0).toFixed(1)}</span>
                <span className="text-gray-400">{loc.reviewCount} reviews</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${loc.isSyncEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {loc.isSyncEnabled ? "Synced" : "Paused"}
                </span>
              </div>
            </div>
          ))}
          {!data?.locations?.length && !locations.length && (
            <div className="px-5 py-8 text-center text-gray-400">No locations connected yet. Connect your Google Business Profile to get started.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Reviews ──────────────────────────────────────────────────────────────────
function GbpReviews({ data, locationId, apiFetch, onRefresh }: any) {
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [selectedTone, setSelectedTone] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState<string | null>(null);
  const [replying, setReplying] = useState<string | null>(null);
  const [filter, setFilter] = useState("ALL");

  const reviews: any[] = data?.data || [];
  const stats = data?.stats || {};

  const generateAiReply = async (reviewId: string) => {
    setGenerating(reviewId);
    const tone = selectedTone[reviewId] || "professional";
    try {
      const result = await apiFetch(`/api/v1/gbp/locations/${locationId}/reviews/${reviewId}/ai-reply`, { method: "POST", body: JSON.stringify({ tone }) });
      setReplyText((prev) => ({ ...prev, [reviewId]: result.suggestedReply }));
    } catch (e) { console.error(e); }
    finally { setGenerating(null); }
  };

  const submitReply = async (reviewId: string) => {
    if (!replyText[reviewId]?.trim()) return;
    setReplying(reviewId);
    try {
      await apiFetch(`/api/v1/gbp/locations/${locationId}/reviews/${reviewId}/reply`, { method: "POST", body: JSON.stringify({ replyComment: replyText[reviewId] }) });
      setReplyText((prev) => { const n = { ...prev }; delete n[reviewId]; return n; });
    } catch (e) { console.error(e); }
    finally { setReplying(null); }
  };

  const filtered = filter === "ALL" ? reviews : filter === "REPLIED" ? reviews.filter((r) => r.replyComment) : reviews.filter((r) => !r.replyComment);

  return (
    <div className="space-y-5">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Reviews", value: stats.total || 0 },
          { label: "Responded", value: stats.responded || 0 },
          { label: "Response Rate", value: `${stats.responseRate || 0}%` },
          { label: "Avg Rating", value: `${stats.avgRating || 0} ⭐` },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <div className="text-xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["ALL", "REPLIED", "PENDING"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === f ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-500"}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Review List */}
      <div className="space-y-3">
        {filtered.length === 0 && <div className="text-center py-10 text-gray-400">No reviews to show.</div>}
        {filtered.map((review: any) => (
          <div key={review.id} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
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
            <p className="text-sm text-gray-700">{review.comment || "No comment"}</p>

            {review.replyComment && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm">
                <span className="font-semibold text-blue-700">Your Reply: </span>
                <span className="text-blue-800">{review.replyComment}</span>
              </div>
            )}

            {!review.replyComment && (
              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={replyText[review.id] || ""}
                  onChange={(e) => setReplyText((prev) => ({ ...prev, [review.id]: e.target.value }))}
                  placeholder="Write a reply…"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTone[review.id] || "professional"}
                    onChange={(e) => setSelectedTone((prev) => ({ ...prev, [review.id]: e.target.value }))}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="apologetic">Apologetic</option>
                    <option value="enthusiastic">Enthusiastic</option>
                  </select>
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
      </div>
    </div>
  );
}

// ─── GBP Posts ────────────────────────────────────────────────────────────────
function GbpPosts({ data, locationId, apiFetch }: any) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ topicType: "STANDARD", summary: "", callToAction: "", callToActionUrl: "", photoUrl: "", eventTitle: "", scheduledAt: "" });
  const [saving, setSaving] = useState(false);
  const posts: any[] = data?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/api/v1/gbp/locations/${locationId}/posts`, { method: "POST", body: JSON.stringify(form) });
      setCreating(false);
      setForm({ topicType: "STANDARD", summary: "", callToAction: "", callToActionUrl: "", photoUrl: "", eventTitle: "", scheduledAt: "" });
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">GBP Posts ({posts.length})</h2>
        <button onClick={() => setCreating(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700">+ New Post</button>
      </div>

      {creating && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <form onSubmit={handleCreate} className="space-y-3">
            <select value={form.topicType} onChange={(e) => setForm({ ...form, topicType: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
              {["STANDARD", "EVENT", "OFFER", "ALERT"].map((t) => <option key={t}>{t}</option>)}
            </select>
            <textarea required rows={4} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="Post content / summary *" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.callToAction} onChange={(e) => setForm({ ...form, callToAction: e.target.value })} placeholder="CTA (e.g. LEARN_MORE)" className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
              <input value={form.callToActionUrl} onChange={(e) => setForm({ ...form, callToActionUrl: e.target.value })} placeholder="CTA URL" className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            <input value={form.photoUrl} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} placeholder="Photo URL (optional)" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl disabled:opacity-50">{saving ? "Saving…" : "Create Post"}</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {posts.map((post: any) => (
          <div key={post.id} className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">{post.topicType}</span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${post.status === "PUBLISHED" ? "bg-green-100 text-green-700" : post.status === "SCHEDULED" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>{post.status}</span>
            </div>
            <p className="text-sm text-gray-700 mt-2 line-clamp-3">{post.summary}</p>
            {post.photoUrl && <img src={post.photoUrl} alt="" className="mt-3 w-full h-32 object-cover rounded-xl" />}
            {post.callToAction && <div className="mt-3 text-xs text-blue-600 font-medium">{post.callToAction} →</div>}
          </div>
        ))}
        {posts.length === 0 && <div className="col-span-2 text-center py-10 text-gray-400">No GBP posts yet. Create your first post!</div>}
      </div>
    </div>
  );
}

// ─── Products ─────────────────────────────────────────────────────────────────
function GbpProducts({ data, locationId, apiFetch }: any) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", imageUrl: "", landingPage: "" });
  const [saving, setSaving] = useState(false);
  const products: any[] = data?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/api/v1/gbp/locations/${locationId}/products`, { method: "POST", body: JSON.stringify({ ...form, price: form.price ? parseFloat(form.price) : undefined }) });
      setCreating(false);
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Products ({products.length})</h2>
        <button onClick={() => setCreating(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700">+ Add Product</button>
      </div>
      {creating && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name *" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price (USD)" type="number" className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="Image URL" className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          </div>
          <input value={form.landingPage} onChange={(e) => setForm({ ...form, landingPage: e.target.value })} placeholder="Landing Page URL" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl">{saving ? "Saving…" : "Add Product"}</button>
          </div>
        </form>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {products.map((p: any) => (
          <div key={p.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-full h-40 object-cover" />}
            <div className="p-4">
              <div className="font-semibold text-gray-900">{p.name}</div>
              {p.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.description}</p>}
              {p.price && <div className="mt-2 text-sm font-medium text-green-600">${p.price}</div>}
            </div>
          </div>
        ))}
        {!products.length && <div className="col-span-3 text-center py-10 text-gray-400">No products added yet.</div>}
      </div>
    </div>
  );
}

// ─── Services ─────────────────────────────────────────────────────────────────
function GbpServices({ data, locationId, apiFetch }: any) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "" });
  const [saving, setSaving] = useState(false);
  const services: any[] = data?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/api/v1/gbp/locations/${locationId}/services`, { method: "POST", body: JSON.stringify({ ...form, price: form.price ? parseFloat(form.price) : undefined }) });
      setCreating(false);
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Services ({services.length})</h2>
        <button onClick={() => setCreating(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm">+ Add Service</button>
      </div>
      {creating && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Service name *" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none" />
          <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price (optional)" type="number" className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl">{saving ? "Saving…" : "Add"}</button>
          </div>
        </form>
      )}
      <div className="bg-white border border-gray-200 rounded-2xl divide-y">
        {services.map((s: any) => (
          <div key={s.id} className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="font-medium text-gray-900">{s.name}</div>
              {s.description && <div className="text-sm text-gray-400">{s.description}</div>}
            </div>
            {s.price && <span className="text-sm font-semibold text-green-600">${s.price}</span>}
          </div>
        ))}
        {!services.length && <div className="px-5 py-8 text-center text-gray-400">No services added yet.</div>}
      </div>
    </div>
  );
}

// ─── Media ────────────────────────────────────────────────────────────────────
function GbpMedia({ data, locationId, apiFetch }: any) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ sourceUrl: "", category: "ADDITIONAL", mediaFormat: "PHOTO", description: "" });
  const [saving, setSaving] = useState(false);
  const media: any[] = data?.data || [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/api/v1/gbp/locations/${locationId}/media`, { method: "POST", body: JSON.stringify(form) });
      setAdding(false);
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleDelete = async (mid: string) => {
    if (!confirm("Delete this media?")) return;
    await apiFetch(`/api/v1/gbp/locations/${locationId}/media/${mid}`, { method: "DELETE" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Media Gallery ({media.length})</h2>
        <button onClick={() => setAdding(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm">+ Upload Media</button>
      </div>
      {adding && (
        <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
          <input required value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="Photo/Video URL *" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.mediaFormat} onChange={(e) => setForm({ ...form, mediaFormat: e.target.value })} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
              <option value="PHOTO">Photo</option>
              <option value="VIDEO">Video</option>
            </select>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
              {["EXTERIOR", "INTERIOR", "PRODUCT", "AT_WORK", "FOOD_AND_DRINK", "MENU", "ADDITIONAL"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setAdding(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl">{saving ? "Saving…" : "Add"}</button>
          </div>
        </form>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {media.map((m: any) => (
          <div key={m.id} className="relative group rounded-2xl overflow-hidden bg-gray-100 aspect-square">
            <img src={m.sourceUrl} alt={m.description || ""} className="w-full h-full object-cover" onError={(e) => { (e.target as any).src = "https://placehold.co/200x200?text=Media"; }} />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
              <div className="text-white text-xs flex-1 line-clamp-1">{m.category}</div>
              <button onClick={() => handleDelete(m.id)} className="text-red-400 hover:text-red-300 text-xs ml-2">✕</button>
            </div>
          </div>
        ))}
        {!media.length && <div className="col-span-4 text-center py-10 text-gray-400">No media uploaded yet.</div>}
      </div>
    </div>
  );
}

// ─── Q&A ──────────────────────────────────────────────────────────────────────
function GbpQA({ data, locationId, apiFetch }: any) {
  const [answerText, setAnswerText] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const questions: any[] = data?.data || [];

  const submitAnswer = async (qid: string) => {
    const text = answerText[qid]?.trim();
    if (!text) return;
    setSubmitting(qid);
    try {
      await apiFetch(`/api/v1/gbp/locations/${locationId}/questions/${qid}/answer`, { method: "POST", body: JSON.stringify({ text }) });
      setAnswerText((prev) => { const n = { ...prev }; delete n[qid]; return n; });
    } catch (e) { console.error(e); } finally { setSubmitting(null); }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-gray-900">Customer Q&A ({questions.length})</h2>
      <div className="space-y-3">
        {questions.map((q: any) => (
          <div key={q.id} className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl">❓</span>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{q.text}</div>
                <div className="text-xs text-gray-400 mt-1">{q.authorName || "Anonymous"} · 👍 {q.upvoteCount}</div>
                {q.answers?.map((a: any) => (
                  <div key={a.id} className={`mt-3 p-3 rounded-xl text-sm ${a.isOwnerAnswer ? "bg-green-50 border border-green-100" : "bg-gray-50"}`}>
                    <span className={`font-semibold mr-1 ${a.isOwnerAnswer ? "text-green-700" : "text-gray-600"}`}>{a.isOwnerAnswer ? "Owner" : a.authorName}:</span>
                    {a.text}
                  </div>
                ))}
                {!q.answers?.some((a: any) => a.isOwnerAnswer) && (
                  <div className="mt-3 flex gap-2">
                    <input value={answerText[q.id] || ""} onChange={(e) => setAnswerText((p) => ({ ...p, [q.id]: e.target.value }))}
                      placeholder="Write your answer…" className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    <button onClick={() => submitAnswer(q.id)} disabled={submitting === q.id || !answerText[q.id]}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm disabled:opacity-50">{submitting === q.id ? "…" : "Answer"}</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {!questions.length && <div className="text-center py-10 text-gray-400">No customer questions yet.</div>}
      </div>
    </div>
  );
}

// ─── Messages ─────────────────────────────────────────────────────────────────
function GbpMessages({ data, locationId, apiFetch }: any) {
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replying, setReplying] = useState<string | null>(null);
  const messages: any[] = data?.data || [];

  const submitReply = async (mid: string) => {
    if (!replyText[mid]?.trim()) return;
    setReplying(mid);
    try {
      await apiFetch(`/api/v1/gbp/locations/${locationId}/messages/${mid}/reply`, { method: "POST", body: JSON.stringify({ replyText: replyText[mid] }) });
      setReplyText((prev) => { const n = { ...prev }; delete n[mid]; return n; });
    } catch (e) { console.error(e); } finally { setReplying(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="font-semibold text-gray-900">Customer Messages ({messages.length})</h2>
        {data?.unreadCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">{data.unreadCount} new</span>}
      </div>
      <div className="space-y-3">
        {messages.map((msg: any) => (
          <div key={msg.id} className={`bg-white border rounded-2xl p-5 ${!msg.isRead ? "border-blue-300 bg-blue-50/30" : "border-gray-200"}`}>
            <div className="flex items-start justify-between">
              <div className="font-medium text-gray-900">{msg.customerName || msg.customerPhone || "Customer"}</div>
              <span className="text-xs text-gray-400">{msg.createTime ? new Date(msg.createTime).toLocaleDateString() : ""}</span>
            </div>
            <p className="mt-2 text-sm text-gray-700">{msg.messageText}</p>
            {msg.replyText ? (
              <div className="mt-3 bg-green-50 border border-green-100 rounded-xl p-3 text-sm">
                <span className="font-semibold text-green-700">Replied: </span>{msg.replyText}
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <input value={replyText[msg.id] || ""} onChange={(e) => setReplyText((p) => ({ ...p, [msg.id]: e.target.value }))}
                  placeholder="Write a reply…" className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <button onClick={() => submitReply(msg.id)} disabled={replying === msg.id || !replyText[msg.id]}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm disabled:opacity-50">{replying === msg.id ? "…" : "Reply"}</button>
              </div>
            )}
          </div>
        ))}
        {!messages.length && <div className="text-center py-10 text-gray-400">No messages yet.</div>}
      </div>
    </div>
  );
}

// ─── Insights ─────────────────────────────────────────────────────────────────
function GbpInsights({ data }: { data: any }) {
  const insights: any[] = data?.data || [];
  const totals = data?.totals || {};

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Impressions", value: totals.businessImpressions || 0, icon: "👁️" },
          { label: "Calls", value: totals.callClicks || 0, icon: "📞" },
          { label: "Website Clicks", value: totals.websiteClicks || 0, icon: "🌐" },
          { label: "Directions", value: totals.directionRequests || 0, icon: "🗺️" },
          { label: "Photo Views", value: totals.photoViewCount || 0, icon: "📸" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <div className="text-xl mb-1">{stat.icon}</div>
            <div className="text-xl font-bold text-gray-900">{stat.value.toLocaleString()}</div>
            <div className="text-xs text-gray-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Simple sparkline chart using CSS */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Daily Impressions (30 days)</h3>
        <div className="flex items-end gap-1 h-24">
          {insights.slice(-30).map((d: any, i: number) => {
            const maxVal = Math.max(...insights.map((x: any) => x.businessImpressions), 1);
            const h = Math.max(4, (d.businessImpressions / maxVal) * 100);
            return (
              <div key={i} title={`${new Date(d.date).toLocaleDateString()}: ${d.businessImpressions}`}
                className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                style={{ height: `${h}%` }} />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>30 days ago</span>
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}

// ─── Automation ───────────────────────────────────────────────────────────────
function GbpAutomation({ data, apiFetch }: any) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", triggerType: "REVIEW_RATING_HIGH", actionType: "REPLY_REVIEW_AI", description: "" });
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const rules: any[] = data?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/v1/automation", { method: "POST", body: JSON.stringify({ ...form, triggerConditions: {}, actionConfig: {} }) });
      setCreating(false);
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const toggle = async (id: string) => {
    setToggling(id);
    try { await apiFetch(`/api/v1/automation/${id}/toggle`, { method: "PATCH" }); }
    catch (e) { console.error(e); } finally { setToggling(null); }
  };

  const testRun = async (id: string) => {
    try {
      const result = await apiFetch(`/api/v1/automation/${id}/test`, { method: "POST" });
      alert(`Test Result: ${result.message}`);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Automation Rules ({rules.length})</h2>
        <button onClick={() => setCreating(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm">+ New Rule</button>
      </div>
      {creating && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Rule name *" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Trigger</label>
              <select value={form.triggerType} onChange={(e) => setForm({ ...form, triggerType: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
                {["REVIEW_CREATED", "REVIEW_RATING_LOW", "REVIEW_RATING_HIGH", "NEW_LEAD", "SCORE_DROP"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Action</label>
              <select value={form.actionType} onChange={(e) => setForm({ ...form, actionType: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
                {["REPLY_REVIEW_AI", "POST_TO_SOCIAL", "SEND_EMAIL", "CREATE_TICKET", "WEBHOOK"].map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl">{saving ? "Saving…" : "Create Rule"}</button>
          </div>
        </form>
      )}
      <div className="space-y-3">
        {rules.map((rule: any) => (
          <div key={rule.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{rule.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rule.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{rule.isActive ? "Active" : "Paused"}</span>
              </div>
              <div className="text-sm text-gray-400 mt-1">
                <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs">{rule.triggerType}</span>
                <span className="mx-2">→</span>
                <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-xs">{rule.actionType}</span>
              </div>
              {rule.lastRunAt && <div className="text-xs text-gray-400 mt-1">Last run: {new Date(rule.lastRunAt).toLocaleString()} · {rule.runCount} runs</div>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => testRun(rule.id)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Test</button>
              <button onClick={() => toggle(rule.id)} disabled={toggling === rule.id}
                className={`text-xs px-3 py-1.5 rounded-lg ${rule.isActive ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}>
                {toggling === rule.id ? "…" : rule.isActive ? "Pause" : "Enable"}
              </button>
            </div>
          </div>
        ))}
        {!rules.length && (
          <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
            <div className="text-4xl mb-3">⚡</div>
            <p>No automation rules yet. Create your first rule to automate review replies, social posts, and more.</p>
          </div>
        )}
      </div>
    </div>
  );
}
