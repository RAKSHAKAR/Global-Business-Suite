"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://127.0.0.1:4000";

export default function SettingsPage() {
  const { token, user } = useAuth();
  const [subData, setSubData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/v1/partner/subscription`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setSubData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="w-full space-y-6 p-6 bg-[#121212] min-h-screen text-white">
      <div className="flex justify-between items-center border-b border-[#2A2A2A] pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            ⚙️ Partner Settings & Subscription Governance
          </h1>
          <p className="text-xs text-gray-400">Account profile, white-label branding, security MFA, API keys, and subscription plan billing.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile & Security Settings */}
        <div className="p-6 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] space-y-4">
          <h2 className="text-base font-bold text-[#D4AF37]">Profile & Account Security</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400">Email Address</label>
              <input
                type="text"
                disabled
                value={user?.email || "partner@tenant.com"}
                className="w-full bg-[#242424] border border-[#333] p-2.5 rounded-xl text-xs text-gray-400 mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Tenant / Business Name</label>
              <input
                type="text"
                disabled
                value={user?.tenantName || "Partner Agency"}
                className="w-full bg-[#242424] border border-[#333] p-2.5 rounded-xl text-xs text-gray-400 mt-1"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#242424] border border-[#333]">
              <div>
                <p className="text-xs font-bold text-white">Multi-Factor Authentication (TOTP MFA)</p>
                <p className="text-[10px] text-gray-400">Requires authenticator app for login</p>
              </div>
              <button
                onClick={() => setMfaEnabled(!mfaEnabled)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors
                            ${mfaEnabled ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-300"}`}
              >
                {mfaEnabled ? "ENABLED" : "ENABLE MFA"}
              </button>
            </div>
          </div>
        </div>

        {/* Subscription Plan & Billing */}
        <div className="p-6 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] space-y-4">
          <h2 className="text-base font-bold text-[#D4AF37]">Subscription Plan & Invoices</h2>
          {loading ? (
            <p className="text-xs text-gray-400">Loading subscription details...</p>
          ) : (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[#242424] border border-[#3A3A3A] space-y-2">
                <span className="text-[10px] font-bold uppercase text-[#D4AF37]">Active Subscription Plan</span>
                <p className="text-lg font-extrabold text-white">
                  {subData?.currentSubscription?.plan?.name || "Partner Enterprise Pro"}
                </p>
                <p className="text-xs text-gray-400">
                  ${subData?.currentSubscription?.plan?.price || 299} / {subData?.currentSubscription?.plan?.interval || "MONTHLY"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-gray-400">Recent Billing Invoices</span>
                <div className="p-3 rounded-xl bg-[#242424] border border-[#333] flex justify-between items-center text-xs">
                  <span>Invoice #INV-2026-001 ($299.00)</span>
                  <span className="text-green-400 font-bold">PAID</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
