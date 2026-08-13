"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";

type FeatureFlag = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  targetRules: any;
  updatedAt: string;
};

export default function FeatureFlagsPage() {
  const { token } = useAuth();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFlags = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/v1/feature-flags`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFlags(data.flags || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, [token]);

  const toggleFlag = async (flag: FeatureFlag) => {
    try {
      const res = await fetch(`${API}/api/v1/feature-flags`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          key: flag.key,
          name: flag.name,
          description: flag.description,
          isEnabled: !flag.isEnabled,
          targetRules: flag.targetRules,
        }),
      });
      if (!res.ok) throw new Error("Failed to toggle flag");
      fetchFlags();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="w-full space-y-6 pt-14 md:pt-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Feature Flags & Capability Targeting
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Dynamically toggle platform capabilities across subscription plans, tenants, and roles
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-2xl border border-gray-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {flags.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-200">
              No feature flags configured.
            </div>
          ) : (
            flags.map((flag) => (
              <div key={flag.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-lg">{flag.name}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 border text-gray-600">
                      {flag.key}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{flag.description || "System feature capability flag"}</p>
                </div>
                <button
                  onClick={() => toggleFlag(flag)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                    flag.isEnabled
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  }`}
                >
                  {flag.isEnabled ? "ENABLED" : "DISABLED"}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
