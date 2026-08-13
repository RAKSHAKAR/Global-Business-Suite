"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";

export default function MarketingCenterPage() {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Campaign Form
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("EMAIL");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  const fetchCampaigns = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/v1/crm/marketing/campaigns`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [token]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !content) return;
    try {
      const res = await fetch(`${API}/api/v1/crm/marketing/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, channel, subject, content }),
      });
      if (res.ok) {
        alert("Marketing campaign created!");
        setName("");
        setSubject("");
        setContent("");
        fetchCampaigns();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDispatch = async (id: string, campName: string) => {
    if (!confirm(`Dispatch campaign "${campName}" to all target audience channels now?`)) return;
    try {
      const res = await fetch(`${API}/api/v1/crm/marketing/campaigns/${id}/dispatch`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        alert("Campaign dispatched successfully!");
        fetchCampaigns();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full space-y-6 pt-14 md:pt-0 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-950 p-6 rounded-3xl text-white shadow-xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Omnichannel Marketing Center</h1>
          <p className="mt-1 text-sm text-gray-400">
            Email, SMS, WhatsApp, and Push campaign automation with audience segmentation and ROI tracking.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign List */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Active Campaigns ({campaigns.length})</h2>

          {loading ? (
            <div className="py-8 text-center text-gray-400">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="py-8 text-center text-gray-400">No campaigns created yet. Use the form to launch one.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map((c) => {
                const metrics = c.metricsJson ? JSON.parse(c.metricsJson) : {};
                return (
                  <div key={c.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-sm text-gray-900">{c.name}</p>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                          {c.channel}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {c.status}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2">{c.content}</p>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center text-[11px]">
                      <div>
                        <p className="text-gray-400">Sent</p>
                        <p className="font-bold text-gray-800">{metrics.sent || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Opens</p>
                        <p className="font-bold text-gray-800">{metrics.opened || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">ROI Est.</p>
                        <p className="font-bold text-emerald-600">${metrics.roi || 0}</p>
                      </div>
                    </div>

                    {c.status !== "COMPLETED" && (
                      <button
                        onClick={() => handleDispatch(c.id, c.name)}
                        className="w-full bg-[#D4AF37] text-gray-950 font-bold py-2 rounded-xl text-xs hover:bg-amber-400"
                      >
                        Dispatch Campaign
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Campaign Form */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Create Campaign</h2>
          <form onSubmit={handleCreateCampaign} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Campaign Name</label>
              <input
                type="text"
                placeholder="Q3 Product Promo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Target Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1"
              >
                <option value="EMAIL">Email Campaign</option>
                <option value="SMS">SMS Campaign</option>
                <option value="WHATSAPP">WhatsApp Campaign</option>
                <option value="PUSH">Push Notification</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Email / Message Subject</label>
              <input
                type="text"
                placeholder="Exclusive 20% discount on Enterprise plan"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Content / Body</label>
              <textarea
                placeholder="Enter campaign message body..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="w-full border rounded-xl p-2.5 text-sm mt-1"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gray-950 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-gray-800"
            >
              Save Campaign Draft
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
