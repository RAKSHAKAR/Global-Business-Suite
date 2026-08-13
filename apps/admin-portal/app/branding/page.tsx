"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";

type BrandingConfig = {
  appTitle: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  themeMode: string;
  customCss: string;
};

export default function BrandingPage() {
  const { token } = useAuth();
  const [config, setConfig] = useState<BrandingConfig>({
    appTitle: "Global Business Suite",
    logoUrl: "",
    faviconUrl: "",
    primaryColor: "#D4AF37",
    secondaryColor: "#1A1A1A",
    themeMode: "DARK",
    customCss: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchBranding = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/v1/admin/white-label`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.config) setConfig(data.config);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch(`${API}/api/v1/admin/white-label`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update branding");
      setMessage("White-Label branding updated successfully!");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6 pt-14 md:pt-0 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          White-Label & Custom Branding
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Customize logos, color palettes, themes, and platform identity for web and mobile apps
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 font-medium">
          ⚠️ {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 font-semibold">
          ✅ {message}
        </div>
      )}

      {loading ? (
        <div className="h-64 bg-white rounded-2xl border border-gray-200 animate-pulse" />
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                Application Title
              </label>
              <input
                required
                value={config.appTitle}
                onChange={(e) => setConfig({ ...config, appTitle: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                Theme Mode
              </label>
              <select
                value={config.themeMode}
                onChange={(e) => setConfig({ ...config, themeMode: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              >
                <option value="DARK">Dark Theme (Default)</option>
                <option value="LIGHT">Light Theme</option>
                <option value="SYSTEM">System Preference</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                Primary Brand Color (HEX / HSL)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.primaryColor || "#D4AF37"}
                  onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border"
                />
                <input
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                Secondary Brand Color (HEX / HSL)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.secondaryColor || "#1A1A1A"}
                  onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border"
                />
                <input
                  value={config.secondaryColor}
                  onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                Logo Image URL
              </label>
              <input
                value={config.logoUrl || ""}
                onChange={(e) => setConfig({ ...config, logoUrl: e.target.value })}
                placeholder="https://domain.com/logo.png"
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                Favicon Image URL
              </label>
              <input
                value={config.faviconUrl || ""}
                onChange={(e) => setConfig({ ...config, faviconUrl: e.target.value })}
                placeholder="https://domain.com/favicon.ico"
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
              Custom CSS Overrides (Optional)
            </label>
            <textarea
              rows={4}
              value={config.customCss || ""}
              onChange={(e) => setConfig({ ...config, customCss: e.target.value })}
              placeholder="/* Add custom stylesheet overrides here */"
              className="w-full px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#D4AF37] resize-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
            >
              {saving ? "Saving Branding..." : "Save Branding Configuration"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
