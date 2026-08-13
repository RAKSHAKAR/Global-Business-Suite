"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";

export default function GbpStudioPage() {
  const { token } = useAuth();
  const [locations, setLocations] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>("");

  // Admin Config State
  const [syncInterval, setSyncInterval] = useState(30);
  const [requirePostApproval, setRequirePostApproval] = useState(false);
  const [autoReplyMinStars, setAutoReplyMinStars] = useState(4);

  // Post Gen
  const [summary, setSummary] = useState("");
  const [topicType, setTopicType] = useState("STANDARD");

  const fetchData = async () => {
    if (!token) return;
    try {
      const [lRes, aRes, rRes] = await Promise.all([
        fetch(`${API}/api/v1/gbp/locations`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/v1/gbp/accounts`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/v1/gbp/locations/${selectedLocation || "all"}/reviews`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (lRes.ok) {
        const lData = await lRes.json();
        setLocations(lData.data || lData.locations || []);
        if (lData.data?.[0]) setSelectedLocation(lData.data[0].id);
      }
      if (aRes.ok) {
        const aData = await aRes.json();
        setAccounts(aData.data || []);
      }
      if (rRes.ok) {
        const rData = await rRes.json();
        setReviews(rData.data || rData.reviews || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleCreateGbpPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation || !summary) return;
    try {
      const res = await fetch(`${API}/api/v1/gbp/locations/${selectedLocation}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ summary, topicType }),
      });
      if (res.ok) {
        alert("Google Business Post published!");
        setSummary("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const reconnectAccount = async (accId: string) => {
    try {
      const res = await fetch(`${API}/api/v1/gbp/accounts/${accId}/reconnect`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        alert("Account reconnected and OAuth tokens refreshed!");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full space-y-6 pt-14 md:pt-0 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-950 p-6 rounded-3xl text-white shadow-xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Google Business Profile Studio</h1>
          <p className="mt-1 text-sm text-gray-400">
            Enterprise administration for Google OAuth Accounts, Multi-Location Controls, Quotas & Post Automation.
          </p>
        </div>
      </div>

      {/* Admin Settings Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm space-y-2">
          <div className="font-bold text-gray-900 text-sm">🔄 Auto Sync Frequency</div>
          <select
            value={syncInterval}
            onChange={(e) => setSyncInterval(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none"
          >
            <option value={15}>Every 15 Minutes</option>
            <option value={30}>Every 30 Minutes (Recommended)</option>
            <option value={60}>Every 1 Hour</option>
          </select>
        </div>
        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm space-y-2">
          <div className="font-bold text-gray-900 text-sm">🛡️ Post Approval Rule</div>
          <select
            value={requirePostApproval ? "YES" : "NO"}
            onChange={(e) => setRequirePostApproval(e.target.value === "YES")}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none"
          >
            <option value="NO">Auto-Publish Immediately</option>
            <option value="YES">Require Admin Approval</option>
          </select>
        </div>
        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm space-y-2">
          <div className="font-bold text-gray-900 text-sm">✨ Auto AI Reply Threshold</div>
          <select
            value={autoReplyMinStars}
            onChange={(e) => setAutoReplyMinStars(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none"
          >
            <option value={5}>5-Star Reviews Only</option>
            <option value={4}>4-Star & 5-Star Reviews</option>
            <option value={3}>3-Star and above</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account Health & Locations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Account Health */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center justify-between">
              <span>Google Accounts ({accounts.length})</span>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-semibold">Token Monitoring Active</span>
            </h2>
            <div className="divide-y divide-gray-100">
              {accounts.map((acc) => (
                <div key={acc.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-gray-900">{acc.accountName}</div>
                    <div className="text-xs text-gray-400">{acc.email} · {acc.permissionLevel}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${acc.accountHealth === "HEALTHY" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      ● {acc.accountHealth}
                    </span>
                    <button
                      onClick={() => reconnectAccount(acc.id)}
                      className="text-xs border border-gray-200 hover:bg-gray-100 px-3 py-1.5 rounded-lg text-gray-700 font-medium"
                    >
                      Reconnect
                    </button>
                  </div>
                </div>
              ))}
              {accounts.length === 0 && (
                <div className="py-4 text-center text-xs text-gray-400">All tenant Google Accounts connected cleanly.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Connected Locations ({locations.length})</h2>
            {loading ? (
              <div className="py-6 text-center text-gray-400">Loading GBP locations...</div>
            ) : locations.length === 0 ? (
              <div className="py-6 text-center text-gray-500">No GBP locations connected yet. Connect Google OAuth in Social Channels.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {locations.map((loc) => (
                  <div
                    key={loc.id}
                    onClick={() => setSelectedLocation(loc.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      selectedLocation === loc.id ? "border-[#D4AF37] bg-amber-50/50 ring-2 ring-[#D4AF37]" : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <h3 className="font-bold text-gray-900 text-sm">{loc.title || loc.locationName || "Google Location"}</h3>
                    <p className="text-xs text-gray-500 mt-1">{loc.address || "Main Branch"}</p>
                    <div className="flex justify-between items-center mt-3 text-xs">
                      <span className="text-green-600 font-semibold">● Synced</span>
                      <span className="text-gray-400">{loc._count?.reviews || 0} reviews</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI Post Publisher */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">GBP Post Creator</h2>
          <form onSubmit={handleCreateGbpPost} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Topic Type</label>
              <select
                value={topicType}
                onChange={(e) => setTopicType(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1"
              >
                <option value="STANDARD">STANDARD (What’s New)</option>
                <option value="OFFER">OFFER (Special Discount)</option>
                <option value="EVENT">EVENT (Upcoming Launch)</option>
                <option value="ALERT">ALERT (COVID / Hours Update)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Post Summary</label>
              <textarea
                rows={4}
                placeholder="Write update or generate with AI..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full border rounded-xl p-3 text-sm mt-1"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#D4AF37] text-gray-950 font-bold py-2.5 rounded-xl text-sm hover:bg-amber-400"
            >
              Publish to Google Maps
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
