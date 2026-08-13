"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://127.0.0.1:4000";

export default function MarketingPage() {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [type, setType] = useState("EMAIL");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/v1/partner/marketing/campaigns`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setCampaigns(data.campaigns || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const handleCreate = async () => {
    if (!name || !content || !token) return;
    try {
      const res = await fetch(`${API}/api/v1/partner/marketing/campaigns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, type, content }),
      });
      if (res.ok) {
        const created = await res.json();
        setCampaigns([created, ...campaigns]);
        setName("");
        setContent("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full space-y-6 p-6 bg-[#121212] min-h-screen text-white">
      <div className="flex justify-between items-center border-b border-[#2A2A2A] pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            ⚡ Omnichannel Marketing Campaigns & Automation
          </h1>
          <p className="text-xs text-gray-400">Email, SMS, WhatsApp, Push Notification campaign builder & audience segmentation.</p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] space-y-4">
        <h2 className="text-base font-bold text-[#D4AF37]">Create New Campaign</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Campaign Name (e.g. Summer VIP Offer)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-[#242424] border border-[#333] p-3 rounded-xl text-xs text-white focus:outline-none"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="bg-[#242424] border border-[#333] p-3 rounded-xl text-xs text-white focus:outline-none"
          >
            <option value="EMAIL">Email Marketing</option>
            <option value="SMS">SMS Broadcast</option>
            <option value="WHATSAPP">WhatsApp Direct Message</option>
            <option value="PUSH">Mobile Push Notification</option>
            <option value="OMNICHANNEL">Omnichannel Multi-Broadcast</option>
          </select>
        </div>
        <textarea
          rows={3}
          placeholder="Campaign message body content..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full bg-[#242424] border border-[#333] p-3 rounded-xl text-xs text-white focus:outline-none"
        ></textarea>
        <button
          onClick={handleCreate}
          className="bg-[#D4AF37] hover:bg-[#b8972e] text-black font-bold px-5 py-2.5 rounded-xl text-xs transition-all"
        >
          🚀 Launch / Schedule Campaign
        </button>
      </div>

      <div className="p-6 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] shadow-md">
        <h2 className="text-base font-bold text-[#D4AF37] mb-4">Active & Scheduled Campaigns ({campaigns.length})</h2>
        {loading ? (
          <p className="text-xs text-gray-400">Loading campaigns...</p>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => (
              <div key={c.id} className="p-4 rounded-xl bg-[#242424] border border-[#333] flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold">{c.name}</p>
                  <p className="text-xs text-gray-400">Channel: {c.type} • Segment: {c.audienceSegment || "ALL"}</p>
                  <p className="text-xs text-gray-300 mt-1 line-clamp-1">{c.content}</p>
                </div>
                <span className="px-3 py-1 text-[10px] font-bold rounded-md bg-green-500/20 text-green-400">
                  {c.status || "ACTIVE"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
