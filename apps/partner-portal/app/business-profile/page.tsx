"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://127.0.0.1:4000";

export default function BusinessProfilePage() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/v1/partner/business-profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setProfile(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="w-full space-y-6 p-6 bg-[#121212] min-h-screen text-white">
      <div className="flex justify-between items-center border-b border-[#2A2A2A] pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            🏢 Business Profile & Multi-Branch
          </h1>
          <p className="text-xs text-gray-400">Manage company details, branches, operating hours, and documents.</p>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] space-y-4">
            <h2 className="text-base font-bold text-[#D4AF37]">Company Details</h2>
            <div>
              <label className="text-xs text-gray-400">Tenant Name</label>
              <p className="text-lg font-bold">{profile?.tenant?.name || "Partner Agency"}</p>
            </div>
            <div>
              <label className="text-xs text-gray-400">Domain</label>
              <p className="text-sm">{profile?.tenant?.domain || "agency.gbs.com"}</p>
            </div>
            <div>
              <label className="text-xs text-gray-400">Primary Color</label>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-6 h-6 rounded-full bg-[#D4AF37] border border-[#444]"></span>
                <span className="text-xs font-mono">#D4AF37</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] space-y-4">
            <h2 className="text-base font-bold text-[#D4AF37]">Working Hours</h2>
            <div className="space-y-1 text-xs">
              {Object.entries(profile?.workingHours || {}).map(([day, hrs]) => (
                <div key={day} className="flex justify-between py-1 border-b border-[#2A2A2A]">
                  <span className="capitalize text-gray-400">{day}</span>
                  <span className="font-semibold">{hrs as string}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] space-y-4">
            <h2 className="text-base font-bold text-[#D4AF37]">Branches ({profile?.branches?.length || 1})</h2>
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-[#242424] border border-[#333]">
                <p className="text-sm font-bold">Headquarters Branch</p>
                <p className="text-xs text-gray-400">Code: HQ-01 • Greater Metro Region</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
