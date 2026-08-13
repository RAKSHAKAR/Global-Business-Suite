"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Platform =
  | "GOOGLE_BUSINESS"
  | "FACEBOOK"
  | "INSTAGRAM"
  | "LINKEDIN"
  | "TWITTER_X"
  | "PINTEREST"
  | "TIKTOK"
  | "THREADS"
  | "YOUTUBE"
  | "REDDIT"
  | "TELEGRAM"
  | "WHATSAPP"
  | "SNAPCHAT";

const PLATFORMS: { id: Platform; label: string; icon: string; color: string; maxChars?: number }[] = [
  { id: "GOOGLE_BUSINESS", label: "Google Business", icon: "🏪", color: "bg-blue-500", maxChars: 1500 },
  { id: "FACEBOOK", label: "Facebook", icon: "👍", color: "bg-blue-600", maxChars: 63206 },
  { id: "INSTAGRAM", label: "Instagram", icon: "📸", color: "bg-pink-500", maxChars: 2200 },
  { id: "LINKEDIN", label: "LinkedIn", icon: "💼", color: "bg-blue-700", maxChars: 3000 },
  { id: "TWITTER_X", label: "X / Twitter", icon: "🐦", color: "bg-black", maxChars: 280 },
  { id: "PINTEREST", label: "Pinterest", icon: "📌", color: "bg-red-500" },
  { id: "TIKTOK", label: "TikTok", icon: "🎵", color: "bg-gray-900" },
  { id: "THREADS", label: "Threads", icon: "🧵", color: "bg-gray-800", maxChars: 500 },
  { id: "YOUTUBE", label: "YouTube", icon: "▶️", color: "bg-red-600" },
  { id: "REDDIT", label: "Reddit", icon: "🤖", color: "bg-orange-600", maxChars: 40000 },
  { id: "TELEGRAM", label: "Telegram", icon: "✈️", color: "bg-sky-500", maxChars: 4096 },
  { id: "WHATSAPP", label: "WhatsApp", icon: "💬", color: "bg-green-600", maxChars: 4096 },
  { id: "SNAPCHAT", label: "Snapchat", icon: "👻", color: "bg-yellow-400", maxChars: 250 },
];

type SocialPost = {
  id: string;
  content: string;
  platforms: string;
  postType: string;
  status: string;
  approvalStatus: string;
  imageUrls: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  platformResults: { platform: string; status: string; externalUrl?: string; error?: string }[];
};

type SocialChannel = {
  id: string;
  platform: Platform;
  accountName: string;
  accountAvatar?: string;
  isActive: boolean;
  healthStatus?: string;
  tokenExpiresAt?: string;
};

type Tab = "composer" | "posts" | "channels" | "inbox" | "listening" | "media" | "analytics";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800",
  SCHEDULED: "bg-blue-100 text-blue-700",
  PUBLISHING: "bg-yellow-100 text-yellow-700",
  PUBLISHED: "bg-green-100 text-green-700",
  PARTIALLY_PUBLISHED: "bg-orange-100 text-orange-700",
  FAILED: "bg-red-100 text-red-600",
};

