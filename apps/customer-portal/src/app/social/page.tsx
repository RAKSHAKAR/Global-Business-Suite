"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../AuthContext";
import DashboardLayout from "@/components/DashboardLayout";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const PLATFORMS = [
  { id: "GOOGLE_BUSINESS", label: "Google Business", icon: "🏪" },
  { id: "FACEBOOK",        label: "Facebook",         icon: "👍" },
  { id: "INSTAGRAM",       label: "Instagram",        icon: "📸" },
  { id: "LINKEDIN",        label: "LinkedIn",         icon: "💼" },
  { id: "TWITTER_X",       label: "X / Twitter",      icon: "🐦" },
  { id: "PINTEREST",       label: "Pinterest",        icon: "📌" },
  { id: "TIKTOK",          label: "TikTok",           icon: "🎵" },
  { id: "THREADS",         label: "Threads",          icon: "🧵" },
  { id: "YOUTUBE",         label: "YouTube",          icon: "▶️" },
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     "bg-gray-100 text-gray-600",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800",
  SCHEDULED: "bg-blue-100 text-blue-700",
  PUBLISHED: "bg-green-100 text-green-700",
  FAILED:    "bg-red-100 text-red-600",
};

type Tab = "composer" | "posts" | "channels";

export default function CustomerSocialPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>("composer");
  const [posts, setPosts] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([""]);
  const [hashtags, setHashtags] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiBrief, setAiBrief] = useState("");
  const [aiFeedback, setAiFeedback] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [generatedPostId, setGeneratedPostId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  const apiFetch = useCallback(async (path: string, opts?: RequestInit) => {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(opts?.headers || {}) },
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
  }, [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [postsData, channelsData] = await Promise.all([
        apiFetch("/api/v1/social/posts"),
        apiFetch("/api/v1/social/channels"),
      ]);
      setPosts(postsData.data || []);
      setChannels(channelsData.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, apiFetch]);

  useEffect(() => { load(); }, [load]);

  const togglePlatform = (p: string) =>
    setSelectedPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  const handleGenerate = async () => {
    const topic = aiBrief.trim() || content.trim();
    if (!topic) { setSaveErr("Enter a campaign brief first"); return; }
    if (selectedPlatforms.length === 0) { setSaveErr("Select at least one platform"); return; }
    setAiLoading(true); setSaveErr(""); setSuccessMessage("");
    try {
      const result = await apiFetch("/api/v1/social/ai/content-package", {
        method: "POST",
        body: JSON.stringify({
          topic,
          platforms: selectedPlatforms,
          tone: "friendly and professional",
          imageStyle: "authentic local business campaign photography",
          aspectRatio: selectedPlatforms.includes("INSTAGRAM") ? "1:1" : "16:9",
          feedback: aiFeedback.trim() || undefined,
          revisionOfPostId: generatedPostId || undefined,
          scheduledAt: scheduledAt || undefined,
        }),
      });
      setContent(result.post.content);
      setImageUrls(JSON.parse(result.post.imageUrls || "[]"));
      setHashtags(JSON.parse(result.post.hashtags || "[]").join(" "));
      setGeneratedPostId(result.post.id);
      setAiFeedback("");
      setSuccessMessage("Text and image generated together and submitted for approval.");
      await load();
    } catch (e: any) { setSaveErr(e.message); }
    finally { setAiLoading(false); }
  };

  const handleSave = async () => {
    if (!content.trim()) { setSaveErr("Content is required"); return; }
    if (selectedPlatforms.length === 0) { setSaveErr("Select at least one platform"); return; }
    setSaving(true); setSaveErr("");
    try {
      await apiFetch(generatedPostId ? `/api/v1/social/posts/${generatedPostId}` : "/api/v1/social/posts", {
        method: generatedPostId ? "PUT" : "POST",
        body: JSON.stringify({
          content, platforms: selectedPlatforms,
          imageUrls: imageUrls.filter(Boolean),
          hashtags: hashtags.split(/[,\s]+/).filter(Boolean),
          scheduledAt: scheduledAt || undefined,
        }),
      });
      setSuccessMessage("Post submitted for approval. It cannot publish before approval.");
      setContent(""); setHashtags(""); setScheduledAt(""); setImageUrls([""]); setPublishing(null);
      setAiBrief(""); setAiFeedback(""); setGeneratedPostId(null);
      await load(); setTab("posts");
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); setPublishing(null); }
  };

  const handlePublish = async (postId: string) => {
    setPublishing(postId);
    try { await apiFetch(`/api/v1/social/posts/${postId}/publish`, { method: "POST" }); await load(); }
    catch (e: any) { setSaveErr(e.message); } finally { setPublishing(null); }
  };

  const handleApproval = async (postId: string, action: "approve" | "reject") => {
    try {
      const reason = action === "reject" ? window.prompt("Why is this post being rejected?") : undefined;
      if (action === "reject" && reason === null) return;
      await apiFetch(`/api/v1/social/posts/${postId}/${action}`, {
        method: "POST",
        body: JSON.stringify(action === "reject" ? { reason } : { comments: "Text and image reviewed together." }),
      });
      setSuccessMessage(action === "approve" ? "Post approved and ready to publish." : "Post returned for revision.");
      await load();
    } catch (e: any) { setSaveErr(e.message); }
  };

  const connectChannel = async (platform: string) => {
    try {
      const { url } = await apiFetch(platform === "GOOGLE_BUSINESS" ? "/api/v1/google/auth" : `/api/v1/social/channels/oauth-url/${platform}`);
      const popup = window.open(url, "connect", "width=600,height=700");
      const handler = (e: MessageEvent) => {
        if (e.data?.type === "SOCIAL_CHANNEL_CONNECTED") {
          load(); window.removeEventListener("message", handler); popup?.close();
        }
      };
      window.addEventListener("message", handler);
      const poll = window.setInterval(() => {
        if (popup?.closed) {
          window.clearInterval(poll);
          window.removeEventListener("message", handler);
          void load();
        }
      }, 750);
    } catch (e: any) { setSaveErr(e.message); }
  };

  const connectedPlatforms = new Set(channels.map((c) => c.platform));

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📢 Social Media</h1>
            <p className="text-sm text-gray-400 mt-0.5">{channels.length} channels connected · {posts.length} posts</p>
          </div>
        </div>

        {saveErr && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{saveErr}</p>}
        {successMessage && <p role="status" className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">{successMessage}</p>}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 pb-px">
          {(["composer", "posts", "channels"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium capitalize transition-colors
                ${tab === t ? "bg-white border border-b-white border-gray-200 text-gray-900 -mb-px" : "text-gray-500 hover:text-gray-700"}`}>
              {t === "composer" ? "✍️ Create Post" : t === "posts" ? "📋 My Posts" : "🔗 Channels"}
            </button>
          ))}
        </div>

        {/* COMPOSER */}
        {tab === "composer" && (
          <div className="max-w-2xl space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Select Platforms</p>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => {
                  const connected = connectedPlatforms.has(p.id);
                  const selected = selectedPlatforms.includes(p.id);
                  return (
                    <button key={p.id} onClick={() => togglePlatform(p.id)} disabled={!connected}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all
                        ${selected ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-500 hover:border-gray-400"}
                        ${!connected ? "opacity-40 cursor-not-allowed" : ""}`}>
                      {p.icon} {p.label.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
              {connectedPlatforms.size === 0 && (
                <p className="text-xs text-amber-500 mt-2">Go to Channels tab to connect your social accounts.</p>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Campaign brief for AI</label>
                  <button onClick={handleGenerate} disabled={aiLoading} className="text-xs font-semibold text-blue-700 disabled:opacity-50">
                    {aiLoading ? "Generating text + image…" : generatedPostId ? "Regenerate text + image" : "Generate text + image"}
                  </button>
                </div>
                <textarea rows={3} value={aiBrief} onChange={(e) => setAiBrief(e.target.value)}
                  placeholder="Describe the offer, audience, tone, and call to action."
                  className="mt-1.5 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/20" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Post Content *</label>
                <textarea rows={5} value={content} onChange={(e) => setContent(e.target.value)}
                  placeholder="What would you like to share?"
                  className="mt-1.5 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/20" />
              </div>
              {generatedPostId && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Revision feedback</label>
                  <div className="mt-1.5 flex gap-2">
                    <input value={aiFeedback} onChange={(e) => setAiFeedback(e.target.value)} placeholder="Use a shorter caption and warmer image"
                      className="min-w-0 flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                    <button onClick={handleGenerate} disabled={aiLoading || !aiFeedback.trim()} className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Apply</button>
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Image URL</label>
                <input value={imageUrls[0]} onChange={(e) => setImageUrls([e.target.value])}
                  placeholder="https://…" className="mt-1.5 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                {imageUrls[0] && <img src={imageUrls[0]} alt="Generated post preview" className="mt-3 aspect-square w-full rounded-xl object-cover" />}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Hashtags</label>
                  <input value={hashtags} onChange={(e) => setHashtags(e.target.value)}
                    placeholder="#yourbusiness" className="mt-1.5 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Schedule</label>
                  <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
                    className="mt-1.5 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 border-2 border-gray-900 text-gray-900 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
                  {saving ? "Submitting…" : generatedPostId ? "Save changes & keep pending" : "Submit for approval"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* POSTS */}
        {tab === "posts" && (
          <div className="space-y-3">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-gray-200" />
              ))
            ) : posts.length === 0 ? (
              <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                <div className="text-4xl mb-3">📢</div>
                <p>Create your first social post from the Composer tab!</p>
              </div>
            ) : (
              posts.map((post) => {
                const plats: string[] = JSON.parse(post.platforms || "[]");
                return (
                  <div key={post.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                      <div className="flex gap-1">
                        {plats.map((p) => (
                          <span key={p}>{PLATFORMS.find((pl) => pl.id === p)?.icon || "📱"}</span>
                        ))}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[post.status] || "bg-gray-100 text-gray-500"}`}>
                        {post.status}
                      </span>
                    </div>
                    <div className="px-5 py-3">
                      <p className="text-sm text-gray-800 line-clamp-2">{post.content}</p>
                    </div>
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
                      <span className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleDateString()}</span>
                      <div className="flex items-center gap-2">
                      {post.approvalStatus === "PENDING" && (
                        <>
                          <button onClick={() => handleApproval(post.id, "reject")} className="text-xs font-bold text-red-600 hover:text-red-800">Reject</button>
                          <button onClick={() => handleApproval(post.id, "approve")} className="text-xs font-bold text-emerald-600 hover:text-emerald-800">Approve</button>
                        </>
                      )}
                      {post.approvalStatus === "APPROVED" && !["PUBLISHED", "PUBLISHING"].includes(post.status) && (
                        <button onClick={() => handlePublish(post.id)} disabled={publishing === post.id}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 disabled:opacity-50">
                          {publishing === post.id ? "Publishing…" : "Publish approved post"}
                        </button>
                      )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* CHANNELS */}
        {tab === "channels" && (
          <div className="space-y-3 max-w-2xl">
            {PLATFORMS.map((platform) => {
              const connected = channels.find((c) => c.platform === platform.id);
              return (
                <div key={platform.id}
                  className={`bg-white border rounded-2xl p-4 flex items-center justify-between ${connected ? "border-green-300" : "border-gray-200"}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{platform.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900">{platform.label}</div>
                      {connected ? (
                        <div className="text-xs text-green-600">✓ {connected.accountName}</div>
                      ) : (
                        <div className="text-xs text-gray-400">Not connected</div>
                      )}
                    </div>
                  </div>
                  {!connected ? (
                    <button onClick={() => connectChannel(platform.id)}
                      className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-xl hover:bg-gray-700">
                      Connect
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
