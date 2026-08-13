"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { API_BASE } from "@/lib/api";

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

export default function CustomerSecuritySettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const getApiUrl = (path: string) => `${API_BASE}${path}`;

  const fetchSecurityData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("gbs_customer_token");
      const headers = { Authorization: `Bearer ${token}` };

      const [sessRes, devRes] = await Promise.all([
        fetch(getApiUrl("/api/v1/iam/sessions"), { headers }),
        fetch(getApiUrl("/api/v1/iam/devices"), { headers }),
      ]);

      const sessData = await sessRes.json();
      const devData = await devRes.json();

      if (sessData.sessions) setSessions(sessData.sessions);
      if (devData.devices) setDevices(devData.devices);
    } catch {
      console.warn("Failed to fetch security settings data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchSecurityData();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchSecurityData]);

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
      const token = localStorage.getItem("gbs_customer_token");
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
    } catch {
      setError("Network error updating password.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("gbs_customer_token");
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
    } catch {
      setError("Failed to revoke session.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeAllSessions = async () => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("gbs_customer_token");
      await fetch(getApiUrl("/api/v1/iam/sessions/revoke-all"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setMessage("All other sessions revoked.");
      fetchSecurityData();
    } catch {
      setError("Failed to revoke sessions.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardLayout>
    <div className="p-8 max-w-5xl mx-auto space-y-8 bg-slate-900 text-white min-h-screen">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold">Security & Active Device Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your password, MFA preferences, active sessions, and trusted devices
          </p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl transition-all"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {message && (
        <div className="p-4 bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-2xl">
          ✅ {message}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-950 border border-red-800 text-red-300 text-xs font-bold rounded-2xl">
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Change Password Form */}
        <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 space-y-4">
          <h2 className="text-lg font-bold border-b border-slate-700 pb-3">
            Change Password
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters, A-Z, 0-9"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
            >
              {actionLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>

        {/* Active Sessions & Devices */}
        <div className="space-y-6">
          <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h2 className="text-lg font-bold">Active Sessions</h2>
              <button
                onClick={handleRevokeAllSessions}
                className="px-3 py-1.5 bg-red-900/60 hover:bg-red-800 text-red-200 text-xs font-bold rounded-xl transition-all"
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
                    className="p-3 bg-slate-900 rounded-xl border border-slate-700 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-200 truncate max-w-xs">
                        {s.userAgent}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        IP: {s.ipAddress || "127.0.0.1"} • Last active:{" "}
                        {new Date(s.lastActivityAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevokeSession(s.id)}
                      className="px-2.5 py-1 text-[10px] font-bold text-red-400 border border-red-800 hover:bg-red-950 rounded-lg"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 space-y-4">
            <h2 className="text-lg font-bold border-b border-slate-700 pb-3">
              Registered Devices
            </h2>

            {devices.length === 0 ? (
              <p className="text-xs text-slate-400">No registered devices found.</p>
            ) : (
              <div className="space-y-3">
                {devices.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 bg-slate-900 rounded-xl border border-slate-700 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-200">
                        📱 {d.deviceName || "Device"} ({d.osVersion})
                      </p>
                      <p className="text-[10px] text-slate-400">
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
    </DashboardLayout>
  );
}
