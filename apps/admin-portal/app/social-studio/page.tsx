"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";

const PLATFORMS = [
  { id: "FACEBOOK", label: "Facebook Page", color: "bg-blue-600" },
  { id: "INSTAGRAM", label: "Instagram Business", color: "bg-pink-600" },
  { id: "LINKEDIN", label: "LinkedIn Company", color: "bg-sky-700" },
  { id: "TWITTER_X", label: "X / Twitter", color: "bg-gray-900" },
  { id: "THREADS", label: "Threads", color: "bg-black" },
  { id: "YOUTUBE", label: "YouTube Shorts", color: "bg-red-600" },
  { id: "TIKTOK", label: "TikTok Business", color: "bg-slate-950" },
  { id: "PINTEREST", label: "Pinterest", color: "bg-red-700" },
];

export default function SocialStudioPage() {
  const { token } = useAuth();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["FACEBOOK", "INSTAGRAM"]);
  const [content, setContent] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/v1/social/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [token]);

  const togglePlatform = (id: string) => {
    if (selectedPlatforms.includes(id)) {
      setSelectedPlatforms(selectedPlatforms.filter((p) => p !== id));
    } else {
      setSelectedPlatforms([...selectedPlatforms, id]);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content || selectedPlatforms.length === 0) return;
    try {
      const res = await fetch(`${API}/api/v1/social/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          content,
          platforms: selectedPlatforms,
          scheduledAt: scheduledAt || null,
        }),
      });
      if (res.ok) {
        alert("Social media post created successfully!");
        setContent("");
        fetchPosts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full space-y-6 pt-14 md:pt-0 pb-12">
      <div className="bg-gray-950 p-6 rounded-3xl text-white shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-black text-white">Social Media Control Manager</h1>
        <p className="mt-1 text-sm text-gray-400">
          Multi-platform post scheduling, AI caption generation, approval queues, and engagement metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Post Creation Form */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Multi-Channel Post Composer</h2>
          <form onSubmit={handleCreatePost} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Select Target Channels</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => {
                  const active = selectedPlatforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlatform(p.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all ${p.color} ${
                        active ? "ring-4 ring-offset-1 ring-[#D4AF37]" : "opacity-40 hover:opacity-80"
                      }`}
                    >
                      {active ? "✓ " : ""}{p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700">Post Content / Caption</label>
              <textarea
                rows={5}
                placeholder="Compose post content or generate caption using AI studio..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full border rounded-xl p-3 text-sm mt-1"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700">Schedule Date & Time (Optional)</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="border rounded-xl p-2.5 text-sm mt-1 text-gray-800"
              />
            </div>

            <button
              type="submit"
              className="bg-gray-950 text-[#D4AF37] font-bold px-6 py-3 rounded-xl text-sm hover:bg-gray-900 transition-all"
            >
              {scheduledAt ? "Schedule Post" : "Publish Now Across Channels"}
            </button>
          </form>
        </div>

        {/* Scheduled Posts Feed */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Post Queue ({posts.length})</h2>
          {loading ? (
            <div className="py-6 text-center text-gray-400">Loading social posts...</div>
          ) : posts.length === 0 ? (
            <div className="py-6 text-center text-gray-500">No active posts in queue.</div>
          ) : (
            <div className="space-y-3">
              {posts.slice(0, 6).map((post) => (
                <div key={post.id} className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50 space-y-1 text-xs">
                  <div className="flex justify-between items-center font-bold text-gray-900">
                    <span>{post.status}</span>
                    <span className="text-gray-400">{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-gray-700 line-clamp-2">{post.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