export default function SocialPublisher() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>("composer");
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [channels, setChannels] = useState<SocialChannel[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [inboxThreads, setInboxThreads] = useState<any[]>([]);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Composer state
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("POST");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["GOOGLE_BUSINESS", "FACEBOOK", "INSTAGRAM"]);
  const [imageUrls, setImageUrls] = useState<string[]>([""]);
  const [videoUrl, setVideoUrl] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [utmSource, setUtmSource] = useState("gbs_social");
  const [utmMedium, setUtmMedium] = useState("social_post");
  const [utmCampaign, setUtmCampaign] = useState("brand_growth");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiBrief, setAiBrief] = useState("");
  const [aiFeedback, setAiFeedback] = useState("");
  const [generatedPostId, setGeneratedPostId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Listening & Inbox state
  const [newKeyword, setNewKeyword] = useState("");
  const [monitorName, setMonitorName] = useState("");

  const apiFetch = useCallback(async (path: string, opts?: RequestInit) => {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(opts?.headers || {}) },
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `HTTP ${res.status}`); }
    return res.json();
  }, [token]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [postsData, channelsData, analyticsData, inboxData, listeningData, mediaData] = await Promise.all([
        apiFetch("/api/v1/social/posts").catch(() => ({ data: [] })),
        apiFetch("/api/v1/social/channels").catch(() => ({ data: [] })),
        apiFetch("/api/v1/social/analytics").catch(() => null),
        apiFetch("/api/v1/social/engagement/inbox").catch(() => ({ data: [] })),
        apiFetch("/api/v1/social/listening/monitors").catch(() => ({ data: [] })),
        apiFetch("/api/v1/social/media").catch(() => ({ data: [] })),
      ]);
      setPosts(postsData.data || []);
      setChannels(channelsData.data || []);
      setAnalytics(analyticsData);
      setInboxThreads(inboxData.data || []);
      setMonitors(listeningData.data || []);
      setMediaAssets(mediaData.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, apiFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const handleAiGeneratePackage = async () => {
    const topic = aiBrief.trim() || content.trim();
    if (!topic) { setSaveErr("Enter a campaign brief or topic first"); return; }
    if (selectedPlatforms.length === 0) { setSaveErr("Select at least one platform"); return; }
    setAiLoading(true);
    setSaveErr("");
    setSuccessMessage("");
    try {
      const res = await apiFetch("/api/v1/social/ai/content-package", {
        method: "POST",
        body: JSON.stringify({
          topic,
          platforms: selectedPlatforms,
          tone: "professional and engaging",
          imageStyle: "polished commercial social campaign",
          aspectRatio: selectedPlatforms.includes("INSTAGRAM") ? "1:1" : "16:9",
          imageSize: "1K",
          feedback: aiFeedback.trim() || undefined,
          revisionOfPostId: generatedPostId || undefined,
          scheduledAt: scheduledAt || undefined,
        }),
      });
      const imageList = JSON.parse(res.post.imageUrls || "[]");
      const tagList = JSON.parse(res.post.hashtags || "[]");
      setContent(res.post.content);
      setImageUrls(imageList.length ? imageList : [res.media.fileUrl]);
      setHashtags(tagList.join(" "));
      setGeneratedPostId(res.post.id);
      setAiFeedback("");
      setSuccessMessage("Copy and image generated together and submitted for approval. Review the preview before approving it.");
      await loadData();
    } catch (e: any) { setSaveErr(e.message); }
    finally { setAiLoading(false); }
  };

  const handleCreatePost = async () => {
    if (!content.trim()) { setSaveErr("Content is required"); return; }
    if (selectedPlatforms.length === 0) { setSaveErr("Select at least one platform"); return; }
    setSaving(true);
    setSaveErr("");
    try {
      await apiFetch(generatedPostId ? `/api/v1/social/posts/${generatedPostId}` : "/api/v1/social/posts", {
        method: generatedPostId ? "PUT" : "POST",
        body: JSON.stringify({
          content,
          postType,
          platforms: selectedPlatforms,
          imageUrls: imageUrls.filter(Boolean),
          videoUrl: videoUrl || undefined,
          hashtags: hashtags.split(/[,\s]+/).filter(Boolean).map((h) => h.replace(/^#/, "")),
          linkUrl: linkUrl || undefined,
          utmParams: { source: utmSource, medium: utmMedium, campaign: utmCampaign },
          scheduledAt: scheduledAt || undefined,
        }),
      });

      setSuccessMessage("Post submitted for approval. Publishing remains locked until it is approved.");
      setContent(""); setHashtags(""); setLinkUrl(""); setScheduledAt(""); setImageUrls([""]); setVideoUrl("");
      setAiBrief(""); setAiFeedback(""); setGeneratedPostId(null);
      await loadData();
      setTab("posts");
    } catch (e: any) { setSaveErr(e.message); }
    finally { setSaving(false); setPublishing(null); }
  };

  const handlePublishNow = async (postId: string) => {
    setPublishing(postId);
    try {
      await apiFetch(`/api/v1/social/posts/${postId}/publish`, { method: "POST" });
      await loadData();
    } catch (e: any) { setSaveErr(e.message); }
    finally { setPublishing(null); }
  };

  const handleApproval = async (postId: string, action: "approve" | "reject") => {
    setSaveErr("");
    try {
      const reason = action === "reject" ? window.prompt("Why is this post being rejected?") : undefined;
      if (action === "reject" && reason === null) return;
      await apiFetch(`/api/v1/social/posts/${postId}/${action}`, {
        method: "POST",
        body: JSON.stringify(action === "reject" ? { reason } : { comments: "Copy and image reviewed together." }),
      });
      setSuccessMessage(action === "approve" ? "Post approved. It is now eligible to publish." : "Post rejected and returned for revision.");
      await loadData();
    } catch (e: any) {
      setSaveErr(e.message);
    }
  };

  const handleCreateMonitor = async () => {
    if (!monitorName || !newKeyword) return;
    try {
      await apiFetch("/api/v1/social/listening/monitors", {
        method: "POST",
        body: JSON.stringify({
          name: monitorName,
          keywords: newKeyword.split(",").map((k) => k.trim()),
        }),
      });
      setMonitorName(""); setNewKeyword("");
      await loadData();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            📢 Enterprise Social Media Suite
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Publish, schedule, engage, and monitor across 13+ social networks with AI Content Studio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadData()} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200">
            🔄 Refresh
          </button>
          <button onClick={() => setTab("composer")} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium">
            + New Post
          </button>
        </div>
      </div>

      {saveErr && <div role="alert" className="p-3 bg-red-100 text-red-700 text-sm rounded">{saveErr}</div>}
      {successMessage && <div role="status" className="p-3 bg-emerald-100 text-emerald-800 text-sm rounded">{successMessage}</div>}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 space-x-6 overflow-x-auto">
        {[
          { id: "composer", label: "✏️ Composer & AI Studio" },
          { id: "posts", label: `📦 Posts (${posts.length})` },
          { id: "channels", label: `🌐 Channels (${channels.length})` },
          { id: "inbox", label: `📥 Unified Inbox (${inboxThreads.length})` },
          { id: "listening", label: `👂 Social Listening (${monitors.length})` },
          { id: "media", label: `📁 Media Library (${mediaAssets.length})` },
          { id: "analytics", label: "📊 Analytics & ROI" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.id
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* COMPOSER TAB */}
      {tab === "composer" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 space-y-5">
            {/* Target Platforms */}
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">Select Target Platforms</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => {
                  const isSelected = selectedPlatforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition ${
                        isSelected
                          ? "bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                          : "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 opacity-60"
                      }`}
                    >
                      <span>{p.icon}</span>
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Post Type Selector */}
            <div className="flex gap-2">
              {["POST", "REEL", "STORY", "SHORT", "CAROUSEL", "ANNOUNCEMENT"].map((pt) => (
                <button
                  key={pt}
                  onClick={() => setPostType(pt)}
                  className={`px-2.5 py-1 text-xs rounded border ${
                    postType === pt ? "bg-gray-900 text-white font-bold" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {pt}
                </button>
              ))}
            </div>

            {/* Content Textarea & AI Trigger */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-gray-500">Campaign Brief for AI</label>
              <textarea
                value={aiBrief}
                onChange={(e) => setAiBrief(e.target.value)}
                rows={3}
                placeholder="Example: Announce our weekend family brunch, highlight outdoor seating, and invite reservations."
                className="w-full p-3 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
              />
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold uppercase text-gray-500">Post Content</label>
                <button
                  onClick={handleAiGeneratePackage}
                  disabled={aiLoading}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                >
                  {aiLoading ? "Generating text + image..." : generatedPostId ? "Regenerate text + image" : "Generate text + image"}
                </button>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                placeholder="Write your post content or enter keywords for AI generation..."
                className="w-full p-3 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
              />
            </div>

            {generatedPostId && (
              <div className="space-y-2 rounded-lg border border-indigo-200 bg-indigo-50/70 p-3 dark:border-indigo-900 dark:bg-indigo-950/30">
                <label className="text-xs font-semibold uppercase text-indigo-700 dark:text-indigo-300">Revision feedback</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={aiFeedback}
                    onChange={(e) => setAiFeedback(e.target.value)}
                    placeholder="Example: use warmer colors and a shorter caption"
                    className="min-w-0 flex-1 rounded-lg border border-indigo-200 bg-white p-2 text-xs text-gray-900 dark:border-indigo-800 dark:bg-gray-900 dark:text-white"
                  />
                  <button onClick={handleAiGeneratePackage} disabled={aiLoading || !aiFeedback.trim()} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                    Apply feedback
                  </button>
                </div>
              </div>
            )}

            {/* Media URLs & UTM Builder */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500">Image URL</label>
                <input
                  type="text"
                  value={imageUrls[0] || ""}
                  onChange={(e) => setImageUrls([e.target.value])}
                  placeholder="https://example.com/image.jpg"
                  className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-gray-800 border rounded text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Link URL</label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://mywebsite.com/promo"
                  className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-gray-800 border rounded text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Schedule Picker */}
            <div>
              <label className="text-xs font-semibold text-gray-500">Schedule Date & Time (Optional)</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-gray-800 border rounded text-gray-900 dark:text-white"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={handleCreatePost}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {saving ? "Submitting..." : generatedPostId ? "Save changes & keep pending" : "Submit for approval"}
              </button>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4">
            <h3 className="text-xs font-bold uppercase text-gray-500">Cross-Platform Preview</h3>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs">
                  GBS
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900 dark:text-white">Your Business Name</div>
                  <div className="text-[10px] text-gray-500">Just now • {selectedPlatforms.join(", ")}</div>
                </div>
              </div>
              <p className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {content || "Your post preview will appear here..."}
              </p>
              {imageUrls[0] && (
                <img src={imageUrls[0]} alt="Preview" className="w-full h-36 object-cover rounded-md" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* POSTS TAB */}
      {tab === "posts" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <table className="w-full text-left text-xs text-gray-600 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-800 uppercase font-semibold text-gray-500">
              <tr>
                <th className="p-3">Content</th>
                <th className="p-3">Type</th>
                <th className="p-3">Platforms</th>
                <th className="p-3">Status</th>
                <th className="p-3">Scheduled / Published</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {posts.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3 font-medium text-gray-900 dark:text-white max-w-xs truncate">{p.content}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">{p.postType}</span></td>
                  <td className="p-3 font-mono text-[10px]">{JSON.parse(p.platforms || "[]").join(", ")}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_COLORS[p.status] || "bg-gray-100"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3 text-[10px]">
                    {p.publishedAt ? new Date(p.publishedAt).toLocaleString() : p.scheduledAt ? new Date(p.scheduledAt).toLocaleString() : "-"}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      {p.approvalStatus === "PENDING" && (
                        <>
                          <button onClick={() => handleApproval(p.id, "reject")} className="px-2.5 py-1 text-[11px] border border-red-300 text-red-700 rounded hover:bg-red-50">Reject</button>
                          <button onClick={() => handleApproval(p.id, "approve")} className="px-2.5 py-1 text-[11px] bg-emerald-600 text-white rounded hover:bg-emerald-700">Approve</button>
                        </>
                      )}
                      {p.approvalStatus === "APPROVED" && !["PUBLISHED", "PUBLISHING"].includes(p.status) && (
                        <button
                          onClick={() => handlePublishNow(p.id)}
                          disabled={publishing === p.id}
                          className="px-2.5 py-1 text-[11px] bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                          {publishing === p.id ? "Publishing..." : "Publish approved post"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CHANNELS TAB */}
      {tab === "channels" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLATFORMS.map((p) => {
            const connected = channels.find((c) => c.platform === p.id);
            return (
              <div key={p.id} className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p.icon}</span>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">{p.label}</h4>
                    <p className="text-xs text-gray-500">{connected ? connected.accountName : "Not connected"}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-[10px] font-bold rounded ${connected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {connected ? "Active ✅" : "Connect"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* UNIFIED INBOX TAB */}
      {tab === "inbox" && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Unified Engagement Conversations</h3>
          <div className="space-y-2">
            {inboxThreads.map((t) => (
              <div key={t.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-gray-900 dark:text-white">{t.senderName} ({t.platform})</div>
                  <div className="text-xs text-gray-500">{t.lastMessageText || "No messages yet"}</div>
                </div>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SOCIAL LISTENING TAB */}
      {tab === "listening" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">+ Add Brand & Keyword Monitor</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Monitor Name (e.g. Brand Audit)"
                value={monitorName}
                onChange={(e) => setMonitorName(e.target.value)}
                className="p-2 text-xs border rounded bg-gray-50 dark:bg-gray-800"
              />
              <input
                type="text"
                placeholder="Keywords (comma separated)"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                className="p-2 text-xs border rounded bg-gray-50 dark:bg-gray-800"
              />
              <button onClick={handleCreateMonitor} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded">
                Add Monitor
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {monitors.map((m) => (
              <div key={m.id} className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-2">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">{m.name}</h4>
                <div className="text-xs text-gray-500">Keywords: {m.keywords?.join(", ")}</div>
                <div className="flex gap-2 text-[10px]">
                  <span className="text-green-600 font-bold">Positive: {m.sentimentSummary?.positive}</span>
                  <span className="text-red-600 font-bold">Negative: {m.sentimentSummary?.negative}</span>
                  <span className="text-gray-500">Neutral: {m.sentimentSummary?.neutral}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MEDIA LIBRARY TAB */}
      {tab === "media" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {mediaAssets.map((a) => (
            <div key={a.id} className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-800 text-xs">
              <div className="font-bold text-gray-900 dark:text-white truncate">{a.name}</div>
              <div className="text-[10px] text-gray-500">{a.fileType} • {a.category}</div>
            </div>
          ))}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {tab === "analytics" && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border text-center">
            <div className="text-xs text-gray-500">Total Posts</div>
            <div className="text-2xl font-bold text-indigo-600">{analytics.summary?.totalPosts}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border text-center">
            <div className="text-xs text-gray-500">Published</div>
            <div className="text-2xl font-bold text-green-600">{analytics.summary?.publishedPosts}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border text-center">
            <div className="text-xs text-gray-500">Scheduled</div>
            <div className="text-2xl font-bold text-blue-600">{analytics.summary?.scheduledPosts}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border text-center">
            <div className="text-xs text-gray-500">Tracking Period</div>
            <div className="text-2xl font-bold text-gray-800">{analytics.summary?.days} Days</div>
          </div>
        </div>
      )}
    </div>
  );
}
