"use client";

import React, { useState, useEffect } from "react";

interface SecuritySetting {
  key: string;
  value: string;
  description?: string;
}

export default function SecuritySettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({
    CAPTCHA_ENABLED: "true",
    CAPTCHA_MIN_LENGTH: "6",
    CAPTCHA_MAX_LENGTH: "6",
    CAPTCHA_ALLOW_UPPERCASE: "true",
    CAPTCHA_ALLOW_LOWERCASE: "true",
    CAPTCHA_ALLOW_NUMBERS: "true",
    CAPTCHA_DISTORTION_LEVEL: "medium",
    CAPTCHA_NOISE_LEVEL: "2",
    CAPTCHA_EXPIRATION_MINUTES: "5",
    CAPTCHA_MAX_ATTEMPTS: "5",
    CAPTCHA_LOCKOUT_MINUTES: "15",
    CAPTCHA_AUDIO_ENABLED: "true",
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Save settings back to API (PlatformSetting)
      const token = localStorage.getItem("saas_admin_token");
      await fetch("http://localhost:4000/api/v1/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings }),
      });
      setSaved(true);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Platform Security & CAPTCHA Policy
            </h1>
            <p className="text-sm text-gray-400">
              Configure dynamic bot protection, image distortion, accessibility
              audio, and session lockout limits platform-wide.
            </p>
          </div>
        </div>

        {saved && (
          <div className="p-4 bg-green-900/30 border border-green-500 text-green-300 rounded-lg text-sm font-semibold flex items-center gap-2">
            ✅ Security & CAPTCHA settings updated successfully!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* General Enable Switch */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#D4AF37]">
              Global Enforcement Policy
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-white">
                  Enable CAPTCHA Protection
                </span>
                <p className="text-xs text-gray-400">
                  Mandatory image & audio CAPTCHA for all portals & mobile apps.
                </p>
              </div>
              <select
                value={settings.CAPTCHA_ENABLED}
                onChange={(e) =>
                  handleChange("CAPTCHA_ENABLED", e.target.value)
                }
                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm font-semibold"
              >
                <option value="true">Enabled (Active)</option>
                <option value="false">Disabled (Bypass)</option>
              </select>
            </div>
          </div>

          {/* Complexity & Distortion Controls */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#D4AF37]">
              Image Rendering & Complexity
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                  Distortion Complexity
                </label>
                <select
                  value={settings.CAPTCHA_DISTORTION_LEVEL}
                  onChange={(e) =>
                    handleChange("CAPTCHA_DISTORTION_LEVEL", e.target.value)
                  }
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                >
                  <option value="low">Low (Clean Text)</option>
                  <option value="medium">Medium (Standard Wave)</option>
                  <option value="high">High (Maximum Wave & Blur)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                  Noise Dot & Line Density
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={settings.CAPTCHA_NOISE_LEVEL}
                  onChange={(e) =>
                    handleChange("CAPTCHA_NOISE_LEVEL", e.target.value)
                  }
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                  Min Character Length
                </label>
                <input
                  type="number"
                  min="4"
                  max="10"
                  value={settings.CAPTCHA_MIN_LENGTH}
                  onChange={(e) =>
                    handleChange("CAPTCHA_MIN_LENGTH", e.target.value)
                  }
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                  Max Character Length
                </label>
                <input
                  type="number"
                  min="4"
                  max="10"
                  value={settings.CAPTCHA_MAX_LENGTH}
                  onChange={(e) =>
                    handleChange("CAPTCHA_MAX_LENGTH", e.target.value)
                  }
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Session Lockout & Accessibility */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#D4AF37]">
              Lockout & Accessibility
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                  Max Failed Attempts
                </label>
                <input
                  type="number"
                  value={settings.CAPTCHA_MAX_ATTEMPTS}
                  onChange={(e) =>
                    handleChange("CAPTCHA_MAX_ATTEMPTS", e.target.value)
                  }
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                  Lockout Duration (Minutes)
                </label>
                <input
                  type="number"
                  value={settings.CAPTCHA_LOCKOUT_MINUTES}
                  onChange={(e) =>
                    handleChange("CAPTCHA_LOCKOUT_MINUTES", e.target.value)
                  }
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                  Audio Accessibility Fallback
                </label>
                <select
                  value={settings.CAPTCHA_AUDIO_ENABLED}
                  onChange={(e) =>
                    handleChange("CAPTCHA_AUDIO_ENABLED", e.target.value)
                  }
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                >
                  <option value="true">Enabled (WAV Sound Stream)</option>
                  <option value="false">Disabled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                  Session Expiration (Minutes)
                </label>
                <input
                  type="number"
                  value={settings.CAPTCHA_EXPIRATION_MINUTES}
                  onChange={(e) =>
                    handleChange("CAPTCHA_EXPIRATION_MINUTES", e.target.value)
                  }
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#D4AF37] hover:bg-[#b5942f] text-gray-950 font-bold px-6 py-2.5 rounded-lg shadow-md transition-colors"
            >
              {loading ? "Saving Changes..." : "Save Security Policy"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
