"use client";

import React, { useState } from "react";

export default function InboxProvidersPage() {
  const [providers, setProviders] = useState([
    { key: "GBP", name: "Google Business Profile", enabled: true, status: "Connected" },
    { key: "GOOGLE_REVIEWS", name: "Google Reviews", enabled: true, status: "Connected" },
    { key: "FACEBOOK", name: "Facebook Messenger", enabled: true, status: "Connected" },
    { key: "INSTAGRAM", name: "Instagram DMs", enabled: true, status: "Connected" },
    { key: "WHATSAPP", name: "WhatsApp Business API", enabled: true, status: "Connected" },
    { key: "EMAIL", name: "Email (SMTP/IMAP)", enabled: true, status: "Connected" },
    { key: "SMS", name: "Twilio SMS", enabled: true, status: "Connected" },
    { key: "LIVE_CHAT", name: "Website Live Chat Widget", enabled: true, status: "Connected" },
    { key: "TELEGRAM", name: "Telegram Bot API", enabled: true, status: "Connected" },
    { key: "TEAMS", name: "Microsoft Teams Bot", enabled: true, status: "Connected" },
  ]);

  const toggleProvider = (key: string) => {
    setProviders(prev => prev.map(p => p.key === key ? { ...p, enabled: !p.enabled } : p));
  };

  return (
    <>
      <div style={{ padding: "24px", color: "#F5F5F5", fontFamily: "Inter, sans-serif" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "8px" }}>Inbox Integration Providers</h1>
        <p style={{ color: "#A0A0A0", marginBottom: "24px" }}>
          Manage global configurations for 10 unified communication channels across all tenants.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {providers.map(prov => (
            <div key={prov.key} style={{
              background: "#1E1E1E",
              border: "1px solid #333",
              borderRadius: "8px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#FFF" }}>{prov.name}</h3>
                  <span style={{
                    fontSize: "12px",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    background: prov.enabled ? "rgba(46, 204, 113, 0.2)" : "rgba(231, 76, 60, 0.2)",
                    color: prov.enabled ? "#2ECC71" : "#E74C3C",
                    fontWeight: "bold",
                  }}>
                    {prov.enabled ? "Active" : "Disabled"}
                  </span>
                </div>
                <p style={{ fontSize: "13px", color: "#888", marginBottom: "16px" }}>
                  Official API integration endpoint for real-time message sync, webhook handlers, and AI routing.
                </p>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <button
                  onClick={() => toggleProvider(prov.key)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: prov.enabled ? "#E74C3C" : "#2ECC71",
                    color: "#FFF",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  {prov.enabled ? "Disable Provider" : "Enable Provider"}
                </button>
                <button style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #444",
                  background: "transparent",
                  color: "#D4AF37",
                  cursor: "pointer",
                  fontWeight: "600",
                }}>
                  Settings
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
