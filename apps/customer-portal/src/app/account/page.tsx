"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { EmptyState, ErrorState, LoadingState } from "@/components/AsyncState";
import { ShieldCheckIcon, KeyIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../AuthContext";
import { apiRequest } from "@/lib/api";
import { formatDate } from "@/lib/format";

type ConnectedDevice = {
  id: string;
  name: string | null;
  manufacturer: string | null;
  osVersion: string | null;
  ipAddress: string | null;
  lastActive: string | null;
  current: boolean | null;
};

type CustomerProfile = {
  email: string;
  mfaEnabled: boolean | null;
  connectedDevices: ConnectedDevice[];
};

export default function AccountPage() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError("");
    try {
      const nextProfile = await apiRequest<CustomerProfile>("/api/v1/customer/profile", token);
      setProfile({ ...nextProfile, connectedDevices: nextProfile.connectedDevices || [] });
    } catch (error) {
      setProfile(null);
      setLoadError(error instanceof Error ? error.message : "Account security data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const revokeDevice = async (deviceId: string) => {
    if (!token || revokingDeviceId) return;
    setRevokingDeviceId(deviceId);
    setActionError("");
    setNotice("");
    try {
      const response = await apiRequest<{ message?: string }>(`/api/v1/iam/devices/${deviceId}`, token, {
        method: "DELETE",
      });
      setProfile((current) => current
        ? { ...current, connectedDevices: current.connectedDevices.filter((device) => device.id !== deviceId) }
        : current);
      setNotice(response.message || "The registered device was removed.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The registered device could not be removed.");
    } finally {
      setRevokingDeviceId(null);
    }
  };

  const mfaLabel = profile?.mfaEnabled === true
    ? "Enabled"
    : profile?.mfaEnabled === false
      ? "Disabled"
      : "Status unavailable";

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <ShieldCheckIcon className="h-7 w-7 text-indigo-600" /> Security & Account Governance
          </h1>
          <p className="text-sm text-gray-500">Review persisted MFA status and registered devices, or continue to security settings to change your password.</p>
        </div>

        <div aria-live="polite" aria-atomic="true">
          {notice ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</p> : null}
          {actionError ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{actionError}</p> : null}
        </div>

        {loading ? (
          <LoadingState label="Loading security settings..." />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={() => void loadProfile()} />
        ) : profile ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 font-bold text-gray-900">
                <KeyIcon className="h-5 w-5 text-indigo-600" /> Password & Authentication
              </h2>
              <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Two-Factor Authentication (MFA TOTP)</h3>
                  <p className="mt-0.5 text-xs text-gray-500">Status comes from the authenticated user profile.</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${profile.mfaEnabled === true ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}`}>
                  {mfaLabel}
                </span>
              </div>
              <Link
                href="/settings/security"
                className="inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
              >
                Manage Password & Sessions
              </Link>
            </section>

            <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 font-bold text-gray-900">
                <DevicePhoneMobileIcon className="h-5 w-5 text-indigo-600" /> Registered Devices
              </h2>
              {profile.connectedDevices.length ? (
                <div className="space-y-3">
                  {profile.connectedDevices.map((device) => (
                    <article key={device.id} className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 p-3">
                      <div>
                        <h3 className="text-xs font-semibold text-gray-900">{device.name || "Unnamed device"}</h3>
                        <p className="mt-0.5 text-[11px] text-gray-500">Last active: {formatDate(device.lastActive)}</p>
                      </div>
                      {device.current === true ? (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">This device</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void revokeDevice(device.id)}
                          disabled={revokingDeviceId !== null}
                          aria-label={`Remove ${device.name || "registered device"}`}
                          className="text-xs font-semibold text-rose-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {revokingDeviceId === device.id ? "Removing..." : "Remove"}
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="No registered devices" description="No registered device records were returned for this account." />
              )}
            </section>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
