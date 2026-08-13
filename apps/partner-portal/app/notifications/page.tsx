"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://127.0.0.1:4000";

export default function NotificationsPage() {
  const { token } = useAuth();
  const [prefs, setPrefs] = useState<any>({
    email: true,
    sms: false,
    whatsapp: true,
    push: true,
    inApp: true,
  });

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/v1/partner/notifications/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.preferences) setPrefs(data.preferences);
      })
      .catch(console.error);
  }, [token]);

  const handleSave = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/v1/partner/notifications/preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        alert("Notification preferences saved successfully!");
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
            🔔 Notification Center & Preferences
          </h1>
          <p className="text-xs text-gray-400">Configure delivery channels across Email, SMS, WhatsApp, Push, and In-App alerts.</p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] space-y-4 max-w-2xl">
        <h2 className="text-base font-bold text-[#D4AF37]">Channel Delivery Preferences</h2>
        
        {Object.entries(prefs).map(([key, val]) => (
          <div key={key} className="flex justify-between items-center p-3 rounded-xl bg-[#242424] border border-[#333]">
            <span className="text-sm font-semibold capitalize text-white">{key.replace(/([A-Z])/g, ' $1')}</span>
            <input
              type="checkbox"
              checked={Boolean(val)}
              onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
              className="w-5 h-5 accent-[#D4AF37] cursor-pointer"
            />
          </div>
        ))}

        <button
          onClick={handleSave}
          className="bg-[#D4AF37] hover:bg-[#b8972e] text-black font-bold px-5 py-2.5 rounded-xl text-xs transition-all"
        >
          Save Preferences
        </button>
      </div>
    </div>
  );
}
