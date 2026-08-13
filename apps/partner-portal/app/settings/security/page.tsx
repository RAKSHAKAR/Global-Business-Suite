"use client";

import React, { useState, useEffect } from "react";

interface SessionItem {
  id: string;
  ipAddress: string;
  userAgent: string;
  lastActivityAt: string;
}

interface DeviceItem {
  id: string;
  deviceName: string;
  osVersion: string;
  ipAddress: string;
  lastLogin: string;
}

export default function PartnerSecuritySettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const getApiUrl = (path: string) => `http://localhost:4000${path}`;

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("saas_partner_token");
      const headers = { Authorization: `Bearer ${token}` };

      const [sessRes, devRes] = await Promise.all([
        fetch(getApiUrl("/api/v1/iam/sessions"), { headers }),
        fetch(getApiUrl("/api/v1/iam/devices"), { headers }),
      ]);

      const sessData = await sessRes.json();
      const devData = await devRes.json();

      if (sessData.sessions) setSessions(sessData.sessions);
      if (devData.devices) setDevices(devData.devices);
    } catch (err) {
      console.warn("Failed to fetch security settings data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setActionLoading(true);

    try {
      const token = localStorage.getItem("saas_partner_token");
      const res = await fetch(getApiUrl("/api/v1/iam/change-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(data.error || "Failed to update password.");
      }
    } catch (err) {
      setError("Network error updating password.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("saas_partner_token");
      await fetch(getApiUrl("/api/v1/iam/sessions/revoke"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
      });
      setMessage("Session revoked successfully.");
      fetchSecurityData();
    } catch (err) {
      setError("Failed to revoke session.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeAllSessions = async () => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("saas_partner_token");
      await fetch(getApiUrl("/api/v1/iam/sessions/revoke-all"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setMessage("All other sessions revoked.");
      fetchSecurityData();
    } catch (err) {
      setError("Failed to revoke sessions.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 bg-[#FDFBF7] min-h-screen">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900">
            Security & Device Governance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your partner credentials, MFA, active sessions, and devices
          </p>
        </div>
        <a
          href="/"
          className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl transition-all hover:bg-black"
        >
          ← Back to Dashboard
        </a>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl">
          ✅ {message}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl">
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Change Password Form */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 border-b pb-3">
            Change Partner Password
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters, A-Z, 0-9"
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-3 bg-[#1C1917] hover:bg-[#292524] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
            >
              {actionLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>

        {/* Active Sessions & Devices */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">Active Sessions</h2>
              <button
                onClick={handleRevokeAllSessions}
                className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-xl transition-all hover:bg-red-100"
              >
                Revoke All Other Sessions
              </button>
            </div>

            {loading ? (
              <p className="text-xs text-slate-400">Loading active sessions...</p>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-slate-400">No other active sessions found.</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800 truncate max-w-xs">
                        {s.userAgent}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        IP: {s.ipAddress || "127.0.0.1"} • Last active:{" "}
                        {new Date(s.lastActivityAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevokeSession(s.id)}
                      className="px-2.5 py-1 text-[10px] font-bold text-red-600 border border-red-200 hover:bg-red-50 rounded-lg"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b pb-3">
              Registered Devices
            </h2>

            {devices.length === 0 ? (
              <p className="text-xs text-slate-400">No registered devices found.</p>
            ) : (
              <div className="space-y-3">
                {devices.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        📱 {d.deviceName || "Device"} ({d.osVersion})
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Last login: {new Date(d.lastLogin).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
