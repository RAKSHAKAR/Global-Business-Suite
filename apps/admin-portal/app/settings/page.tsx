"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";

export default function SettingsPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    null,
  );

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setSettings(typeof d === "object" ? d : {}))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API}/api/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Save failed");
      setMessage({ text: "Settings saved successfully!", ok: true });
    } catch {
      setMessage({
        text: "Failed to save settings. Please try again.",
        ok: false,
      });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const settingGroups = [
    {
      title: "Platform Branding",
      desc: "Customize the name and branding of your platform.",
      keys: ["platformName", "platformTagline", "supportEmail"],
    },
    {
      title: "Email Configuration",
      desc: "SMTP settings for sending transactional emails.",
      keys: ["smtpHost", "smtpPort", "smtpUser"],
    },
    {
      title: "Security & Authentication",
      desc: "Session and authentication configuration.",
      keys: ["sessionSecret", "jwtExpiry", "maxLoginAttempts"],
    },
    {
      title: "Google Business Profile Integration",
      desc: "Credentials for syncing reviews, posts, and locations. Redirect URI should be: http://localhost:4000/api/v1/gbp/callback",
      keys: ["googleClientId", "googleClientSecret", "googleRedirectUri"],
    },
    {
      title: "CAPTCHA Settings",
      desc: "Configure security CAPTCHA length, complexity, and characters.",
      keys: [
        "CAPTCHA_MIN_LENGTH",
        "CAPTCHA_MAX_LENGTH",
        "CAPTCHA_COMPLEXITY",
        "CAPTCHA_ALLOW_UPPERCASE",
        "CAPTCHA_ALLOW_LOWERCASE",
        "CAPTCHA_ALLOW_NUMBERS",
        "CAPTCHA_EXPIRATION_MINUTES",
        "CAPTCHA_MAX_ATTEMPTS",
      ],
    },
  ];

  const fieldLabel = (key: string) =>
    key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());

  const isSecret = (key: string) =>
    ["smtpUser", "sessionSecret", "googleClientSecret"].includes(key);

  return (
    <div className="w-full space-y-6 pt-14 md:pt-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            General Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure platform-wide preferences and integrations.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="shrink-0 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white px-6 py-2.5
                     rounded-xl text-sm font-medium transition-colors"
        >
          {saving ? "Saving…" : "✓ Save Changes"}
        </button>
      </div>

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium
                        ${
                          message.ok
                            ? "bg-green-50 border border-green-200 text-green-700"
                            : "bg-red-50 border border-red-200 text-red-600"
                        }`}
        >
          {message.ok ? "✓ " : "✗ "}
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-40 bg-white rounded-2xl border border-gray-200 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Known settings groups */}
          {settingGroups.map((group) => {
            const groupSettings = group.keys;
            if (groupSettings.length === 0) return null;
            return (
              <section
                key={group.title}
                className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
              >
                <div className="px-5 sm:px-6 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900 text-base">
                    {group.title}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">{group.desc}</p>
                </div>
                <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupSettings.map((key) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                        {fieldLabel(key)}
                      </label>
                      <input
                        type={isSecret(key) ? "password" : "text"}
                        value={settings[key] ?? ""}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, [key]: e.target.value }))
                        }
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm
                                   focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {/* Any additional settings not in groups */}
          {(() => {
            const knownKeys = settingGroups.flatMap((g) => g.keys);
            const extra = Object.keys(settings).filter(
              (k) => !knownKeys.includes(k),
            );
            if (extra.length === 0) return null;
            return (
              <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 sm:px-6 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900 text-base">
                    Other Settings
                  </h2>
                </div>
                <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {extra.map((key) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                        {fieldLabel(key)}
                      </label>
                      <input
                        type="text"
                        value={settings[key] ?? ""}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, [key]: e.target.value }))
                        }
                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm
                                   focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })()}

          {/* Empty state */}
          {Object.keys(settings).length === 0 && (
            <div className="text-center py-16 rounded-2xl border-2 border-dashed border-gray-200 bg-white">
              <p className="text-4xl mb-3">⚙</p>
              <p className="text-gray-500 font-medium">
                No settings found. The API may not support this endpoint yet.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
